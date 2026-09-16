import path from "node:path";

export type Config = {
  port: number
  host: string
  atlasUrl?: string
  pairingToken?: string
  publicBaseUrl?: string
  dataDir: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const atlasUrl = emptyToUndef(env.ATLAS_URL)
  const pairingToken = emptyToUndef(env.ATLAS_PAIRING_TOKEN)
  const publicBaseUrl = emptyToUndef(env.PUBLIC_BASE_URL)
  return {
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? "0.0.0.0",
    atlasUrl,
    pairingToken,
    publicBaseUrl,
    dataDir: env.ATLAS_DATA_DIR ?? path.join(process.cwd(), "data"),
  }
}

function emptyToUndef(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
