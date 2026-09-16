import type { ContratacaoRequest } from "../../api/contratacao/contratacao.dto.js"

/** Implementado em `contratacao.service.ts`. */
export interface ContratacaoContract {
  iniciada(request: ContratacaoRequest): Promise<void> | void
}
