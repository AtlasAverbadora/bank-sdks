# Pendente no backend (depois do SDK)

Este arquivo é a lista do que o `atlas-backend-core` precisa mudar **depois**
que o SDK novo existir. O backend se adapta a este contrato — não o contrário.

Modo Ataque **não entra neste SDK**. É o banco chamando a Atlas
(`POST /v1/reservas-compostas`). `adf.liberada` continua fila interna do
backend. Não tem rota, service, client nem stub de ataque no adaptador.

Modo Defesa **entra**: Atlas → SDK `POST /v1/retencao/oportunidades`.

---

## 1. Identidade Atlas ↔ SDK (substitui HMAC e api_tokens neste canal)

- [ ] Par Ed25519 da Atlas **por ambiente** (sandbox / prod): privada no
      secret manager, pública servida no pareamento.
- [ ] `POST /v1/integracao/parear`
      - Bearer = token de uso único + TTL
      - Body: pública do SDK + `PUBLIC_BASE_URL`
      - Token guardado **só como hash** (igual senha)
      - Queima o token, grava `banco_id`, `keyid`, pública, URL, ambiente
      - Resposta: `banco_id` + pública da Atlas + ambiente
- [ ] Admin/ops: gerar token de pareamento, revogar token, revogar `keyid`.
- [ ] Rotação: aceitar `keyid` antigo + novo durante overlap; endpoint
      assinado com a chave antiga pra cadastrar a nova.
- [ ] Tabela de integração: **sair** `integracao_segredo_cif` (HMAC).
      Entrar pública Ed25519 + `keyid` (+ pública anterior na janela).
      URL do SDK e estado (sandbox / homologação / produtiva) ficam.

## 2. Atlas → SDK (`BankClient` único)

Toda chamada da Atlas pro adaptador, **mesmo código pra todo banco**:

- [ ] Assinar RFC 9421 (Ed25519, `created` + `nonce` + `Content-Digest`).
- [ ] Rotas novas (matar `POST /eventos` e header `Atlas-SDK-Version`):

      ```
      GET  {sdk}/v1/saude
      POST {sdk}/v1/ofertas
      POST {sdk}/v1/contratacoes
      POST {sdk}/v1/contratos/averbados
      POST {sdk}/v1/retencao/oportunidades
      ```

- [ ] Verificar JWS da oferta com a pública daquele banco.
- [ ] Erro RFC 9457; `Idempotency-Key`; `traceparent`.
- [ ] Matar HMAC `Atlas-Signature: t=,v1=` neste canal.

## 3. SDK → Atlas (inbound do banco)

Mesma identidade RFC 9421, pública daquele banco. **Não** é `api_tokens`.

- [ ] `POST /v1/reservas-compostas` (Modo Ataque) — auth nova.
- [ ] Rotas de Modo Defesa que o banco chama na Atlas
      (`/v1/portal/banco/retencoes/...` ou o que for o contrato novo).
- [ ] **Sair `api_tokens` desse canal** (portal humano pode continuar como
      estiver — outra audiência).

## 4. Modo Ataque (só backend, zero SDK)

- [ ] Continua: banco → Atlas `reservas-compostas`.
- [ ] Continua: `adf.liberada` só na fila interna; **não** webhook/SDK.
- [ ] Auth dessa rota = RFC 9421 do par pareado, não token legado.
- [ ] Nada no repo `atlas-sdks` chama, notifica ou stub-a ataque.

## 5. Hospedar o SDK na Atlas (cenário B)

O backend **ainda** só fala com `{sdk}/v1/...`. Sem `if (banco)`.

- [ ] Provisionar processo/container do SDK por banco.
- [ ] Secrets da **camada 2** (URL + credencial da API *do banco*) só no
      env daquele processo. BankClient não vê.
- [ ] Pareamento interno (ops não precisa mandar token pro banco).

## 6. Sandbox / testes / docs

- [ ] Seed emite token de pareamento.
- [ ] Sandbox sobe o processo deste repo, não plugin Fastify.
- [ ] Reescrever testes que importam
      `@atlas/averbacao-sdk/fastify`, `fakeBank`, `runVerify`,
      `gerarOpenApiSpec`, `examples`.
- [ ] Reescrever `docs/07-sdk-bancos.md`: adaptador, dois deploys,
      pareamento, RFC 9421, rotas `/v1`, sem HMAC/CLI/openapi package.
- [ ] Limpar `Dockerfile` / `postinstall` / `file:` apontando pasta antiga.

## 7. Fora de escopo (não bloqueia o SDK)

mTLS opcional, IP allowlist, fan-out/cache/breaker de ofertas (já são da
Atlas; só passam a bater na URL/auth novas).
