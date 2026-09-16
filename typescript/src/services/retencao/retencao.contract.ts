import type { RetencaoOportunidadeRequest } from "../../api/retencao/retencao.dto.js"

/** Implementado em `retencao.service.ts`. */
export interface RetencaoContract {
  oportunidadeAberta(request: RetencaoOportunidadeRequest): Promise<void> | void
}
