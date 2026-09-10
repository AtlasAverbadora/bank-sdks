import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { OfertasRequestSchema, OfertasResponseSchema, signOferta, verifyAtlasRequest, type AtlasSdkHandlers } from "./index.js";

export type AtlasAverbacaoOptions = AtlasSdkHandlers & {
  segredo: string | Buffer;
  versao?: number;
  /**
   * Opcional: quando informada, toda oferta devolvida por `ofertas()` que
   * ainda não vier assinada (`assinatura` ausente) é assinada aqui antes de
   * responder — é o "auto-assinatura" documentado no README/docs/07 §2 e §7.
   * Um handler que já assina manualmente (chamando `signOferta` ele mesmo e
   * preenchendo `assinatura`) continua funcionando sem mudança: o plugin
   * nunca sobrescreve uma assinatura já presente, então não há assinatura
   * dupla nem invalidação da assinatura existente.
   */
  chavePrivada?: string | Buffer;
};

export const atlasAverbacao: FastifyPluginAsync<AtlasAverbacaoOptions> = async (app, options) => {
  // Erro de validação Zod na borda vira 400 (erro do chamador), nunca 500
  // (que sugeriria falha nossa) — é a diferença que `atlas-sdk verify`
  // cobra (docs/07 §2: "validação Zod na borda"). Encapsulado pelo Fastify:
  // só cobre as rotas registradas dentro deste plugin.
  app.setErrorHandler((error: unknown, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ code: "validation_error", detalhes: error.issues });
    }
    const mensagem = error instanceof Error ? error.message : String(error);
    return reply.code(500).send({ code: "erro_interno", detalhe: mensagem });
  });
  app.addHook("preValidation", async (request, reply) => {
    if (!["POST"].includes(request.method) || request.url === "/saude") return;
    const body = JSON.stringify(request.body ?? {});
    const signature = String(request.headers["atlas-signature"] ?? "");
    if (!verifyAtlasRequest(options.segredo, body, signature)) return reply.code(401).send({ code: "invalid_signature" });
  });
  app.post("/ofertas", async (request, reply) => {
    const input = OfertasRequestSchema.parse(request.body);
    const response = OfertasResponseSchema.parse(await options.ofertas(input));
    if (options.chavePrivada) {
      response.ofertas = response.ofertas.map((oferta) => {
        if (oferta.assinatura) return oferta; // já assinada pelo handler — não assina de novo nem sobrescreve.
        const { assinatura: _semAssinatura, ...unsigned } = oferta;
        return { ...unsigned, assinatura: signOferta(options.chavePrivada!, unsigned) };
      });
    }
    return reply.header("Atlas-SDK-Version", String(options.versao ?? 1)).send(response);
  });
  app.post("/contratacoes", async (request) => { await options.contratacaoIniciada?.(request.body); return { ok: true }; });
  app.post("/eventos", async (request) => {
    const body = request.body as { tipo?: string; dados?: unknown };
    const handlers: Record<string, ((payload: unknown) => Promise<void> | void) | undefined> = {
      "contrato.averbado": options.contratoAverbado, "adf.liberada": options.adfLiberada, "retencao.oportunidade.aberta": options.retencaoOportunidade,
    };
    await handlers[body.tipo ?? ""]?.(body.dados);
    return { ok: true };
  });
  app.get("/saude", async () => ({ ok: true, sdk_version: options.versao ?? 1 }));
};
