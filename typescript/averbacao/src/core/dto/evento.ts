import { z } from "zod";

export const EventoEnvelopeSchema = z.object({
  id: z.string().uuid(),
  tipo: z.string().min(1),
  schema_version: z.number().int().positive(),
  ocorrido_em: z.string(),
  agregado: z.object({ tipo: z.string(), id: z.string(), chave: z.string().optional() }),
  particao: z.string().optional(),
  trace_id: z.string().optional(),
  ator: z.object({ tipo: z.string(), id: z.union([z.string(), z.number()]) }).optional(),
  dados: z.unknown(),
});
export type EventoEnvelopeDto = z.infer<typeof EventoEnvelopeSchema>;
/** @deprecated use EventoEnvelopeDto */
export type EventoEnvelope = EventoEnvelopeDto;
