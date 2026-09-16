import { createHash, generateKeyPairSync, randomUUID } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

export type BancoKeys = {
  privateKey: string
  publicKey: string
  keyid: string
}

export function generateBancoKeys(): BancoKeys {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString()
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  return { privateKey: privatePem, publicKey: publicPem, keyid: keyidFromPublic(publicPem) }
}

export function keyidFromPublic(publicKey: string): string {
  return `banco_${createHash("sha256").update(publicKey).digest("hex").slice(0, 16)}`
}

export function loadOrCreateKeys(dataDir: string): BancoKeys {
  mkdirSync(dataDir, { recursive: true })
  const privatePath = path.join(dataDir, "banco-private.pem")
  const publicPath = path.join(dataDir, "banco-public.pem")
  try {
    const privateKey = readFileSync(privatePath, "utf8")
    const publicKey = readFileSync(publicPath, "utf8")
    return { privateKey, publicKey, keyid: keyidFromPublic(publicKey) }
  } catch {
    const keys = generateBancoKeys()
    writeFileSync(privatePath, keys.privateKey, { encoding: "utf8", mode: 0o600 })
    writeFileSync(publicPath, keys.publicKey, { encoding: "utf8", mode: 0o644 })
    return keys
  }
}

/** Identidade injetada em teste ou carregada depois do pareamento. */
export type Identity = {
  atlasPublicKey: string
  bancoPrivateKey: string
  bancoPublicKey: string
  bancoId: string
  keyid: string
}

export function newNonce(): string {
  return randomUUID()
}
