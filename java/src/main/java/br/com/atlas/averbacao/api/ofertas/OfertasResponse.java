package br.com.atlas.averbacao.api.ofertas;

import java.util.ArrayList;
import java.util.List;

public record OfertasResponse(Integer validadeSegundos, List<Oferta> ofertas) {
    public OfertasResponse {
        if (validadeSegundos == null) validadeSegundos = 300;
        if (ofertas == null) ofertas = new ArrayList<>();
    }
}
