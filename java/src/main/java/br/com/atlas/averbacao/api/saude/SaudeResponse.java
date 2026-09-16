package br.com.atlas.averbacao.api.saude;

public record SaudeResponse(boolean ok, int versao) {
    public SaudeResponse() { this(true, 1); }
}
