# Integração Atlas (Spring Boot)

A Atlas chama sempre as mesmas rotas deste processo. A API de vocês
continua de vocês: ligue ela só em `src/main/java/.../services/`.

Modo Ataque **não passa por aqui**. Você chama a Atlas
(`reservas-compostas`). Este processo só recebe: ofertas, contratação,
contrato averbado e retenção (Modo Defesa).

## Subir

```bash
cd java
cp .env.example .env
mvn spring-boot:run
```

Docs: `http://localhost:3000/docs`  
Saúde: `http://localhost:3000/v1/saude`

Primeira subida gera o par Ed25519 em `data/` e pareia com a Atlas.
Sem token, o processo sobe: `/docs` e `/v1/saude` no ar, o resto 401.

## O que você implementa

| Arquivo | Quando |
|---|---|
| `services/ofertas/OfertasService.java` | sempre — motor de crédito |
| `services/contratacao/ContratacaoService.java` | se consome a escolha da oferta |
| `services/contrato/ContratoService.java` | se trata averbação na folha |
| `services/retencao/RetencaoService.java` | Modo Defesa |

Comece por `OfertasService` — lança 501 até você ligar o motor.
Recusa de crédito: lista `ofertas` vazia, nunca erro HTTP.

Não altere `api/` nem `security/`.

```bash
mvn test
```
