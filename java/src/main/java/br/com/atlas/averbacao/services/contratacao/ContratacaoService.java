package br.com.atlas.averbacao.services.contratacao;

import br.com.atlas.averbacao.api.contratacao.ContratacaoRequest;
import org.springframework.stereotype.Service;

/**
 * O servidor escolheu uma oferta sua. Use request.ofertaId() e
 * request.correlacaoId() para reservar/confirmar no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
@Service
public class ContratacaoService implements ContratacaoContract {
    @Override
    public void iniciada(ContratacaoRequest request) {
        // suaApi.confirmarProposta(request.ofertaId());
    }
}
