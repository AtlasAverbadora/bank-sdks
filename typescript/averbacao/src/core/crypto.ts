import { createHmac, createPrivateKey, createPublicKey, sign, timingSafeEqual, verify } from "node:crypto";
import type { OfertaDto } from "./dto/index.js";

export type AtlasRequestHeaders = { timestamp: number; signature: string };

export function hmac(secret: string | Buffer, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function signAtlasRequest(secret: string | Buffer, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  return `t=${timestamp},v1=${hmac(secret, `${timestamp}.${body}`)}`;
}

export function verifyAtlasRequest(secret: string | Buffer, body: string, header: string, now = Math.floor(Date.now() / 1000)): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]+)$/i.exec(header);
  if (!match || Math.abs(now - Number(match[1])) > 300) return false;
  const expected = hmac(secret, `${match[1]}.${body}`);
  const provided = Buffer.from(match[2]!, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return provided.length === expectedBytes.length && timingSafeEqual(provided, expectedBytes);
}

export function signOferta(privateKey: string | Buffer, oferta: Omit<OfertaDto, "assinatura">): string {
  return sign(null, Buffer.from(JSON.stringify(oferta)), createPrivateKey(privateKey)).toString("base64url");
}

export function verifyOferta(publicKey: string | Buffer, oferta: Omit<OfertaDto, "assinatura">, assinatura: string): boolean {
  return verify(null, Buffer.from(JSON.stringify(oferta)), createPublicKey(publicKey), Buffer.from(assinatura, "base64url"));
}
