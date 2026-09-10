# @atlas/averbacao-sdk

SDK para bancos conveniados integrarem a Atlas sem escrever roteamento,
validação, assinatura ou versionamento — ver
[`docs/07-sdk-bancos.md`](../../docs/07-sdk-bancos.md) para o contrato
completo. O banco escreve só o corpo dos handlers (a ponte para o motor de
crédito dele); o SDK cuida do resto.

## 1. Integração Fastify

```ts
import Fastify from "fastify";
import { atlasAverbacao } from "@atlas/averbacao-sdk/fastify";

const app = Fastify();

await app.register(atlasAverbacao, {
  segredo: process.env.ATLAS_SIGNING_SECRET!,   // valida a chamada da Atlas (HMAC)
  chavePrivada: process.env.BANCO_PRIVATE_KEY,  // opcional: assina as ofertas
  versao: 1,                                    // Atlas-SDK-Version

  // A ÚNICA parte que o banco escreve: a ponte para o próprio sistema.
  async ofertas(req) {
    const analise = await motorDeCredito.avaliar(req.servidor.cpf, req.margem.disponivel);
    if (!analise.aprovado) return { ofertas: [] }; // recusa de crédito = 200 com lista vazia, nunca erro HTTP
    return {
      validade_segundos: 300,
      ofertas: analise.opcoes.map((o) => ({
        referencia_banco: o.id,
        valor_financiado: o.principal, valor_liquido: o.liquido,
        valor_parcela: o.parcela, prazo_meses: o.prazo,
        taxa_am: o.taxa, cet_am: o.cet, valor_iof: o.iof,
      })),
    };
  },

  async contratacaoIniciada(req) { /* a oferta virou contrato */ },
  async contratoAverbado(req)    { /* averbou na folha */ },
  async adfLiberada(req)         { /* Modo Ataque: reserva executou */ },
  async retencaoOportunidade(req){ /* Modo Defesa: atacaram sua ADF */ },
});

await app.listen({ port: 3000 });
```

O plugin já registra `POST /ofertas`, `POST /contratacoes`, `POST /eventos` e
`GET /saude` — **não** registre essas rotas de novo por fora, o plugin já é o
dono delas.

O que o plugin garante, sozinho:

- **Validação Zod na borda** — corpo fora do schema vira `400`, nunca `200`
  nem `500`.
- **Autenticidade da chamada** — header `Atlas-Signature: t=<epoch>,v1=<hmac-sha256>`
  sobre `timestamp.corpo`, com janela de replay de 5 minutos; fora disso, `401`.
- **Roteamento de `/eventos`** por `tipo` para os callbacks nomeados
  (`contratoAverbado`, `adfLiberada`, `retencaoOportunidade`) — um único
  handler cadastrado no lado do banco vira "SDK escolhe o método certo".
- **`Atlas-SDK-Version`** no header de resposta de `/ofertas`.

## 2. Assinatura de ofertas (não-repúdio)

Se `chavePrivada` for informada, toda oferta devolvida por `ofertas()` é
assinada (Ed25519 ou RSA) antes de sair — é o que sustenta "a oferta é uma
promessa" (docs/07 §4, regra 4): a Atlas guarda a assinatura em
`ofertas.assinatura`, e ao contratar devolve `oferta_id` + assinatura para o
banco honrar sem recalcular.

## 3. `npx atlas-sdk verify` — a bateria de conformidade

O comando mais importante para escalar o onboarding (docs/07 §2): o banco
roda isto contra a própria implementação **antes** de pedir homologação.

```bash
npx atlas-sdk verify https://api.bancox.com.br/atlas/v1 \
  --segredo "$ATLAS_SIGNING_SECRET" \
  --chave-publica ./chave-publica.pem   # opcional — verifica a assinatura das ofertas
```

Checa, contra a implementação de verdade (nenhum mock): `/saude` responde
`sdk_version`; `/ofertas` com assinatura válida devolve `200` conforme o
schema; ofertas vêm assinadas (quando `--chave-publica` é passada); assinatura
inválida vira `401`; timestamp fora da janela de 5 min vira `401`; corpo fora
do schema vira `4xx` (nunca `500`); `/contratacoes` e `/eventos` respondem.
Reporta a `sdk_version` em que o banco está conforme (docs/07 §8). Segredo
default: env `ATLAS_SIGNING_SECRET`.

`npx atlas-sdk sign <chave-privada.pem> <oferta.json>` assina uma oferta na
mão, para inspecionar o que o plugin calcula por baixo.

## 4. `@atlas/averbacao-sdk/testing` — testar sem subir a Atlas

```ts
import { fakeBank, criarChavesEd25519, gerarOfertasRequestExemplo, chamarOfertas, runVerify } from "@atlas/averbacao-sdk/testing";

const chaves = criarChavesEd25519();
const app = await fakeBank({
  segredo: "segredo-de-teste",
  async ofertas(req) { /* implementação do banco sob teste */ return { ofertas: [] }; },
});
await app.listen({ port: 0, host: "127.0.0.1" });

// Simula a chamada que a Atlas faz de verdade (HTTP real, mesma assinatura do BankClient):
const { status, body } = await chamarOfertas(`http://127.0.0.1:${app.server.address().port}`, "segredo-de-teste", gerarOfertasRequestExemplo());

// Ou roda a própria bateria `verify` programaticamente, no CI do banco:
const resultado = await runVerify(`http://127.0.0.1:${app.server.address().port}`, { segredo: "segredo-de-teste" });
```

`fakeBank` sobe um Fastify real (não é mock de `fetch`) com os handlers do
banco atrás do mesmo plugin de produção — é o mesmo helper usado nos testes
deste repositório para provar que dois bancos com código completamente
diferente integram sem nenhuma linha específica do lado da Atlas (ver
`src/shared/bancos/sdk-conformidade.spec.ts` no core).

## 5. `npx atlas-sdk simulate` — diagnóstico durante o desenvolvimento

`verify` responde "sua implementação está conforme?" (8 checagens binárias,
pensadas para CI). `simulate` responde uma pergunta diferente: **"o que a
Atlas vai te mandar, e o que você respondeu?"** — dispara uma chamada real de
`/ofertas` com os parâmetros que você quiser (valor desejado, prazo, margem,
convênio) e mostra request e response lado a lado, com as divergências
encontradas.

```bash
npx atlas-sdk simulate http://localhost:4100 \
  --segredo "$ATLAS_SIGNING_SECRET" \
  --chave-publica ./chave-publica.pem \
  --margem-disponivel 500 --convenio-prazo-maximo 84 --convenio-taxa-teto 0.021 \
  --prazo-desejado 60 --valor-desejado 15000
```

Cada oferta devolvida é checada contra as regras de docs/07 §4 (regra 1) —
`valor_parcela <= margem.disponivel`, `prazo_meses <= convenio.prazo_maximo_meses`,
`taxa_am <= convenio.taxa_teto_am` — e sinalizada como **aviso** quando fora
do teto (a Atlas descartaria essa oferta em produção), nunca corrigida ou
recalculada aqui (ADR-01). Schema inválido ou assinatura que não bate com a
chave pública informada viram **erro**. Diferente de `verify`, nunca falha
"porque o banco recusou crédito" — só por erro de transporte (rede, timeout).
Ver `packages/averbacao-sdk/src/simulate.ts` para a decisão de desenho
completa.

## 6. `npx atlas-sdk openapi` — a especificação, gerada do código

```bash
npx atlas-sdk openapi --out openapi.json      # ou sem --out: imprime no stdout
```

Gera o documento OpenAPI 3.0 de `/ofertas`, `/contratacoes`, `/eventos` e
`/saude` **a partir dos mesmos schemas Zod** que `atlasAverbacao` valida em
runtime (`zod-to-json-schema`, mesmo precedente de
`src/shared/openapi/zod-api-body.ts` no core) — não é um YAML escrito à mão
que diverge do código na próxima mudança de contrato; rode o comando de novo
depois de qualquer alteração de schema. Nada é versionado estático no
repositório por causa disso: o comando *é* a fonte de verdade executável.
`gerarOpenApiSpec`/`validarOpenApiDocument` também estão disponíveis via
`@atlas/averbacao-sdk/openapi` para quem quiser embutir a geração num
pipeline de docs.

## 7. Sandbox — integrar sem dado real

`scripts/seed-dev.cjs --sandbox` (na raiz do monorepo) popula a base
sintética — prefeitura, convênio com tetos, servidores com matrícula, CPF
sempre cifrado — e aponta o "Banco Sandbox" já seedado para uma implementação
de referência. Não é um segundo seed: é a mesma base que o seed de
desenvolvimento sempre gerou, com um passo a mais no fim.

```bash
node scripts/seed-dev.cjs --sandbox     # ou: npm run sandbox:seed
node scripts/sandbox-banco-referencia.mjs   # ou: npm run sandbox:banco
```

O segundo comando sobe um banco de mentira de verdade (Fastify real, atrás
do mesmo `atlasAverbacao` de produção) escutando em `http://127.0.0.1:4100`,
com um motor de crédito determinístico só para exercitar o fluxo. Depois de
subir, `npx atlas-sdk verify`/`simulate` contra essa URL fecham o ciclo
ponta a ponta sem tocar em dado real — ver `scripts/sandbox-banco-referencia.mjs`
para os detalhes.

## 8. Onboarding — do zero à produção

| Passo | Quem | O quê |
|---|---|---|
| 1 | Banco | `npm i @atlas/averbacao-sdk`, implementa `ofertas()` e os callbacks |
| 2 | Banco | `npx atlas-sdk verify https://api.bancox.com.br/atlas/v1` |
| 3 | Atlas | Cadastra `base_url`, gera o segredo HMAC, recebe a chave pública, `integracao_estado = 'sandbox'` |
| 4 | Atlas | Bateria contra o sandbox nosso; passou → `homologacao` |
| 5 | Atlas | `integracao_estado = 'produtiva'` |

Nenhum passo envolve escrever ou fazer deploy de código nosso — ver
docs/07 §1.2, "o banco 21 custa o mesmo que o banco 2".

## 9. Versionamento

`Atlas-SDK-Version` vai em toda chamada. Campo novo opcional na resposta é
compatível; remover campo ou apertar validação é versão nova, com duas
versões maiores suportadas por no mínimo 6 meses (docs/07 §8).
