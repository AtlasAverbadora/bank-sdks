import type { OfertasRequest, OfertasResponse } from "../../api/ofertas/ofertas.dto.js"

/** Contrato do motor de crédito — implementado em `ofertas.service.ts`. */
export interface OfertasContract {
  gerar(request: OfertasRequest): Promise<OfertasResponse> | OfertasResponse
}
