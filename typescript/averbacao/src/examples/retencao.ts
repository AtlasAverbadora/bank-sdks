import type { RetencaoService } from "../core/services.js";

/** Copie se o banco tem Modo Defesa. Sem retenção, não ligue este service. */
export class RetencaoExampleImplementation implements RetencaoService {
  async oportunidadeAberta(_payload: unknown): Promise<void> {}
}
