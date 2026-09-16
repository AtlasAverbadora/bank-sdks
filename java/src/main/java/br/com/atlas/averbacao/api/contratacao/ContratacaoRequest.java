package br.com.atlas.averbacao.api.contratacao;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ContratacaoRequest(
    @NotNull UUID correlacaoId,
    @NotNull UUID ofertaId,
    UUID contratoId
) {}
