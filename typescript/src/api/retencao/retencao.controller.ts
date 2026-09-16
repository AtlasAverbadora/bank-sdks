import type { FastifyInstance } from "fastify"
import { OkResponseSchema } from "../contratacao/contratacao.dto.js"
import type { RetencaoContract } from "../../services/retencao/retencao.contract.js"
import { RetencaoOportunidadeRequestSchema } from "./retencao.dto.js"

export function registrarRetencao(app: FastifyInstance, retencao: RetencaoContract): void {
  app.post(
    "/v1/retencao/oportunidades",
    {
      schema: {
        tags: ["retencao"],
        summary: "Abriu uma oportunidade de retenção (Modo Defesa)",
        body: RetencaoOportunidadeRequestSchema,
        response: { 200: OkResponseSchema },
      },
    },
    async (request) => {
      await retencao.oportunidadeAberta(RetencaoOportunidadeRequestSchema.parse(request.body))
      return { ok: true as const }
    },
  )
}
