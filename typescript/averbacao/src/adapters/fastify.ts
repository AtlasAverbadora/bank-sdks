import type { FastifyPluginAsync } from "fastify";
import { criarAverbacaoRuntime, mapearErroHttp, type AtlasAverbacaoOptions } from "./http.js";

export type { AtlasAverbacaoConfig, AtlasAverbacaoOptions } from "./http.js";
export { AverbacaoController, criarAverbacaoRuntime, mapearErroHttp } from "./http.js";
export type { AverbacaoServices, ContratacaoService, ContratoService, OfertasService, RetencaoService, SdkHttpError } from "./http.js";

export const atlasAverbacao: FastifyPluginAsync<AtlasAverbacaoOptions> = async (app, options) => {
  const { controller, autenticar } = criarAverbacaoRuntime(options);

  app.setErrorHandler((error: unknown, _request, reply) => {
    const mapped = mapearErroHttp(error);
    return reply.code(mapped.status).send(mapped.body);
  });

  app.addHook("preValidation", async (request, reply) => {
    const falha = autenticar(request.method, request.url, request.body, String(request.headers["atlas-signature"] ?? ""));
    if (falha) return reply.code(falha.status).send(falha.body);
  });

  app.post("/ofertas", async (request, reply) => {
    const response = await controller.ofertas(request.body);
    return reply.header("Atlas-SDK-Version", String(controller.versao())).send(response);
  });
  app.post("/contratacoes", async (request) => controller.contratacaoIniciada(request.body));
  app.post("/eventos", async (request) => controller.evento(request.body));
  app.get("/saude", async () => controller.saude());
};
