import { z } from "zod"

export const ContratoAverbadoRequestSchema = z.object({
  contrato_id: z.string().uuid(),
  adf: z.string().min(1).optional(),
  averbado_em: z.string().min(1),
})
export type ContratoAverbadoRequest = z.infer<typeof ContratoAverbadoRequestSchema>
