import { ZodError } from "zod";
import { AverbacaoController, type AtlasAverbacaoConfig } from "../core/controller.js";
import { verifyAtlasRequest } from "../core/crypto.js";
import type { AverbacaoServices } from "../core/services.js";

export type { AtlasAverbacaoConfig } from "../core/controller.js";
export { AverbacaoController } from "../core/controller.js";
export type {
  AverbacaoServices,
  ContratacaoService,
  ContratoService,
  OfertasService,
  RetencaoService,
} from "../core/services.js";

export type AtlasAverbacaoOptions = AtlasAverbacaoConfig & AverbacaoServices;

export type SdkHttpError = {
  status: 400 | 401 | 500;
  body: Record<string, unknown>;
};

/** HMAC nas POSTs do contrato. `GET /saude` fica aberto (sonda do circuit breaker). */
export function exigeAssinaturaAtlas(method: string, url: string): boolean {
  const path = url.split("?")[0];
  return method === "POST" && path !== "/saude";
}

export function verificarAssinaturaAtlas(segredo: string | Buffer, body: unknown, signatureHeader: string): boolean {
  return verifyAtlasRequest(segredo, JSON.stringify(body ?? {}), signatureHeader);
}

export function mapearErroHttp(error: unknown): SdkHttpError {
  if (error instanceof ZodError) {
    return { status: 400, body: { code: "validation_error", detalhes: error.issues } };
  }
  const mensagem = error instanceof Error ? error.message : String(error);
  return { status: 500, body: { code: "erro_interno", detalhe: mensagem } };
}

/**
 * Núcleo HTTP sem framework. Fastify (e um adapter futuro) só traduz
 * request/reply para estes métodos.
 */
export function criarAverbacaoRuntime(options: AtlasAverbacaoOptions) {
  const controller = new AverbacaoController(options, options);
  return {
    controller,
    autenticar(method: string, url: string, body: unknown, signatureHeader: string): SdkHttpError | null {
      if (!exigeAssinaturaAtlas(method, url)) return null;
      if (verificarAssinaturaAtlas(options.segredo, body, signatureHeader)) return null;
      return { status: 401, body: { code: "invalid_signature" } };
    },
  };
}
