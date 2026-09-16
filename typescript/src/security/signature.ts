import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto"
import { UnauthorizedError } from "../api/problem.js"
import type { ReplayCache } from "./replay.js"

const COVERED = ["@method", "@path", "content-digest", "content-type"] as const
const CLOCK_SKEW_SEC = 30

export type SignRequestInput = {
  method: string
  path: string
  body: string
  contentType?: string
  created?: number
  keyid: string
  nonce: string
  privateKey: string
}

export type SignedHeaders = {
  "content-type": string
  "content-digest": string
  "signature-input": string
  signature: string
}

export function contentDigest(body: string): string {
  const hash = createHash("sha256").update(body, "utf8").digest("base64")
  return `sha-256=:${hash}:`
}

export function signatureParams(input: { created: number; keyid: string; nonce: string }): string {
  const listed = COVERED.map((c) => `"${c}"`).join(" ")
  return `(${listed});created=${input.created};keyid="${input.keyid}";nonce="${input.nonce}";alg="ed25519"`
}

export function signatureBase(input: {
  method: string
  path: string
  digest: string
  contentType: string
  params: string
}): string {
  return [
    `"@method": ${input.method.toUpperCase()}`,
    `"@path": ${input.path}`,
    `"content-digest": ${input.digest}`,
    `"content-type": ${input.contentType}`,
    `"@signature-params": ${input.params}`,
  ].join("\n")
}

export function signRequest(input: SignRequestInput): SignedHeaders {
  const contentType = canonicalizeContentType(input.contentType ?? "application/json")
  const created = input.created ?? Math.floor(Date.now() / 1000)
  const digest = contentDigest(input.body)
  const params = signatureParams({ created, keyid: input.keyid, nonce: input.nonce })
  const base = signatureBase({
    method: input.method,
    path: input.path,
    digest,
    contentType,
    params,
  })
  const signature = sign(null, Buffer.from(base, "utf8"), createPrivateKey(input.privateKey)).toString("base64")
  return {
    "content-type": contentType,
    "content-digest": digest,
    "signature-input": `sig1=${params}`,
    signature: `sig1=:${signature}:`,
  }
}

export type VerifyRequestInput = {
  method: string
  path: string
  body: string
  headers: Record<string, string | string[] | undefined>
  publicKey: string
  replay: ReplayCache
  nowSec?: number
}

export function verifyRequest(input: VerifyRequestInput): void {
  const header = (name: string): string => {
    const value = input.headers[name] ?? input.headers[name.toLowerCase()]
    if (Array.isArray(value)) return value.join(",")
    return value ?? ""
  }

  const signatureInput = header("signature-input")
  const signatureHeader = header("signature")
  const digestHeader = header("content-digest")
  const contentType = canonicalizeContentType(header("content-type") || "application/json")

  const parsed = parseSignatureInput(signatureInput)
  if (!parsed) throw new UnauthorizedError("Signature-Input ausente ou inválido")

  const signature = parseSignature(signatureHeader)
  if (!signature) throw new UnauthorizedError("Signature ausente ou inválida")

  const nowSec = input.nowSec ?? Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - parsed.created) > CLOCK_SKEW_SEC) {
    throw new UnauthorizedError("timestamp fora da janela")
  }

  const expectedDigest = contentDigest(input.body)
  if (digestHeader !== expectedDigest) {
    throw new UnauthorizedError("Content-Digest não confere")
  }

  const params = signatureParams({ created: parsed.created, keyid: parsed.keyid, nonce: parsed.nonce })
  const base = signatureBase({
    method: input.method,
    path: input.path,
    digest: expectedDigest,
    contentType,
    params,
  })

  const ok = verify(
    null,
    Buffer.from(base, "utf8"),
    createPublicKey(input.publicKey),
    Buffer.from(signature, "base64"),
  )
  if (!ok) throw new UnauthorizedError("assinatura inválida")

  if (!input.replay.claim(parsed.nonce)) {
    throw new UnauthorizedError("nonce reutilizado")
  }
}

function canonicalizeContentType(value: string): string {
  return value.split(";")[0]!.trim().toLowerCase()
}

function parseSignatureInput(header: string): { created: number; keyid: string; nonce: string } | null {
  const match = /^sig1=\("@method" "@path" "content-digest" "content-type"\);created=(\d+);keyid="([^"]+)";nonce="([^"]+)";alg="ed25519"$/.exec(
    header.trim(),
  )
  if (!match) return null
  return { created: Number(match[1]), keyid: match[2]!, nonce: match[3]! }
}

function parseSignature(header: string): string | null {
  const match = /^sig1=:([A-Za-z0-9+/]+=*):$/.exec(header.trim())
  return match?.[1] ?? null
}

/** JWS compact EdDSA sobre o JSON da oferta (sem o campo `jws`). */
export function signOfertaJws(privateKey: string, oferta: unknown): string {
  const header = base64url(Buffer.from(JSON.stringify({ alg: "EdDSA" })))
  const payload = base64url(Buffer.from(JSON.stringify(oferta)))
  const signingInput = `${header}.${payload}`
  const sig = sign(null, Buffer.from(signingInput), createPrivateKey(privateKey)).toString("base64url")
  return `${signingInput}.${sig}`
}

export function verifyOfertaJws(publicKey: string, jws: string, oferta: unknown): boolean {
  const parts = jws.split(".")
  if (parts.length !== 3) return false
  const [header, payload, sig] = parts as [string, string, string]
  const signingInput = `${header}.${payload}`
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (JSON.stringify(parsed) !== JSON.stringify(oferta)) return false
    return verify(null, Buffer.from(signingInput), createPublicKey(publicKey), Buffer.from(sig, "base64url"))
  } catch {
    return false
  }
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url")
}
