import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { AverbacaoController, type AtlasAverbacaoConfig } from "./controller.js";
import { verifyAtlasRequest } from "./crypto.js";
import type { AverbacaoService } from "./service.js";

export type { AtlasAverbacaoConfig } from "./controller.js";
export { AverbacaoController } from "./controller.js";
export type { AverbacaoService } from "./service.js";

export type AtlasAverbacaoOptions = AtlasAverbacaoConfig & {
  service: AverbacaoService;
};

export const atlasAverbacao: FastifyPluginAsync<AtlasAverbacaoOptions> = async (app, options) => {
  const controller = new AverbacaoController(options.service, options);

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
    if (!verifyAtlasRequest(options.segredo, body, signature)) {
      return reply.code(401).send({ code: "invalid_signature" });
    }
  });

  app.post("/ofertas", async (request, reply) => {
    const response = await controller.ofertas(request.body);
    return reply.header("Atlas-SDK-Version", String(controller.versao())).send(response);
  });
  app.post("/contratacoes", async (request) => controller.contratacaoIniciada(request.body));
  app.post("/eventos", async (request) => controller.evento(request.body));
  app.get("/saude", async () => controller.saude());
};
