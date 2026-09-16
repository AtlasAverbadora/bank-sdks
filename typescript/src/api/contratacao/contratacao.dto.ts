import { z } from "zod"

export const ContratacaoRequestSchema = z.object({
  correlacao_id: z.string().uuid(),
  oferta_id: z.string().uuid(),
  contrato_id: z.string().uuid().optional(),
})
export type ContratacaoRequest = z.infer<typeof ContratacaoRequestSchema>

export const OkResponseSchema = z.object({ ok: z.literal(true) })
export type OkResponse = z.infer<typeof OkResponseSchema>
