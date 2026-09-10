import { z } from "zod";

/**
 * Notificação `POST /contratacoes`. `.passthrough()`: campos extras da Atlas
 * não devem quebrar quem já integrou.
 */
export const ContratacaoNotificacaoSchema = z
  .object({
    correlacao_id: z.string().uuid(),
    oferta_id: z.string().uuid(),
    contrato_id: z.string().uuid().optional(),
  })
  .passthrough();
export type ContratacaoNotificacaoDto = z.infer<typeof ContratacaoNotificacaoSchema>;
/** @deprecated use ContratacaoNotificacaoDto */
export type ContratacaoNotificacao = ContratacaoNotificacaoDto;
