package br.com.atlas.averbacao.services.ofertas;

import br.com.atlas.averbacao.api.NotImplementedProblem;
import br.com.atlas.averbacao.api.ofertas.OfertasRequest;
import br.com.atlas.averbacao.api.ofertas.OfertasResponse;
import org.springframework.stereotype.Service;

/**
 * Motor de crédito. Sem este método a integração não homologa.
 *
 * Use request (CPF, matrícula, margem, tetos do convênio) para consultar
 * o seu sistema. Devolva as parcelas que cabem na margem e nos tetos.
 * Sem oferta: ofertas vazia — nunca lance erro por recusa de crédito.
 * Não preencha jws; o adaptador assina.
 */
@Service
public class OfertasService implements OfertasContract {
    @Override
    public OfertasResponse gerar(OfertasRequest request) {
        // var simulacao = suaApi.simular(request.servidor().cpf(), request.margem().disponivel());
        throw new NotImplementedProblem("ofertas.gerar");
    }
}
