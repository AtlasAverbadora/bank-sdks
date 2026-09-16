import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify"
import swagger from "@fastify/swagger"
import swaggerUi from "@fastify/swagger-ui"
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod"
import { ZodError } from "zod"
import { registrarContratacao } from "./api/contratacao/contratacao.controller.js"
import { registrarContrato } from "./api/contrato/contrato.controller.js"
import { registrarOfertas } from "./api/ofertas/ofertas.controller.js"
import { ProblemError, problemBody, UnauthorizedError } from "./api/problem.js"
import { registrarRetencao } from "./api/retencao/retencao.controller.js"
import { registrarSaude } from "./api/saude/saude.controller.js"
import type { Identity } from "./security/keys.js"
import { ReplayCache } from "./security/replay.js"
import { verifyRequest } from "./security/signature.js"
import type { ContratacaoContract } from "./services/contratacao/contratacao.contract.js"
import { ContratacaoService } from "./services/contratacao/contratacao.service.js"
import type { ContratoContract } from "./services/contrato/contrato.contract.js"
import { ContratoService } from "./services/contrato/contrato.service.js"
import type { OfertasContract } from "./services/ofertas/ofertas.contract.js"
import { OfertasService } from "./services/ofertas/ofertas.service.js"
import type { RetencaoContract } from "./services/retencao/retencao.contract.js"
import { RetencaoService } from "./services/retencao/retencao.service.js"

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string
  }
}

export type AppServices = {
  ofertas: OfertasContract
  contratacao: ContratacaoContract
  contrato: ContratoContract
  retencao: RetencaoContract
}

export type BuildAppOptions = {
  identity?: Identity | null
  services?: Partial<AppServices>
  logger?: boolean
}

function rotaPublica(method: string, path: string): boolean {
  if (method === "GET" && path === "/v1/saude") return true
  if (path === "/docs" || path.startsWith("/docs/")) return true
  return false
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const identity = options.identity ?? null
  const services: AppServices = {
    ofertas: options.services?.ofertas ?? new OfertasService(),
    contratacao: options.services?.contratacao ?? new ContratacaoService(),
    contrato: options.services?.contrato ?? new ContratoService(),
    retencao: options.services?.retencao ?? new RetencaoService(),
  }
  const replay = new ReplayCache()

  const app = Fastify({ logger: options.logger ?? false, keepAliveTimeout: 100 })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.removeContentTypeParser("application/json")
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    const raw = typeof body === "string" ? body : Buffer.from(body).toString("utf8")
    request.rawBody = raw
    if (!raw) {
      done(null, undefined)
      return
    }
    try {
      done(null, JSON.parse(raw) as unknown)
    } catch {
      done(new ProblemError(400, "Bad Request", "JSON inválido"))
    }
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Integração Atlas",
        version: "1",
        description: "Implemente apenas src/services/. Rotas, validação e assinatura já estão prontas.",
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: "/docs" })

  app.addHook("preValidation", async (request) => {
    const path = (request.raw.url ?? request.url).split("?")[0] ?? request.url
    if (rotaPublica(request.method, path)) return
    if (!identity) throw new UnauthorizedError("não pareado")
    verifyRequest({
      method: request.method,
      path,
      body: request.rawBody ?? "",
      headers: request.headers,
      publicKey: identity.atlasPublicKey,
      replay,
    })
  })

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof ProblemError) {
      return reply.status(error.status).type("application/problem+json").send(problemBody(error))
    }
    if (error instanceof ZodError) {
      return reply.status(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "corpo fora do schema",
        errors: error.issues,
      })
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 400) {
      return reply.status(400).type("application/problem+json").send({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: (error as Error).message,
      })
    }
    request.log.error(error)
    return reply.status(500).type("application/problem+json").send({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "erro interno",
    })
  })

  registrarSaude(app)
  registrarOfertas(app, { ofertas: services.ofertas, identity })
  registrarContratacao(app, services.contratacao)
  registrarContrato(app, services.contrato)
  registrarRetencao(app, services.retencao)

  await app.ready()
  return app
}
