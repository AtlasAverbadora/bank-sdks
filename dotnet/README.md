# Integração Atlas (.NET)

A Atlas chama sempre as mesmas rotas deste processo. A API de vocês
continua de vocês: ligue ela só em `Atlas.Averbacao/Services/`.

Modo Ataque **não passa por aqui**. Você chama a Atlas
(`reservas-compostas`). Este processo só recebe: ofertas, contratação,
contrato averbado e retenção (Modo Defesa).

## Subir

```bash
cd dotnet
cp .env.example .env
dotnet run --project Atlas.Averbacao
```

Docs: `http://localhost:3000/docs`  
Saúde: `http://localhost:3000/v1/saude`

Primeira subida gera o par Ed25519 em `data/` e pareia com a Atlas.
Sem token, o processo sobe: `/docs` e `/v1/saude` no ar, o resto 401.

## O que você implementa

| Arquivo | Quando |
|---|---|
| `Services/Ofertas/OfertasService.cs` | sempre — motor de crédito |
| `Services/Contratacao/ContratacaoService.cs` | se consome a escolha da oferta |
| `Services/Contrato/ContratoService.cs` | se trata averbação na folha |
| `Services/Retencao/RetencaoService.cs` | Modo Defesa |

Comece por `OfertasService` — lança 501 até você ligar o motor.
Recusa de crédito: lista `ofertas` vazia, nunca erro HTTP.

Não altere `Api/` nem `Security/`.

```bash
dotnet test
```
