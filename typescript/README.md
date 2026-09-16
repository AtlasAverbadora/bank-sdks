# Adaptador Atlas → banco

A Atlas chama sempre as mesmas rotas deste processo. A API de vocês
continua de vocês: ligue ela só em `src/services/`.

Modo Ataque **não passa por aqui**. Você chama a Atlas
(`reservas-compostas`). Este processo só recebe: ofertas, contratação,
contrato averbado e retenção (Modo Defesa).

## Subir

```bash
cp .env.example .env
# ATLAS_URL, ATLAS_PAIRING_TOKEN, PUBLIC_BASE_URL
pnpm install
pnpm dev
```

Docs: `http://localhost:3000/docs`  
Saúde: `http://localhost:3000/v1/saude`

Primeira subida gera o par Ed25519 em `data/` (gitignored) e pareia com a
Atlas. Sem token, o processo sobe assim mesmo: `/docs` e `/v1/saude` no ar,
o resto responde 401 até o pareamento.

## O que você implementa

| Arquivo | Quando |
|---|---|
| `src/services/ofertas/ofertas.service.ts` | sempre — motor de crédito |
| `src/services/contratacao/contratacao.service.ts` | se consome a escolha da oferta |
| `src/services/contrato/contrato.service.ts` | se trata averbação na folha |
| `src/services/retencao/retencao.service.ts` | Modo Defesa |

Comece por `ofertas.service.ts` — está com `throw` até você ligar o motor.
Recusa de crédito: `{ ofertas: [] }`, nunca erro HTTP. Os outros métodos
podem ficar como estão se você não usar aquele fluxo.

Não altere `src/api/` nem `src/security/`.

## Dois jeitos de hospedar

1. **No banco** — este processo na infra de vocês, `PUBLIC_BASE_URL` pública.
   Credenciais da API interna ficam aqui, a Atlas nunca vê.
2. **Na Atlas** — o mesmo processo, com a URL/credencial da API de vocês no
   env. A Atlas continua chamando só `/v1/ofertas` etc. Sem código por banco
   no backend.

## Rotas

```
GET  /v1/saude
POST /v1/ofertas
POST /v1/contratacoes
POST /v1/contratos/averbados
POST /v1/retencao/oportunidades
```

Assinatura HTTP: RFC 9421 + Ed25519 (a Atlas assina; o adaptador verifica).
Cada oferta devolve um JWS EdDSA.

```bash
pnpm test
```
