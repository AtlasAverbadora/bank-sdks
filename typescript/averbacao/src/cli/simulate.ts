import { OfertasResponseSchema, type OfertaDto, type OfertasRequestDto } from "../core/dto/index.js";
import { signAtlasRequest, verifyOferta } from "../core/crypto.js";

/**
 * `atlas-sdk simulate` — a lacuna que ficou da Fase 6 (docs/07 §9 lista
 * `simulate` numa tabela, sem especificação — decisão registrada em
 * `cli/index.ts` / README §7).
 *
 * DESENHO ESCOLHIDO: `verify` responde "sua implementação está conforme?"
 * (checks binários, exit code de CI). `simulate` responde uma pergunta
 * diferente e mais barata para o dia a dia de desenvolvimento: "o que a
 * Atlas vai te mandar, e o que você respondeu?" — dispara UMA chamada real
 * de `/ofertas` com parâmetros que o desenvolvedor do banco controla (valor
 * desejado, prazo, margem, convênio) e devolve os dois lados (request e
 * response) mais uma lista de divergências, sem virar pass/fail. É
 * ferramenta de inspeção durante o desenvolvimento — rodar de novo depois de
 * mudar uma linha do motor de crédito, sem precisar montar o payload à mão
 * nem decorar o formato do header de assinatura.
 *
 * Por que não reaproveitar as 8 checagens de `verify`: `verify` testa a
 * BORDA do SDK (assinatura, replay, schema, rotas obrigatórias) com um
 * payload fixo. `simulate` testa o MOTOR DE CRÉDITO do banco com o payload
 * que o desenvolvedor quer — margem alta vs. baixa, convênio apertado vs.
 * frouxo — e aponta quando a oferta devolvida violaria os tetos que a Atlas
 * aplicaria (docs/07 §4, regra 1), sem reimplementar esse cálculo (ADR-01):
 * a violação é só reportada, nunca corrigida ou recalculada aqui.
 */

export interface SimulateRequestOverrides {
  correlacaoId?: string;
  convenioId?: number;
  convenioCodigo?: string;
  convenioPrazoMaximoMeses?: number;
  convenioTaxaTetoAm?: number;
  cpf?: string;
  matricula?: string;
  vinculo?: string;
  situacaoFuncional?: string;
  margemTipo?: string;
  margemDisponivel?: number;
  margemTotal?: number;
  valorDesejado?: number | null;
  prazoDesejado?: number | null;
}

/** Monta uma requisição `/ofertas` realista, com cada parâmetro de negócio controlável — é o payload que `simulate` dispara. */
export function gerarSimulateRequest(overrides: SimulateRequestOverrides = {}): OfertasRequestDto {
  return {
    correlacao_id: overrides.correlacaoId ?? "0192f3e1-0000-7000-8000-000000000099",
    convenio: {
      id: overrides.convenioId ?? 12,
      codigo: overrides.convenioCodigo ?? "SIMULATE-001",
      prazo_maximo_meses: overrides.convenioPrazoMaximoMeses ?? 96,
      taxa_teto_am: overrides.convenioTaxaTetoAm ?? 0.021,
    },
    servidor: {
      cpf: overrides.cpf ?? "12345678901",
      matricula: overrides.matricula ?? "0000001",
      vinculo: overrides.vinculo ?? "ESTATUTARIO",
      situacao_funcional: overrides.situacaoFuncional ?? "ATIVO",
      data_admissao: "2011-03-14",
      data_nascimento: "1984-07-02",
    },
    margem: {
      tipo: overrides.margemTipo ?? "EMPRESTIMO",
      disponivel: overrides.margemDisponivel ?? 812.44,
      total: overrides.margemTotal ?? 1750.0,
    },
    solicitacao: {
      valor_desejado: overrides.valorDesejado ?? null,
      prazo_desejado: overrides.prazoDesejado ?? null,
    },
  };
}

export interface SimulateDivergencia {
  /** "erro": a resposta está fora do contrato (schema inválido, assinatura inválida). "aviso": passa no schema, mas a Atlas descartaria/sinalizaria em produção. */
  severidade: "erro" | "aviso";
  campo: string;
  detalhe: string;
}

export interface SimulateOptions {
  segredo: string | Buffer;
  chavePublica?: string | Buffer;
  timeoutMs?: number;
  request?: SimulateRequestOverrides;
}

export interface SimulateResult {
  url: string;
  request: OfertasRequestDto;
  status: number | null;
  sdkVersionHeader: string | null;
  responseBody: unknown;
  schemaOk: boolean;
  divergencias: SimulateDivergencia[];
  erroTransporte?: string;
}

function validarTetos(oferta: OfertaDto, request: OfertasRequestDto): SimulateDivergencia[] {
  const divergencias: SimulateDivergencia[] = [];
  if (oferta.valor_parcela > request.margem.disponivel) {
    divergencias.push({
      severidade: "aviso",
      campo: `ofertas[].valor_parcela (${oferta.referencia_banco})`,
      detalhe: `valor_parcela=${oferta.valor_parcela} > margem.disponivel=${request.margem.disponivel} — a Atlas descartaria esta oferta (docs/07 §4, regra 1).`,
    });
  }
  if (oferta.prazo_meses > request.convenio.prazo_maximo_meses) {
    divergencias.push({
      severidade: "aviso",
      campo: `ofertas[].prazo_meses (${oferta.referencia_banco})`,
      detalhe: `prazo_meses=${oferta.prazo_meses} > convenio.prazo_maximo_meses=${request.convenio.prazo_maximo_meses} — a Atlas descartaria esta oferta.`,
    });
  }
  if (oferta.taxa_am > request.convenio.taxa_teto_am) {
    divergencias.push({
      severidade: "aviso",
      campo: `ofertas[].taxa_am (${oferta.referencia_banco})`,
      detalhe: `taxa_am=${oferta.taxa_am} > convenio.taxa_teto_am=${request.convenio.taxa_teto_am} — a Atlas descartaria esta oferta.`,
    });
  }
  return divergencias;
}

/**
 * Dispara a requisição de `/ofertas` que a Atlas faria (mesma assinatura de
 * `BankClient`) e devolve os dois lados — request e response — mais as
 * divergências encontradas. Nunca lança por causa do corpo devolvido pelo
 * banco (schema inválido é uma divergência reportada, não uma exceção) —
 * só propaga erro de transporte (rede, timeout) via `erroTransporte`.
 */
export async function runSimulate(baseUrl: string, options: SimulateOptions): Promise<SimulateResult> {
  const url = baseUrl.replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? 5000;
  const request = gerarSimulateRequest(options.request);
  const corpo = JSON.stringify(request);

  let response: Response;
  try {
    response = await fetch(`${url}/ofertas`, {
      method: "POST",
      headers: {
        "Atlas-Signature": signAtlasRequest(options.segredo, corpo),
        "Atlas-SDK-Version": "1",
        "Idempotency-Key": request.correlacao_id,
        "Content-Type": "application/json",
      },
      body: corpo,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return {
      url,
      request,
      status: null,
      sdkVersionHeader: null,
      responseBody: undefined,
      schemaOk: false,
      divergencias: [],
      erroTransporte: error instanceof Error ? error.message : String(error),
    };
  }

  const sdkVersionHeader = response.headers.get("atlas-sdk-version");
  const divergencias: SimulateDivergencia[] = [];
  if (!sdkVersionHeader) {
    divergencias.push({ severidade: "aviso", campo: "header Atlas-SDK-Version", detalhe: "resposta não trouxe o header Atlas-SDK-Version (docs/07 §8)." });
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return {
      url,
      request,
      status: response.status,
      sdkVersionHeader,
      responseBody: undefined,
      schemaOk: false,
      divergencias: [{ severidade: "erro", campo: "corpo", detalhe: `corpo não é JSON válido: ${error instanceof Error ? error.message : String(error)}` }],
    };
  }

  const parsed = OfertasResponseSchema.safeParse(body);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      divergencias.push({ severidade: "erro", campo: issue.path.join(".") || "(raiz)", detalhe: `${issue.message} (${issue.code})` });
    }
    return { url, request, status: response.status, sdkVersionHeader, responseBody: body, schemaOk: false, divergencias };
  }

  for (const oferta of parsed.data.ofertas) {
    divergencias.push(...validarTetos(oferta, request));
    if (!oferta.assinatura) {
      divergencias.push({ severidade: "aviso", campo: `ofertas[].assinatura (${oferta.referencia_banco})`, detalhe: "oferta sem assinatura — sem não-repúdio (docs/07 §7); ok para desenvolvimento, obrigatório para homologação com chave pública cadastrada." });
    } else if (options.chavePublica) {
      const { assinatura, ...semAssinatura } = oferta;
      const ok = verifyOferta(options.chavePublica, semAssinatura, assinatura);
      if (!ok) {
        divergencias.push({ severidade: "erro", campo: `ofertas[].assinatura (${oferta.referencia_banco})`, detalhe: "assinatura não verifica contra a chave pública informada." });
      }
    }
  }

  return { url, request, status: response.status, sdkVersionHeader, responseBody: body, schemaOk: true, divergencias };
}
