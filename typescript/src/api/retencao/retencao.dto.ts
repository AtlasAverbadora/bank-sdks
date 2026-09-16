import { z } from "zod"

export const RetencaoOportunidadeRequestSchema = z.object({
  oportunidade_id: z.string().uuid(),
  contrato_id: z.string().uuid().optional(),
  matricula: z.string().min(1),
  expira_em: z.string().min(1),
})
export type RetencaoOportunidadeRequest = z.infer<typeof RetencaoOportunidadeRequestSchema>
