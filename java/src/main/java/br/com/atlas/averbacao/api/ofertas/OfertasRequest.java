package br.com.atlas.averbacao.api.ofertas;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record OfertasRequest(
    @NotNull UUID correlacaoId,
    @NotNull @Valid Convenio convenio,
    @NotNull @Valid Servidor servidor,
    @NotNull @Valid Margem margem,
    @NotNull @Valid Solicitacao solicitacao
) {
    public record Convenio(int id, @NotBlank String codigo, int prazoMaximoMeses, double taxaTetoAm) {}
    public record Servidor(
        @NotBlank @Pattern(regexp = "^\\d{11}$") String cpf,
        @NotBlank String matricula,
        @NotBlank String vinculo,
        @NotBlank String situacaoFuncional,
        String dataAdmissao,
        String dataNascimento
    ) {}
    public record Margem(@NotBlank String tipo, double disponivel, double total) {}
    public record Solicitacao(Double valorDesejado, Integer prazoDesejado) {}
}
