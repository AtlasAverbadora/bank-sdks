package br.com.atlas.averbacao.api.contrato;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ContratoAverbadoRequest(
    @NotNull UUID contratoId,
    String adf,
    @NotBlank String averbadoEm
) {}
