import type { ContratacaoRequest } from "../../api/contratacao/contratacao.dto.js"
import type { ContratacaoContract } from "./contratacao.contract.js"

/**
 * O servidor escolheu uma oferta sua. Use `request.oferta_id` e
 * `request.correlacao_id` para reservar/confirmar no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
export class ContratacaoService implements ContratacaoContract {
  async iniciada(request: ContratacaoRequest): Promise<void> {
    // await suaApi.confirmarProposta(request.oferta_id)
    void request
  }
}
