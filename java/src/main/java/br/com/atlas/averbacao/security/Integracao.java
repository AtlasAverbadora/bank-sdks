package br.com.atlas.averbacao.security;

public record Integracao(String bancoId, String keyid, String atlasPublicKey, String ambiente) {}
