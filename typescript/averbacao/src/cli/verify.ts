import { OfertasResponseSchema, type OfertasRequestDto } from "../core/dto/index.js";
import { signAtlasRequest, verifyOferta } from "../core/crypto.js";

/**
 * Bateria de conformidade `atlas-sdk verify` — docs/07-sdk-bancos.md §2 e §8:
 * "o mais importante para escalar o onboarding". O banco roda isto contra a
 * própria implementação ANTES de pedir homologação — é o que evita 20
 * integrações ligeiramente diferentes, porque cada checagem aqui é uma regra
 * do contrato (assinatura, janela de replay, validação de corpo, rotas
 * obrigatórias) verificada do jeito exato que a Atlas verifica em produção.
 */

export interface VerifyCheck {
  nome: string;
  ok: boolean;
  detalhe?: string;
}

export interface VerifyResult {
  url: string;
  sdkVersion: number | null;
  ok: boolean;
  checks: VerifyCheck[];
}

export interface VerifyOptions {
  segredo: string | Buffer;
  chavePublica?: string | Buffer;
  timeoutMs?: number;
}

function ofertasRequestExemplo(): OfertasRequestDto {
  return {
    correlacao_id: "0192f3e1-0000-7000-8000-000000000001",
    convenio: { id: 12, codigo: "CONV-VERIFY-001", prazo_maximo_meses: 96, taxa_teto_am: 0.021 },
    servidor: {
      cpf: "12345678901",
      matricula: "0000001",
      vinculo: "ESTATUTARIO",
      situacao_funcional: "ATIVO",
      data_admissao: "2011-03-14",
      data_nascimento: "1984-07-02",
    },
    margem: { tipo: "EMPRESTIMO", disponivel: 812.44, total: 1750.0 },
    solicitacao: { valor_desejado: null, prazo_desejado: null },
  };
}

async function postAssinado(
  url: string,
  path: string,
  segredo: string | Buffer,
  body: unknown,
  timeoutMs: number,
  headerOverride?: string,
): Promise<Response> {
  const corpo = JSON.stringify(body);
  const signature = headerOverride ?? signAtlasRequest(segredo, corpo);
  return fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Atlas-Signature": signature, "Content-Type": "application/json" },
    body: corpo,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export async function runVerify(baseUrl: string, options: VerifyOptions): Promise<VerifyResult> {
  const url = baseUrl.replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 5000;
  const checks: VerifyCheck[] = [];
  let sdkVersion: number | null = null;

  // 1. GET /saude — sonda do circuit breaker (docs/07 §4.1)
  try {
    const response = await fetch(`${url}/saude`, { signal: AbortSignal.timeout(timeoutMs) });
    const body = (await response.json()) as { ok?: boolean; sdk_version?: number };
    const ok = response.ok && body?.ok === true && Number.isInteger(body?.sdk_version) && (body!.sdk_version as number) > 0;
    if (ok) sdkVersion = body!.sdk_version as number;
    checks.push({ nome: "GET /saude responde ok com sdk_version", ok, detalhe: ok ? undefined : `HTTP ${response.status}, corpo ${JSON.stringify(body)}` });
  } catch (error) {
    checks.push({ nome: "GET /saude responde ok com sdk_version", ok: false, detalhe: mensagem(error) });
  }

  // 2. POST /ofertas com assinatura válida — contrato básico (docs/07 §4)
  let ultimaRespostaOfertas: unknown;
  try {
    const response = await postAssinado(url, "/ofertas", options.segredo, ofertasRequestExemplo(), timeoutMs);
    const versaoHeader = response.headers.get("atlas-sdk-version");
    const body = await response.json();
    ultimaRespostaOfertas = body;
    const parsed = OfertasResponseSchema.safeParse(body);
    const ok = response.status === 200 && parsed.success && versaoHeader != null;
    checks.push({
      nome: "POST /ofertas com assinatura válida devolve 200 e corpo conforme o schema",
      ok,
      detalhe: ok ? undefined : `HTTP ${response.status}, Atlas-SDK-Version=${versaoHeader}, corpo ${JSON.stringify(body)}`,
    });
    if (ok && versaoHeader) sdkVersion = Number(versaoHeader);
  } catch (error) {
    checks.push({ nome: "POST /ofertas com assinatura válida devolve 200 e corpo conforme o schema", ok: false, detalhe: mensagem(error) });
  }

  // 3. Assinatura das ofertas (não-repúdio — docs/07 §7), quando chave pública foi informada
  if (options.chavePublica) {
    const parsed = OfertasResponseSchema.safeParse(ultimaRespostaOfertas);
    if (parsed.success && parsed.data.ofertas.length > 0) {
      const todasValidas = parsed.data.ofertas.every((oferta) => {
        const { assinatura, ...unsigned } = oferta;
        return Boolean(assinatura && verifyOferta(options.chavePublica!, unsigned, assinatura));
      });
      checks.push({ nome: "Ofertas retornadas têm assinatura assimétrica válida", ok: todasValidas, detalhe: todasValidas ? undefined : "ao menos uma oferta sem assinatura válida contra a chave pública informada" });
    } else if (parsed.success) {
      checks.push({ nome: "Ofertas retornadas têm assinatura assimétrica válida", ok: true, detalhe: "resposta de exemplo veio sem ofertas — checagem pulada (nada a verificar)" });
    } else {
      checks.push({ nome: "Ofertas retornadas têm assinatura assimétrica válida", ok: false, detalhe: "resposta de /ofertas não pôde ser lida para verificar assinatura" });
    }
  }

  // 4. Rejeita assinatura inválida (docs/07 §7 — autenticidade Atlas → banco)
  try {
    const corpo = JSON.stringify(ofertasRequestExemplo());
    const assinaturaValida = signAtlasRequest(options.segredo, corpo);
    const assinaturaAdulterada = assinaturaValida.replace(/v1=([0-9a-f])/, (_m, c: string) => `v1=${c === "0" ? "1" : "0"}`);
    const response = await postAssinado(url, "/ofertas", options.segredo, ofertasRequestExemplo(), timeoutMs, assinaturaAdulterada);
    const ok = response.status === 401;
    checks.push({ nome: "POST /ofertas rejeita assinatura inválida com 401", ok, detalhe: ok ? undefined : `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ nome: "POST /ofertas rejeita assinatura inválida com 401", ok: false, detalhe: mensagem(error) });
  }

  // 5. Rejeita timestamp fora da janela de 5 min (replay — docs/07 §7)
  try {
    const corpo = JSON.stringify(ofertasRequestExemplo());
    const timestampAntigo = Math.floor(Date.now() / 1000) - 3600;
    const assinaturaExpirada = signAtlasRequest(options.segredo, corpo, timestampAntigo);
    const response = await postAssinado(url, "/ofertas", options.segredo, ofertasRequestExemplo(), timeoutMs, assinaturaExpirada);
    const ok = response.status === 401;
    checks.push({ nome: "POST /ofertas rejeita timestamp fora da janela de replay (5 min)", ok, detalhe: ok ? undefined : `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ nome: "POST /ofertas rejeita timestamp fora da janela de replay (5 min)", ok: false, detalhe: mensagem(error) });
  }

  // 6. Rejeita corpo malformado com erro de cliente, não 200 nem 500 (borda validada — docs/07 §2)
  try {
    const corpoInvalido = { ...ofertasRequestExemplo(), convenio: undefined };
    const response = await postAssinado(url, "/ofertas", options.segredo, corpoInvalido, timeoutMs);
    const ok = response.status >= 400 && response.status < 500;
    checks.push({ nome: "POST /ofertas com corpo fora do schema devolve 4xx (não 200, não 500)", ok, detalhe: ok ? undefined : `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ nome: "POST /ofertas com corpo fora do schema devolve 4xx (não 200, não 500)", ok: false, detalhe: mensagem(error) });
  }

  // 7. Rotas obrigatórias do contrato existem e respondem (docs/07 §4.1)
  try {
    const response = await postAssinado(url, "/contratacoes", options.segredo, {
      correlacao_id: ofertasRequestExemplo().correlacao_id,
      oferta_id: "0192f3e1-0000-7000-8000-000000000002",
    }, timeoutMs);
    const ok = response.status === 200;
    checks.push({ nome: "POST /contratacoes responde 200 a uma notificação assinada", ok, detalhe: ok ? undefined : `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ nome: "POST /contratacoes responde 200 a uma notificação assinada", ok: false, detalhe: mensagem(error) });
  }
  try {
    const response = await postAssinado(url, "/eventos", options.segredo, { tipo: "contrato.averbado", dados: {} }, timeoutMs);
    const ok = response.status === 200;
    checks.push({ nome: "POST /eventos roteia por tipo e responde 200", ok, detalhe: ok ? undefined : `HTTP ${response.status}` });
  } catch (error) {
    checks.push({ nome: "POST /eventos roteia por tipo e responde 200", ok: false, detalhe: mensagem(error) });
  }

  return { url, sdkVersion, ok: checks.every((check) => check.ok), checks };
}

function mensagem(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
