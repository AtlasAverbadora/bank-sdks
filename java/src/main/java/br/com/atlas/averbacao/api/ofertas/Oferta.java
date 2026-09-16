package br.com.atlas.averbacao.api.ofertas;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record Oferta(
    @NotBlank String referenciaBanco,
    @Positive double valorFinanciado,
    @Positive double valorLiquido,
    @Positive double valorParcela,
    @Positive int prazoMeses,
    @Positive double taxaAm,
    double cetAm,
    Double valorIof,
    String jws
) {
    public Oferta unsigned() {
        return new Oferta(referenciaBanco, valorFinanciado, valorLiquido, valorParcela, prazoMeses, taxaAm, cetAm, valorIof, null);
    }

    public Oferta withJws(String signed) {
        return new Oferta(referenciaBanco, valorFinanciado, valorLiquido, valorParcela, prazoMeses, taxaAm, cetAm, valorIof, signed);
    }
}
