package br.com.atlas.averbacao.services.retencao;

import br.com.atlas.averbacao.api.retencao.RetencaoOportunidadeRequest;
import org.springframework.stereotype.Service;

/**
 * Modo Defesa: o servidor pode ser retido. Use request.oportunidadeId()
 * e request.expiraEm() para disparar a sua campanha / contraoferta.
 *
 * Sem Modo Defesa, deixe o método como está.
 */
@Service
public class RetencaoService implements RetencaoContract {
    @Override
    public void oportunidadeAberta(RetencaoOportunidadeRequest request) {
        // suaApi.abrirRetencao(request.oportunidadeId(), request.expiraEm());
    }
}
