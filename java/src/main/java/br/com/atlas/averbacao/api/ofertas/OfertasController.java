package br.com.atlas.averbacao.api.ofertas;

import br.com.atlas.averbacao.security.HttpSignatures;
import br.com.atlas.averbacao.security.Identity;
import br.com.atlas.averbacao.security.IdentityState;
import br.com.atlas.averbacao.services.ofertas.OfertasContract;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OfertasController {
    private final OfertasContract ofertas;
    private final IdentityState identity;

    public OfertasController(OfertasContract ofertas, IdentityState identity) {
        this.ofertas = ofertas;
        this.identity = identity;
    }

    @Operation(summary = "Devolva ofertas de crédito para o servidor informado")
    @PostMapping("/v1/ofertas")
    public OfertasResponse post(@Valid @RequestBody OfertasRequest request) {
        OfertasResponse gerada = ofertas.gerar(request);
        Identity current = identity.current();
        if (current == null) return gerada;
        List<Oferta> signed = new ArrayList<>();
        for (Oferta oferta : gerada.ofertas()) {
            if (oferta.jws() != null && !oferta.jws().isBlank()) {
                signed.add(oferta);
                continue;
            }
            Oferta unsigned = oferta.unsigned();
            signed.add(unsigned.withJws(HttpSignatures.signOfertaJws(current.bancoPrivateKey(), unsigned)));
        }
        return new OfertasResponse(gerada.validadeSegundos(), signed);
    }
}
