import { z } from "zod";

/** DTO de uma oferta devolvida pelo banco. */
export const OfertaSchema = z.object({
  referencia_banco: z.string().min(1),
  valor_financiado: z.number().positive(),
  valor_liquido: z.number().positive(),
  valor_parcela: z.number().positive(),
  prazo_meses: z.number().int().positive(),
  taxa_am: z.number().positive(),
  cet_am: z.number().nonnegative(),
  valor_iof: z.number().nonnegative().optional(),
  assinatura: z.string().min(1).optional(),
});
export type OfertaDto = z.infer<typeof OfertaSchema>;
/** @deprecated use OfertaDto */
export type Oferta = OfertaDto;

export const OfertasResponseSchema = z.object({
  validade_segundos: z.number().int().positive().max(86_400).default(300),
  ofertas: z.array(OfertaSchema),
});
export type OfertasResponseDto = z.infer<typeof OfertasResponseSchema>;
/** @deprecated use OfertasResponseDto */
export type OfertasResponse = OfertasResponseDto;

export const OfertasRequestSchema = z.object({
  correlacao_id: z.string().uuid(),
  convenio: z.object({
    id: z.number().int(),
    codigo: z.string(),
    prazo_maximo_meses: z.number().int(),
    taxa_teto_am: z.number(),
  }),
  servidor: z.object({
    cpf: z.string().regex(/^\d{11}$/),
    matricula: z.string(),
    vinculo: z.string(),
    situacao_funcional: z.string(),
    data_admissao: z.string().nullable().optional(),
    data_nascimento: z.string().nullable().optional(),
  }),
  margem: z.object({ tipo: z.string(), disponivel: z.number(), total: z.number() }),
  solicitacao: z.object({
    valor_desejado: z.number().nullable().optional(),
    prazo_desejado: z.number().int().nullable().optional(),
  }),
});
export type OfertasRequestDto = z.infer<typeof OfertasRequestSchema>;
/** @deprecated use OfertasRequestDto */
export type OfertasRequest = OfertasRequestDto;
