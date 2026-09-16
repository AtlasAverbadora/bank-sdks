import type { FastifyInstance } from "fastify"
import type { Identity } from "../../security/keys.js"
import { signOfertaJws } from "../../security/signature.js"
import type { OfertasContract } from "../../services/ofertas/ofertas.contract.js"
import { OfertasRequestSchema, OfertasResponseSchema } from "./ofertas.dto.js"

export function registrarOfertas(
  app: FastifyInstance,
  deps: { ofertas: OfertasContract; identity: Identity | null },
): void {
  app.post(
    "/v1/ofertas",
    {
      schema: {
        tags: ["ofertas"],
        summary: "Devolva ofertas de crédito para o servidor informado",
        body: OfertasRequestSchema,
        response: { 200: OfertasResponseSchema },
      },
    },
    async (request) => {
      const gerada = OfertasResponseSchema.parse(
        await deps.ofertas.gerar(OfertasRequestSchema.parse(request.body)),
      )
      if (!deps.identity) return gerada
      return {
        ...gerada,
        ofertas: gerada.ofertas.map((oferta) => {
          if (oferta.jws) return oferta
          const { jws: _omit, ...unsigned } = oferta
          return { ...unsigned, jws: signOfertaJws(deps.identity!.bancoPrivateKey, unsigned) }
        }),
      }
    },
  )
}
