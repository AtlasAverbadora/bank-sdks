package br.com.atlas.averbacao.services.contrato;

import br.com.atlas.averbacao.api.contrato.ContratoAverbadoRequest;

public interface ContratoContract {
    void averbado(ContratoAverbadoRequest request);
}
