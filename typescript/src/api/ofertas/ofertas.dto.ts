import { z } from "zod"

export const OfertaSchema = z.object({
  referencia_banco: z.string().min(1),
  valor_financiado: z.number().positive(),
  valor_liquido: z.number().positive(),
  valor_parcela: z.number().positive(),
  prazo_meses: z.number().int().positive(),
  taxa_am: z.number().positive(),
  cet_am: z.number().nonnegative(),
  valor_iof: z.number().nonnegative().optional(),
  jws: z.string().min(1).optional(),
})
export type Oferta = z.infer<typeof OfertaSchema>

export const OfertasRequestSchema = z.object({
  correlacao_id: z.string().uuid(),
  convenio: z.object({
    id: z.number().int(),
    codigo: z.string().min(1),
    prazo_maximo_meses: z.number().int().positive(),
    taxa_teto_am: z.number().positive(),
  }),
  servidor: z.object({
    cpf: z.string().regex(/^\d{11}$/),
    matricula: z.string().min(1),
    vinculo: z.string().min(1),
    situacao_funcional: z.string().min(1),
    data_admissao: z.string().nullable().optional(),
    data_nascimento: z.string().nullable().optional(),
  }),
  margem: z.object({
    tipo: z.string().min(1),
    disponivel: z.number(),
    total: z.number(),
  }),
  solicitacao: z.object({
    valor_desejado: z.number().positive().nullable().optional(),
    prazo_desejado: z.number().int().positive().nullable().optional(),
  }),
})
export type OfertasRequest = z.infer<typeof OfertasRequestSchema>

export const OfertasResponseSchema = z.object({
  validade_segundos: z.number().int().positive().max(86_400).default(300),
  ofertas: z.array(OfertaSchema),
})
export type OfertasResponse = z.infer<typeof OfertasResponseSchema>
