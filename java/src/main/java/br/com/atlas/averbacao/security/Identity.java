package br.com.atlas.averbacao.security;

public record Identity(
    String atlasPublicKey,
    String bancoPrivateKey,
    String bancoPublicKey,
    String bancoId,
    String keyid
) {}
