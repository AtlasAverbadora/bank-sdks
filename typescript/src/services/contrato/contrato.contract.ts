import type { ContratoAverbadoRequest } from "../../api/contrato/contrato.dto.js"

/** Implementado em `contrato.service.ts`. */
export interface ContratoContract {
  averbado(request: ContratoAverbadoRequest): Promise<void> | void
}
