import type { FastifyInstance } from "fastify"
import { SaudeResponseSchema } from "./saude.dto.js"

export function registrarSaude(app: FastifyInstance): void {
  app.get(
    "/v1/saude",
    {
      schema: {
        tags: ["saude"],
        summary: "Saúde do processo — sem autenticação",
        response: { 200: SaudeResponseSchema },
      },
    },
    async () => ({ ok: true as const, versao: 1 as const }),
  )
}
