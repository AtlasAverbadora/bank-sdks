# Atlas SDKs

Adaptador que os bancos (ou a Atlas) sobem para a Atlas falar **sempre as
mesmas rotas**. Cada banco só implementa `services/`, chamando a API dele.

Modo Ataque não entra aqui: o banco chama a Atlas. Pendências do backend:
[`PENDENTE-BACKEND.md`](./PENDENTE-BACKEND.md). Plano:
[`PLANO.md`](./PLANO.md).

| Pasta | Linguagem | Estado |
|---|---|---|
| `typescript/` | TypeScript (Fastify) | adaptador |
| `dotnet/` | .NET | em breve |
| `java/` | Java | em breve |

Guia: `typescript/README.md`.
