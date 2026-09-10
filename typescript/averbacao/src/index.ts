import { createHmac, createPrivateKey, createPublicKey, sign, timingSafeEqual, verify } from "node:crypto";
import { z } from "zod";

export const OfertaSchema = z.object({
  referencia_banco: z.string().min(1),
  valor_financiado: z.number().positive(), valor_liquido: z.number().positive(),
  valor_parcela: z.number().positive(), prazo_meses: z.number().int().positive(),
  taxa_am: z.number().positive(), cet_am: z.number().nonnegative(), valor_iof: z.number().nonnegative().optional(),
  assinatura: z.string().min(1).optional(),
});
export const OfertasResponseSchema = z.object({ validade_segundos: z.number().int().positive().max(86_400).default(300), ofertas: z.array(OfertaSchema) });
export const OfertasRequestSchema = z.object({
  correlacao_id: z.string().uuid(), convenio: z.object({ id: z.number().int(), codigo: z.string(), prazo_maximo_meses: z.number().int(), taxa_teto_am: z.number() }),
  servidor: z.object({ cpf: z.string().regex(/^\d{11}$/), matricula: z.string(), vinculo: z.string(), situacao_funcional: z.string(), data_admissao: z.string().nullable().optional(), data_nascimento: z.string().nullable().optional() }),
  margem: z.object({ tipo: z.string(), disponivel: z.number(), total: z.number() }),
  solicitacao: z.object({ valor_desejado: z.number().nullable().optional(), prazo_desejado: z.number().int().nullable().optional() }),
});
export type Oferta = z.infer<typeof OfertaSchema>;
export type OfertasResponse = z.infer<typeof OfertasResponseSchema>;
export type OfertasRequest = z.infer<typeof OfertasRequestSchema>;

/**
 * Notificação `POST /contratacoes` (docs/07 §4.1: "servidor escolheu uma
 * oferta"). O contrato não especifica o corpo campo a campo além de
 * `oferta_id` (docs/02 ADR-11: "a Atlas devolve o oferta_id — e o banco
 * honra o que assinou") e `correlacao_id` (usado por `runVerify` e por
 * `chamarOfertas` como chave de idempotência). `contrato_id` é opcional
 * porque a notificação pode chegar antes do contrato ganhar id definitivo
 * em alguns fluxos. `.passthrough()` deliberado: é o mínimo que o contrato
 * garante, não o corpo exaustivo — campos adicionais que a Atlas venha a
 * mandar não devem quebrar a validação de quem já integrou.
 */
export const ContratacaoNotificacaoSchema = z
  .object({
    correlacao_id: z.string().uuid(),
    oferta_id: z.string().uuid(),
    contrato_id: z.string().uuid().optional(),
  })
  .passthrough();
export type ContratacaoNotificacao = z.infer<typeof ContratacaoNotificacaoSchema>;

/**
 * Envelope de `POST /eventos` — mesmo formato de docs/06-eventos-filas.md
 * §3, reaproveitado aqui só para documentação (OpenAPI) e para quem quiser
 * validar no próprio lado. O plugin Fastify (`fastify.ts`) NÃO valida o
 * corpo contra este schema em runtime — ele roteia por `tipo` para os
 * callbacks nomeados de forma deliberadamente tolerante (docs/07 §4.1: "o
 * banco implementa um handler e o SDK faz o roteamento por tipo"), e apertar
 * essa validação é uma mudança de comportamento fora do escopo desta rodada.
 * Este schema documenta o contrato pretendido, não o que é hoje
 * mecanicamente rejeitado.
 */
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
export type EventoEnvelope = z.infer<typeof EventoEnvelopeSchema>;

/** Resposta de `GET /saude` — sonda do circuit breaker (docs/07 §4.1). */
export const SaudeResponseSchema = z.object({ ok: z.boolean(), sdk_version: z.number().int().positive() });
export type SaudeResponse = z.infer<typeof SaudeResponseSchema>;

export type AtlasSdkHandlers = {
  ofertas: (request: OfertasRequest) => Promise<OfertasResponse> | OfertasResponse;
  contratacaoIniciada?: (payload: unknown) => Promise<void> | void;
  contratoAverbado?: (payload: unknown) => Promise<void> | void;
  adfLiberada?: (payload: unknown) => Promise<void> | void;
  retencaoOportunidade?: (payload: unknown) => Promise<void> | void;
};
export type AtlasRequestHeaders = { timestamp: number; signature: string };

export function hmac(secret: string | Buffer, value: string): string { return createHmac("sha256", secret).update(value).digest("hex"); }
export function signAtlasRequest(secret: string | Buffer, body: string, timestamp = Math.floor(Date.now() / 1000)): string { return `t=${timestamp},v1=${hmac(secret, `${timestamp}.${body}`)}`; }
export function verifyAtlasRequest(secret: string | Buffer, body: string, header: string, now = Math.floor(Date.now() / 1000)): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]+)$/i.exec(header);
  if (!match || Math.abs(now - Number(match[1])) > 300) return false;
  const expected = hmac(secret, `${match[1]}.${body}`);
  const provided = Buffer.from(match[2]!, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return provided.length === expectedBytes.length && timingSafeEqual(provided, expectedBytes);
}

/** Assina uma oferta com a chave privada do banco (Ed25519 ou RSA). */
export function signOferta(privateKey: string | Buffer, oferta: Omit<Oferta, "assinatura">): string {
  return sign(null, Buffer.from(JSON.stringify(oferta)), createPrivateKey(privateKey)).toString("base64url");
}
export function verifyOferta(publicKey: string | Buffer, oferta: Omit<Oferta, "assinatura">, assinatura: string): boolean {
  return verify(null, Buffer.from(JSON.stringify(oferta)), createPublicKey(publicKey), Buffer.from(assinatura, "base64url"));
}
