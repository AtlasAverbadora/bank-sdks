import { NotImplementedError } from "../../api/problem.js"
import type { OfertasRequest, OfertasResponse } from "../../api/ofertas/ofertas.dto.js"
import type { OfertasContract } from "./ofertas.contract.js"

/**
 * Motor de crédito. Sem este método a integração não homologa.
 *
 * Use `request` (CPF, matrícula, margem, tetos do convênio) para consultar
 * o seu sistema. Devolva as parcelas que cabem na margem e nos tetos.
 * Sem oferta: `{ ofertas: [] }` — nunca lance erro por recusa de crédito.
 * Não preencha `jws`; o adaptador assina.
 */
export class OfertasService implements OfertasContract {
  async gerar(request: OfertasRequest): Promise<OfertasResponse> {
    // const simulacao = await suaApi.simular(request.servidor.cpf, request.margem.disponivel)
    // if (!simulacao.aprovado) return { validade_segundos: 300, ofertas: [] }
    // return { validade_segundos: 300, ofertas: simulacao.opcoes.map(...) }
    void request
    throw new NotImplementedError("ofertas.gerar")
  }
}
