# Atlas SDKs

SDKs para bancos conveniados integrarem com a Atlas.

O banco liga um service por domínio (ofertas, contratação, contrato, retenção). Rotas, DTOs, validação, HMAC e versionamento ficam no SDK. Modo Ataque é chamada do banco para a Atlas (`reservas-compostas`), não notificação neste SDK.

| Pasta | Linguagem | Pacote |
|---|---|---|
| `typescript/averbacao` | TypeScript (Fastify) | `@atlas/averbacao-sdk` |
| `dotnet/` | .NET | em breve |
| `java/` | Java | em breve |

Guia de integração: `typescript/averbacao/README.md`.
