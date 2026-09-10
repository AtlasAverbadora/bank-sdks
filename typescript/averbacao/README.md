# @atlas/averbacao-sdk

O banco implementa `AverbacaoService`. O SDK registra o controller, valida os DTOs, checa HMAC e assina ofertas.

## Integração Fastify

```ts
import Fastify from "fastify";
import { atlasAverbacao } from "@atlas/averbacao-sdk/fastify";
import type { AverbacaoService, OfertasRequestDto, OfertasResponseDto } from "@atlas/averbacao-sdk";

class BancoCreditoService implements AverbacaoService {
  async ofertas(req: OfertasRequestDto): Promise<OfertasResponseDto> {
    const analise = await motorDeCredito.avaliar(req.servidor.cpf, req.margem.disponivel);
    if (!analise.aprovado) return { ofertas: [] };
    return {
      validade_segundos: 300,
      ofertas: analise.opcoes.map((o) => ({
        referencia_banco: o.id,
        valor_financiado: o.principal,
        valor_liquido: o.liquido,
        valor_parcela: o.parcela,
        prazo_meses: o.prazo,
        taxa_am: o.taxa,
        cet_am: o.cet,
        valor_iof: o.iof,
      })),
    };
  }

  async contratacaoIniciada() { /* a oferta virou contrato */ }
  async contratoAverbado() { /* averbou na folha */ }
  async adfLiberada() { /* Modo Ataque */ }
  async retencaoOportunidade() { /* Modo Defesa */ }
}

const app = Fastify();
await app.register(atlasAverbacao, {
  service: new BancoCreditoService(),
  segredo: process.env.ATLAS_SIGNING_SECRET!,
  chavePrivada: process.env.BANCO_PRIVATE_KEY,
  versao: 1,
});
await app.listen({ port: 3000 });
```

O plugin registra `POST /ofertas`, `POST /contratacoes`, `POST /eventos` e `GET /saude`. Não registre essas rotas de novo.

O service é a única peça do banco. Controller, DTOs, validação Zod, HMAC (`Atlas-Signature`, janela de 5 min) e `Atlas-SDK-Version` ficam no SDK.

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
  service: {
    async ofertas() {
      return { ofertas: [] };
    },
  },
});
```
