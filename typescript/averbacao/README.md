# @atlas/averbacao-sdk

O banco copia os examples que precisa e liga no plugin. SDK valida DTO, HMAC e assina ofertas.

Banco sem retenção **não implementa** aquele service e **não passa** no `register`.

Modo Ataque **não é callback**. O banco chama `POST /v1/reservas-compostas` na Atlas, já com a ADF que ele sabe que vai liberar. `adf.liberada` fica no backend (fila) e captura a margem — não chega neste SDK.

## Integração Fastify

Os esqueletos estão em `@atlas/averbacao-sdk/examples`. Copie para o código do banco e troque o corpo.

```ts
import Fastify from "fastify";
import { atlasAverbacao } from "@atlas/averbacao-sdk/fastify";
import { OfertasExampleImplementation } from "@atlas/averbacao-sdk/examples";
import { RetencaoExampleImplementation } from "@atlas/averbacao-sdk/examples";
// Sem Modo Defesa? Não importe RetencaoExampleImplementation.

const app = Fastify();
await app.register(atlasAverbacao, {
  ofertas: new OfertasExampleImplementation(),
  retencao: new RetencaoExampleImplementation(),
  segredo: process.env.ATLAS_SIGNING_SECRET!,
  chavePrivada: process.env.BANCO_PRIVATE_KEY,
  versao: 1,
});
await app.listen({ port: 3000 });
```

| Example | Quando copiar |
|---|---|
| `OfertasExampleImplementation` | sempre (motor de crédito) |
| `ContratacaoExampleImplementation` | consome `POST /contratacoes` |
| `ContratoExampleImplementation` | trata `contrato.averbado` |
| `RetencaoExampleImplementation` | tem Modo Defesa |

O plugin registra `POST /ofertas`, `POST /contratacoes`, `POST /eventos` e `GET /saude`. Não registre essas rotas de novo.

Outro HTTP stack: `criarAverbacaoRuntime` em `@atlas/averbacao-sdk/http`.

Recusa de crédito = `200` com `ofertas: []`, nunca erro HTTP.

## CLI

```bash
npx atlas-sdk verify https://api.bancox.com.br/atlas/v1 \
  --segredo "$ATLAS_SIGNING_SECRET" \
  --chave-publica ./chave-publica.pem

npx atlas-sdk simulate http://localhost:4100 \
  --segredo "$ATLAS_SIGNING_SECRET" \
  --margem-disponivel 500

npx atlas-sdk openapi --out openapi.json
npx atlas-sdk sign <chave-privada.pem> <oferta.json>
```

## Testes

```ts
import { fakeBank, criarChavesEd25519, gerarOfertasRequestExemplo, chamarOfertas, runVerify } from "@atlas/averbacao-sdk/testing";

const app = await fakeBank({
  segredo: "segredo-de-teste",
  ofertas: {
    async gerar() {
      return { ofertas: [] };
    },
  },
});
```
