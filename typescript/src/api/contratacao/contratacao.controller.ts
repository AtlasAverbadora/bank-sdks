import type { FastifyInstance } from "fastify"
import type { ContratacaoContract } from "../../services/contratacao/contratacao.contract.js"
import { ContratacaoRequestSchema, OkResponseSchema } from "./contratacao.dto.js"

export function registrarContratacao(app: FastifyInstance, contratacao: ContratacaoContract): void {
  app.post(
    "/v1/contratacoes",
    {
      schema: {
        tags: ["contratacao"],
        summary: "Uma oferta sua foi escolhida — confirme no seu core",
        body: ContratacaoRequestSchema,
        response: { 200: OkResponseSchema },
      },
    },
    async (request) => {
      await contratacao.iniciada(ContratacaoRequestSchema.parse(request.body))
      return { ok: true as const }
    },
  )
}
