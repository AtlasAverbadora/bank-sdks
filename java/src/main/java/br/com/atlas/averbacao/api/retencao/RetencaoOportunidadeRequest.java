package br.com.atlas.averbacao.api.retencao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record RetencaoOportunidadeRequest(
    @NotNull UUID oportunidadeId,
    UUID contratoId,
    @NotBlank String matricula,
    @NotBlank String expiraEm
) {}
