import { generateKeyPairSync } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { atlasAverbacao, type AtlasAverbacaoOptions } from "./fastify.js";
import { signAtlasRequest, type OfertasRequestDto, type OfertasResponseDto } from "./index.js";

/**
 * `@atlas/averbacao-sdk/testing` — servidor Fastify real (`fakeBank`) com o
 * service do banco atrás do mesmo controller de produção, chamador que
 * simula a Atlas (`chamarOfertas`), fixtures e `runVerify`/`runSimulate`.
 */
export { runVerify } from "./verify.js";
export type { VerifyCheck, VerifyOptions, VerifyResult } from "./verify.js";
export { gerarSimulateRequest, runSimulate } from "./simulate.js";
export type { SimulateDivergencia, SimulateOptions, SimulateRequestOverrides, SimulateResult } from "./simulate.js";

/**
 * Sobe Fastify real com o `AverbacaoService` do banco atrás do controller.
 * `keepAliveTimeout` curto evita `app.close()` travar no keep-alive do fetch.
 */
export async function fakeBank(options: AtlasAverbacaoOptions): Promise<FastifyInstance> {
  const app = Fastify({ keepAliveTimeout: 100 });
  await app.register(atlasAverbacao, options);
  await app.ready();
  return app;
}

/** Gera um par de chaves Ed25519 — para assinar (`chavePrivada`) e verificar (`chavePublica`) ofertas nos testes, sem precisar de chave real de produção. */
export function criarChavesEd25519(): { chavePrivada: string; chavePublica: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    chavePrivada: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    chavePublica: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

/** Requisição `/ofertas` de exemplo, válida contra `OfertasRequestSchema` — para não obrigar cada teste de banco a montar o payload inteiro à mão. */
export function gerarOfertasRequestExemplo(overrides: Partial<OfertasRequestDto> = {}): OfertasRequestDto {
  return {
    correlacao_id: "0192f3e1-0000-7000-8000-000000000001",
    convenio: { id: 12, codigo: "CONV-TEST-001", prazo_maximo_meses: 96, taxa_teto_am: 0.021 },
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
    ...overrides,
  };
}

/**
 * Simula a chamada que a Atlas faz: assina com `segredo` (mesmo algoritmo de
 * `BankClient`, em `src/shared/bancos/bank-client.service.ts` do lado da
 * Atlas) e faz o POST HTTP de verdade contra `baseUrl` — útil para o banco
 * escrever o próprio teste de integração contra o `fakeBank` (ou contra o
 * ambiente real dele) sem duplicar a lógica de assinatura.
 */
export async function chamarOfertas(baseUrl: string, segredo: string | Buffer, request: OfertasRequestDto): Promise<{ status: number; body: OfertasResponseDto | unknown; headers: Headers }> {
  const corpo = JSON.stringify(request);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/ofertas`, {
    method: "POST",
    headers: {
      "Atlas-Signature": signAtlasRequest(segredo, corpo),
      "Atlas-SDK-Version": "1",
      "Idempotency-Key": request.correlacao_id,
      "Content-Type": "application/json",
    },
    body: corpo,
  });
  const body = await response.json().catch(() => undefined);
  return { status: response.status, body, headers: response.headers };
}
