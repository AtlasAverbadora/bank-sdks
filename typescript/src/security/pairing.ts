import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { BancoKeys, Identity } from "./keys.js"

export type Integracao = {
  bancoId: string
  keyid: string
  atlasPublicKey: string
  ambiente: string
}

export type PairInput = {
  atlasUrl: string
  token: string
  publicBaseUrl: string
  publicKey: string
  keyid: string
}

export async function pair(input: PairInput): Promise<Integracao> {
  const url = `${input.atlasUrl.replace(/\/$/, "")}/v1/integracao/parear`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      public_key: input.publicKey,
      base_url: input.publicBaseUrl,
      keyid: input.keyid,
    }),
  })
  if (!response.ok) {
    const corpo = await response.text().catch(() => "")
    throw new Error(`pareamento falhou: HTTP ${response.status} ${corpo}`.trim())
  }
  const body = (await response.json()) as {
    banco_id: string | number
    atlas_public_key: string
    ambiente: string
    keyid?: string
  }
  if (!body.atlas_public_key) throw new Error("pareamento: resposta sem atlas_public_key")
  return {
    bancoId: String(body.banco_id),
    keyid: body.keyid ?? input.keyid,
    atlasPublicKey: body.atlas_public_key,
    ambiente: body.ambiente,
  }
}

export function integracaoPath(dataDir: string): string {
  return path.join(dataDir, "integracao.json")
}

export function loadIntegracao(dataDir: string, keys: BancoKeys): Identity | null {
  try {
    const raw = JSON.parse(readFileSync(integracaoPath(dataDir), "utf8")) as Integracao
    if (!raw.atlasPublicKey) return null
    return {
      atlasPublicKey: raw.atlasPublicKey,
      bancoPrivateKey: keys.privateKey,
      bancoPublicKey: keys.publicKey,
      bancoId: raw.bancoId,
      keyid: raw.keyid || keys.keyid,
    }
  } catch {
    return null
  }
}

export function saveIntegracao(dataDir: string, integracao: Integracao): void {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(integracaoPath(dataDir), JSON.stringify(integracao, null, 2) + "\n", "utf8")
}

export function identityFrom(keys: BancoKeys, integracao: Integracao): Identity {
  return {
    atlasPublicKey: integracao.atlasPublicKey,
    bancoPrivateKey: keys.privateKey,
    bancoPublicKey: keys.publicKey,
    bancoId: integracao.bancoId,
    keyid: integracao.keyid || keys.keyid,
  }
}
