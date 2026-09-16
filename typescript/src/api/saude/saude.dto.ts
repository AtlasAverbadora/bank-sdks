import { z } from "zod"

export const SaudeResponseSchema = z.object({
  ok: z.literal(true),
  versao: z.literal(1),
})
export type SaudeResponse = z.infer<typeof SaudeResponseSchema>
