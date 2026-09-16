# Atlas SDKs

Adaptador que os bancos (ou a Atlas) sobem para a Atlas falar **sempre as
mesmas rotas**. Cada banco só implementa `services/`, chamando a API dele.

Modo Ataque não entra aqui: o banco chama a Atlas. Pendências do backend:
[`PENDENTE-BACKEND.md`](./PENDENTE-BACKEND.md). Plano:
[`PLANO.md`](./PLANO.md).

| Pasta | Linguagem |
|---|---|
| `typescript/` | TypeScript (Fastify) |
| `dotnet/` | .NET 8 (ASP.NET Core) |
| `java/` | Java 21 (Spring Boot) |

Mesmo contrato HTTP: `/v1/ofertas`, `/v1/contratacoes`,
`/v1/contratos/averbados`, `/v1/retencao/oportunidades`, `/v1/saude`.
Auth: pareamento Ed25519 + RFC 9421.

Guias: `typescript/README.md`, `dotnet/README.md`, `java/README.md`.
