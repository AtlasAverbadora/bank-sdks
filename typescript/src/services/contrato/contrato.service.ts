import type { ContratoAverbadoRequest } from "../../api/contrato/contrato.dto.js"
import type { ContratoContract } from "./contrato.contract.js"

/**
 * O contrato entrou na folha. Use `request.contrato_id` (e `adf`, se vier)
 * para marcar o empréstimo como averbado no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
export class ContratoService implements ContratoContract {
  async averbado(request: ContratoAverbadoRequest): Promise<void> {
    // await suaApi.marcarAverbado(request.contrato_id)
    void request
  }
}
