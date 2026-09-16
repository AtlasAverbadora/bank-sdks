import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { generateBancoKeys, newNonce } from "./keys.js"
import { ReplayCache } from "./replay.js"
import { signOfertaJws, signRequest, verifyOfertaJws, verifyRequest } from "./signature.js"
import { UnauthorizedError } from "../api/problem.js"

describe("RFC 9421", () => {
  const atlas = generateBancoKeys()
  const body = JSON.stringify({ ping: true })

  test("assina e verifica", () => {
    const nonce = newNonce()
    const signed = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      keyid: "atlas",
      nonce,
      privateKey: atlas.privateKey,
    })
    verifyRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      headers: signed,
      publicKey: atlas.publicKey,
      replay: new ReplayCache(),
    })
  })

  test("rejeita assinatura de outra chave", () => {
    const outro = generateBancoKeys()
    const signed = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      keyid: "atlas",
      nonce: newNonce(),
      privateKey: outro.privateKey,
    })
    assert.throws(
      () =>
        verifyRequest({
          method: "POST",
          path: "/v1/ofertas",
          body,
          headers: signed,
          publicKey: atlas.publicKey,
          replay: new ReplayCache(),
        }),
      UnauthorizedError,
    )
  })

  test("rejeita nonce reutilizado", () => {
    const nonce = newNonce()
    const replay = new ReplayCache()
    const signed = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      keyid: "atlas",
      nonce,
      privateKey: atlas.privateKey,
    })
    const input = { method: "POST", path: "/v1/ofertas", body, headers: signed, publicKey: atlas.publicKey, replay }
    verifyRequest(input)
    assert.throws(() => verifyRequest(input), UnauthorizedError)
  })

  test("rejeita timestamp fora da janela", () => {
    const signed = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      keyid: "atlas",
      nonce: newNonce(),
      created: Math.floor(Date.now() / 1000) - 120,
      privateKey: atlas.privateKey,
    })
    assert.throws(
      () =>
        verifyRequest({
          method: "POST",
          path: "/v1/ofertas",
          body,
          headers: signed,
          publicKey: atlas.publicKey,
          replay: new ReplayCache(),
        }),
      UnauthorizedError,
    )
  })

  test("rejeita body adulterado", () => {
    const signed = signRequest({
      method: "POST",
      path: "/v1/ofertas",
      body,
      keyid: "atlas",
      nonce: newNonce(),
      privateKey: atlas.privateKey,
    })
    assert.throws(
      () =>
        verifyRequest({
          method: "POST",
          path: "/v1/ofertas",
          body: JSON.stringify({ ping: false }),
          headers: signed,
          publicKey: atlas.publicKey,
          replay: new ReplayCache(),
        }),
      UnauthorizedError,
    )
  })
})

describe("JWS da oferta", () => {
  test("assina e verifica o payload", () => {
    const banco = generateBancoKeys()
    const oferta = { referencia_banco: "X", valor_financiado: 1, valor_liquido: 1, valor_parcela: 1, prazo_meses: 12, taxa_am: 0.01, cet_am: 0.01 }
    const jws = signOfertaJws(banco.privateKey, oferta)
    assert.equal(verifyOfertaJws(banco.publicKey, jws, oferta), true)
    assert.equal(verifyOfertaJws(banco.publicKey, jws, { ...oferta, prazo_meses: 24 }), false)
  })
})
