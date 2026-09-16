import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { buildApp } from "./app.js"
import { generateBancoKeys, newNonce, type Identity } from "./security/keys.js"
import { signRequest, verifyOfertaJws } from "./security/signature.js"
import type { OfertasContract } from "./services/ofertas/ofertas.contract.js"

function identityFixture(): Identity & { atlasPrivateKey: string } {
  const atlas = generateBancoKeys()
  const banco = generateBancoKeys()
  return {
    atlasPublicKey: atlas.publicKey,
    atlasPrivateKey: atlas.privateKey,
    bancoPrivateKey: banco.privateKey,
    bancoPublicKey: banco.publicKey,
    bancoId: "42",
    keyid: banco.keyid,
  }
}

function ofertasBody() {
  return {
    correlacao_id: "0192f3e1-0000-7000-8000-000000000001",
    convenio: { id: 12, codigo: "CONV-1", prazo_maximo_meses: 96, taxa_teto_am: 0.021 },
    servidor: {
      cpf: "12345678901",
      matricula: "0001",
      vinculo: "ESTATUTARIO",
      situacao_funcional: "ATIVO",
    },
    margem: { tipo: "EMPRESTIMO", disponivel: 800, total: 1700 },
    solicitacao: { valor_desejado: null, prazo_desejado: null },
  }
}

async function postAssinado(
  app: Awaited<ReturnType<typeof buildApp>>,
  path: string,
  atlasPrivateKey: string,
  body: unknown,
) {
  const raw = JSON.stringify(body)
  const headers = signRequest({
    method: "POST",
    path,
    body: raw,
    keyid: "atlas",
    nonce: newNonce(),
    privateKey: atlasPrivateKey,
  })
  return app.inject({ method: "POST", url: path, headers, payload: raw })
}

describe("app", () => {
  test("GET /v1/saude sem assinatura", async () => {
    const app = await buildApp()
    const res = await app.inject({ method: "GET", url: "/v1/saude" })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), { ok: true, versao: 1 })
    await app.close()
  })

  test("GET /docs sobe", async () => {
    const app = await buildApp()
    const res = await app.inject({ method: "GET", url: "/docs" })
    assert.equal(res.statusCode, 200)
    await app.close()
  })

  test("POST autenticado sem pareamento → 401", async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: "POST",
      url: "/v1/ofertas",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify(ofertasBody()),
    })
    assert.equal(res.statusCode, 401)
    await app.close()
  })

  test("ofertas stub autenticado → 501", async () => {
    const id = identityFixture()
    const app = await buildApp({ identity: id })
    const res = await postAssinado(app, "/v1/ofertas", id.atlasPrivateKey, ofertasBody())
    assert.equal(res.statusCode, 501)
    assert.equal(res.json().detail, "ofertas.gerar")
    await app.close()
  })

  test("assinatura ruim → 401", async () => {
    const id = identityFixture()
    const outro = generateBancoKeys()
    const app = await buildApp({ identity: id })
    const res = await postAssinado(app, "/v1/ofertas", outro.privateKey, ofertasBody())
    assert.equal(res.statusCode, 401)
    await app.close()
  })

  test("nonce repetido → 401", async () => {
    const id = identityFixture()
    const app = await buildApp({ identity: id })
    const raw = JSON.stringify(ofertasBody())
    const headers = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body: raw,
      keyid: "atlas",
      nonce: newNonce(),
      privateKey: id.atlasPrivateKey,
    })
    const first = await app.inject({ method: "POST", url: "/v1/ofertas", headers, payload: raw })
    const second = await app.inject({ method: "POST", url: "/v1/ofertas", headers, payload: raw })
    assert.equal(first.statusCode, 501)
    assert.equal(second.statusCode, 401)
    await app.close()
  })

  test("corpo fora do schema → 400", async () => {
    const id = identityFixture()
    const app = await buildApp({ identity: id })
    const res = await postAssinado(app, "/v1/ofertas", id.atlasPrivateKey, { correlacao_id: "nao-e-uuid" })
    assert.equal(res.statusCode, 400)
    await app.close()
  })

  test("ofertas implementado assina JWS", async () => {
    const id = identityFixture()
    const ofertas: OfertasContract = {
      gerar: () => ({
        validade_segundos: 300,
        ofertas: [
          {
            referencia_banco: "X-1",
            valor_financiado: 10000,
            valor_liquido: 9800,
            valor_parcela: 400,
            prazo_meses: 24,
            taxa_am: 0.017,
            cet_am: 0.018,
          },
        ],
      }),
    }
    const app = await buildApp({ identity: id, services: { ofertas } })
    const res = await postAssinado(app, "/v1/ofertas", id.atlasPrivateKey, ofertasBody())
    assert.equal(res.statusCode, 200)
    const json = res.json() as { ofertas: Array<{ jws?: string; referencia_banco: string; valor_financiado: number; valor_liquido: number; valor_parcela: number; prazo_meses: number; taxa_am: number; cet_am: number }> }
    const oferta = json.ofertas[0]!
    assert.ok(oferta.jws)
    const { jws, ...unsigned } = oferta
    assert.equal(verifyOfertaJws(id.bancoPublicKey, jws!, unsigned), true)
    await app.close()
  })

  test("contratacao / contrato / retencao no-op → 200", async () => {
    const id = identityFixture()
    const app = await buildApp({ identity: id })
    const contratacao = await postAssinado(app, "/v1/contratacoes", id.atlasPrivateKey, {
      correlacao_id: "0192f3e1-0000-7000-8000-000000000001",
      oferta_id: "0192f3e1-0000-7000-8000-000000000002",
    })
    const contrato = await postAssinado(app, "/v1/contratos/averbados", id.atlasPrivateKey, {
      contrato_id: "0192f3e1-0000-7000-8000-000000000003",
      averbado_em: "2026-09-16T12:00:00Z",
    })
    const retencao = await postAssinado(app, "/v1/retencao/oportunidades", id.atlasPrivateKey, {
      oportunidade_id: "0192f3e1-0000-7000-8000-000000000004",
      matricula: "0001",
      expira_em: "2026-09-16T18:00:00Z",
    })
    assert.equal(contratacao.statusCode, 200)
    assert.equal(contrato.statusCode, 200)
    assert.equal(retencao.statusCode, 200)
    await app.close()
  })
})
