import { z } from "zod";

export const SaudeResponseSchema = z.object({
  ok: z.boolean(),
  sdk_version: z.number().int().positive(),
});
export type SaudeResponseDto = z.infer<typeof SaudeResponseSchema>;
/** @deprecated use SaudeResponseDto */
export type SaudeResponse = SaudeResponseDto;
