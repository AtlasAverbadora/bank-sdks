package br.com.atlas.averbacao.api.contratacao;

public record OkResponse(boolean ok) {
    public OkResponse() { this(true); }
}
