import type { FastifyInstance } from "fastify"
import { OkResponseSchema } from "../contratacao/contratacao.dto.js"
import type { ContratoContract } from "../../services/contrato/contrato.contract.js"
import { ContratoAverbadoRequestSchema } from "./contrato.dto.js"

export function registrarContrato(app: FastifyInstance, contrato: ContratoContract): void {
  app.post(
    "/v1/contratos/averbados",
    {
      schema: {
        tags: ["contrato"],
        summary: "O contrato foi averbado na folha",
        body: ContratoAverbadoRequestSchema,
        response: { 200: OkResponseSchema },
      },
    },
    async (request) => {
      await contrato.averbado(ContratoAverbadoRequestSchema.parse(request.body))
      return { ok: true as const }
    },
  )
}
