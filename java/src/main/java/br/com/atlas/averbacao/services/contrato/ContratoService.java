package br.com.atlas.averbacao.services.contrato;

import br.com.atlas.averbacao.api.contrato.ContratoAverbadoRequest;
import org.springframework.stereotype.Service;

/**
 * O contrato entrou na folha. Use request.contratoId() (e adf, se vier)
 * para marcar o empréstimo como averbado no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
@Service
public class ContratoService implements ContratoContract {
    @Override
    public void averbado(ContratoAverbadoRequest request) {
        // suaApi.marcarAverbado(request.contratoId());
    }
}
