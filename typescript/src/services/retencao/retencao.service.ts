import type { RetencaoOportunidadeRequest } from "../../api/retencao/retencao.dto.js"
import type { RetencaoContract } from "./retencao.contract.js"

/**
 * Modo Defesa: o servidor pode ser retido. Use `request.oportunidade_id`
 * e `request.expira_em` para disparar a sua campanha / contraoferta.
 *
 * Sem Modo Defesa, deixe o método como está.
 */
export class RetencaoService implements RetencaoContract {
  async oportunidadeAberta(request: RetencaoOportunidadeRequest): Promise<void> {
    // await suaApi.abrirRetencao(request.oportunidade_id, request.expira_em)
    void request
  }
}
