# Plano de implementação

O `typescript/` vira o **adaptador**. A Atlas sempre chama as mesmas rotas.
Cada banco (ou a Atlas, se hospedar o processo) só implementa `services/`,
chamando a API *deles*.

Modo Ataque **não entra**. Lista do backend: [`PENDENTE-BACKEND.md`](./PENDENTE-BACKEND.md).

Não reaproveitar plugin, HMAC, CLI, pasta `openapi`, `examples`, `adapters`,
`POST /eventos`, `Atlas-SDK-Version`. Reescrita.

---

## Pronto quando

Banco (ou ops) consegue:

1. `pnpm install && pnpm dev`
2. Parear com token real (`ATLAS_URL` + `ATLAS_PAIRING_TOKEN`)
3. Abrir `/docs`
4. Receber `POST /v1/ofertas` assinado, cair no service, e o service ser o
   único lugar com `NotImplemented` / chamada à API do banco

Quem não mexeu em `services/` não precisa entender RFC 9421.

---

## Contrato (adaptador)

```
GET  /v1/saude                         sem assinatura (LB)
GET  /docs                             sem assinatura
POST /v1/ofertas                       RFC 9421 + JWS da oferta na resposta
POST /v1/contratacoes                  RFC 9421
POST /v1/contratos/averbados           RFC 9421
POST /v1/retencao/oportunidades        RFC 9421
POST /v1/integracao/chaves             RFC 9421 (rotação; pode ficar no fim)
```

Erro: RFC 9457 `application/problem+json`.  
Idempotência: `Idempotency-Key`.  
Trace: `traceparent`.  
Versão: URL `/v1`, sem header de SDK.

JSON de cada rota se desenha **nessa fase**, limpo pro produto — não copiar
o Zod velho por inércia. Campos de negócio que o produto precisa continuam
(CPF, margem, teto, parcela, etc.).

---

## Árvore alvo (`typescript/`)

```
typescript/
  package.json                 # app: pnpm dev / start  (não lib com 6 exports)
  .env.example
  data/                        # gitignored: privada, integracao.json
  src/
    main.ts
    app.ts
    config.ts
    api/
      ofertas/
      contratacao/
      contrato/
      retencao/
      saude/
    security/
      keys.ts
      pairing.ts
      signature.ts             # RFC 9421 Ed25519
      replay.ts
    services/
      ofertas/                 # contract + service (throw)
      contratacao/             # contract + service (no-op)
      contrato/
      retencao/
```

Sem `atlas/` client. Sem pasta de Modo Ataque.

Dois deploys, **mesmo artefato**: processo no banco, ou processo na Atlas
com env da API deles no `services/`.

---

## Fase 0 — limpar o terreno

Apagar (não migrar): `adapters/`, `cli/`, `openapi/`, `examples/`,
`testing/` como subpath de lib, plugin `atlasAverbacao`, `bin atlas-sdk`,
exports `./fastify` `./http` `./examples` `./openapi`.

`package.json` vira aplicação: `dev`, `start`, `build`, `test`.  
Dependências: Fastify, Zod, swagger da rota (`@fastify/swagger` +
`@fastify/swagger-ui` + type provider Zod). Sem `zod-to-json-schema` solto
gerando arquivo.

`.gitignore`: `data/`, `node_modules/`, `dist/`.

README raiz + `typescript/README.md`: adaptador, dois deploys, só mexe em
`services/`, ataque não é daqui. `.NET`/`Java` continuam “em breve”.

---

## Fase 1 — processo que sobe + saúde + swagger

- `pnpm dev` escuta `PORT` (default 3000)
- `GET /v1/saude` → `{ ok, versao: 1 }`
- `/docs` automático a partir das rotas (mesmo vazio de negócio)
- `config.ts` lê env, não espalha `process.env`

**Aceite:** `pnpm dev` + abrir `/docs` + `/v1/saude`.

---

## Fase 2 — identidade

Um caminho só. O SDK **não** inventa par da Atlas. Pública da Atlas só
chega no pareamento. Teste não é modo de produto: o test gera os dois
pares em memória e injeta no `buildApp`.

**Par do banco**

- Gera Ed25519 na primeira subida se `data/` vazio
- Privada nunca loga, nunca vai no Git
- `keyid` estável

**Pareamento** (obrigatório pra aceitar call autenticada)

- Precisa `ATLAS_URL` + `ATLAS_PAIRING_TOKEN` + `PUBLIC_BASE_URL`
- `POST {ATLAS_URL}/v1/integracao/parear` com pública do SDK + URL
- Grava `banco_id`, pública Atlas, ambiente em `data/integracao.json`
- Se já tem `integracao.json`, não reenvia o token
- Sem pareamento: processo sobe (`/docs`, `/v1/saude`), rotas autenticadas
  respondem 401 — não cai num “modo especial”
- Sandbox aceita `localhost`. Prod: HTTPS — a **Atlas** recusa no parear

**RFC 9421**

- Assinar / verificar: `@method`, `@path`, `content-digest`, `content-type`,
  `created`, `nonce`, `keyid`
- Janela ~30s + cache de nonce
- Hook em toda rota `/v1` autenticada
- 401 problem+json se falhar

**Aceite:** teste injeta par Atlas + par banco, assina como Atlas,
`POST /v1/ofertas` passa da auth (service ainda pode throw). Assinatura
ruim, nonce repetido, timestamp velho → 401. Sem `integracao.json` e sem
injeção → 401. Sem env `ATLAS_DEV`.

---

## Fase 3 — contrato HTTP + services

Um contexto = pasta em `api/` **e** pasta em `services/`.

| Rota | Service | Stub |
|---|---|---|
| `POST /v1/ofertas` | `gerar` | `NotImplemented` |
| `POST /v1/contratacoes` | `iniciada` | no-op + log |
| `POST /v1/contratos/averbados` | `averbado` | no-op + log |
| `POST /v1/retencao/oportunidades` | `oportunidadeAberta` | no-op + log |

Controller: valida Zod, chama **só** a interface, nunca a API do banco.  
Ofertas: se o service devolver oferta sem JWS e existir privada, o
adaptador assina. Recusa de crédito = `200 { ofertas: [] }`.  
`app.ts` instancia os 4 services e injeta. Banco só troca o corpo do
`*.service.ts`.

DTOs: um arquivo por contexto em `api/<ctx>/`. Swagger sai desse Zod.

**Aceite:** request autenticado de ofertas com service stub → 501
(NotImplemented). Trocando o stub pra `{ ofertas: [] }` → 200. Eventos
de contrato/retenção → 200 sem o banco ter escrito nada.

---

## Fase 4 — testes e README do banco

Não é CLI `atlas-sdk`. É `pnpm test` contra o processo.

- Assinatura / replay / schema 4xx
- Ofertas stub 501 vs no-op 200 nas outras
- `/v1/saude` sem assinatura
- JWS da oferta verifica com a pública do SDK

README `typescript/`: os 3 passos (env, `pnpm dev`, mexe `services/`),
os dois deploys, o que **não** mexer, Modo Ataque não é aqui.

`.env.example` com `ATLAS_URL`, `ATLAS_PAIRING_TOKEN`, `PUBLIC_BASE_URL`,
`PORT`.

**Aceite:** README sozinho basta pra um dev de banco achar o service.

---

## Fase 5 — backend (outro repo, depois)

Não começa até as fases 1–4 passarem teste (auth injetada). `pnpm dev`
com token de verdade só fecha o ciclo quando o parear existir aqui.

Ordem no `atlas-backend-core` — detalhe e checkboxes em
[`PENDENTE-BACKEND.md`](./PENDENTE-BACKEND.md):

1. Par Ed25519 Atlas por ambiente + `POST /v1/integracao/parear`
2. Schema: pública/`keyid` no lugar do HMAC
3. `BankClient` RFC 9421 nas rotas `/v1` novas (sem `/eventos`)
4. Inbound banco→Atlas (ataque, defesa) na **mesma** identidade;
   `api_tokens` sai **desse canal**
5. Admin: emitir/revogar token e `keyid`
6. Sandbox/seed/Dockerfile/`file:` + testes que importam o SDK velho
7. `docs/07-sdk-bancos.md`

Hospedar SDK na Atlas (container + secret camada 2) pode vir depois do
BankClient novo; não bloqueia banco que hospeda o adaptador.

Quando o parear existir: e2e com token de verdade (SDK grava
`integracao.json`).

---

## Fora deste plano

- Java / .NET (mesmo contrato HTTP, pasta “em breve”)
- mTLS, IP allowlist
- Fan-out / cache / breaker de ofertas (já é Atlas)
- Qualquer client de `reservas-compostas` neste repo
- Publicar npm; o artefato é a pasta/processo

---

## Ordem de execução (este repo)

```
Fase 0  apagar lib velha, package.json de app
Fase 1  main + saude + /docs
Fase 2  keys, pairing, RFC 9421, replay
Fase 3  4 contextos api/ + services/
Fase 4  testes + README banco
------  parar. backend = PENDENTE-BACKEND.md
```
