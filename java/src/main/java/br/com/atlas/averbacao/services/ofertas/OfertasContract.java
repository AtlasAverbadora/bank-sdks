package br.com.atlas.averbacao.services.ofertas;

import br.com.atlas.averbacao.api.ofertas.OfertasRequest;
import br.com.atlas.averbacao.api.ofertas.OfertasResponse;

public interface OfertasContract {
    OfertasResponse gerar(OfertasRequest request);
}
