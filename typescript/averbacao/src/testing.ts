import { generateKeyPairSync } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { atlasAverbacao, type AtlasAverbacaoOptions } from "./fastify.js";
import { signAtlasRequest, type OfertasRequest, type OfertasResponse } from "./index.js";

/**
 * `@atlas/averbacao-sdk/testing` — docs/07-sdk-bancos.md §9: "servidor de
 * mentira e a bateria `verify`". Tudo que um banco precisa para testar a
 * própria implementação sem subir a Atlas: um servidor Fastify real
 * (`fakeBank`) que roda os handlers dele atrás do mesmo plugin de produção,
 * um chamador que simula a Atlas (`chamarOfertas`) assinando do jeito que o
 * nosso `BankClient` assina, geradores de fixture, e a própria bateria de
 * conformidade (`runVerify`) — para o banco poder rodá-la no CI dele contra
 * o `fakeBank`, sem depender de rede nem da CLI.
 */
export { runVerify } from "./verify.js";
export type { VerifyCheck, VerifyOptions, VerifyResult } from "./verify.js";
export { gerarSimulateRequest, runSimulate } from "./simulate.js";
export type { SimulateDivergencia, SimulateOptions, SimulateRequestOverrides, SimulateResult } from "./simulate.js";

/**
 * Sobe um servidor Fastify real, com os handlers do banco atrás do plugin
 * @atlas/averbacao-sdk/fastify. Não é mock de fetch — é um processo HTTP de
 * verdade, escutando numa porta efêmera. `keepAliveTimeout` curto é de
 * propósito: sem isso, `app.close()` num teste espera o socket keep-alive do
 * cliente HTTP (undici/fetch) fechar sozinho, o que pode travar o teardown
 * do teste por vários segundos sem nenhum motivo de negócio.
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
export function gerarOfertasRequestExemplo(overrides: Partial<OfertasRequest> = {}): OfertasRequest {
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
export async function chamarOfertas(baseUrl: string, segredo: string | Buffer, request: OfertasRequest): Promise<{ status: number; body: OfertasResponse | unknown; headers: Headers }> {
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
