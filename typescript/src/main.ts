import { loadConfig } from "./config.js"
import { buildApp } from "./app.js"
import { loadOrCreateKeys } from "./security/keys.js"
import { identityFrom, loadIntegracao, pair, saveIntegracao } from "./security/pairing.js"

const config = loadConfig()
const keys = loadOrCreateKeys(config.dataDir)
let identity = loadIntegracao(config.dataDir, keys)

if (!identity && config.atlasUrl && config.pairingToken && config.publicBaseUrl) {
  try {
    const integracao = await pair({
      atlasUrl: config.atlasUrl,
      token: config.pairingToken,
      publicBaseUrl: config.publicBaseUrl,
      publicKey: keys.publicKey,
      keyid: keys.keyid,
    })
    saveIntegracao(config.dataDir, integracao)
    identity = identityFrom(keys, integracao)
    console.log(`Pareado. banco_id=${integracao.bancoId} ambiente=${integracao.ambiente}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }
}

if (!identity) {
  console.warn("Sem pareamento: /docs e /v1/saude sobem; rotas autenticadas retornam 401.")
}

const app = await buildApp({ identity, logger: true })
await app.listen({ port: config.port, host: config.host })
console.log(`Adaptador em http://${config.host}:${config.port}  docs: /docs`)
