package br.com.atlas.averbacao.security;

import br.com.atlas.averbacao.api.UnauthorizedProblem;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SignatureTest {
    @Test
    void assinaEVerifica() {
        BancoKeys atlas = KeyStore.generate();
        String body = "{\"ping\":true}";
        var headers = HttpSignatures.signRequest("POST", "/v1/ofertas", body, "atlas", KeyStore.newNonce(), atlas.privateKey());
        assertDoesNotThrow(() -> HttpSignatures.verifyRequest("POST", "/v1/ofertas", body, headers, atlas.publicKey(), new ReplayCache()));
    }

    @Test
    void rejeitaOutraChave() {
        BancoKeys atlas = KeyStore.generate();
        BancoKeys outro = KeyStore.generate();
        String body = "{\"ping\":true}";
        var headers = HttpSignatures.signRequest("POST", "/v1/ofertas", body, "atlas", KeyStore.newNonce(), outro.privateKey());
        assertThrows(UnauthorizedProblem.class, () ->
            HttpSignatures.verifyRequest("POST", "/v1/ofertas", body, headers, atlas.publicKey(), new ReplayCache()));
    }

    @Test
    void rejeitaNonceReutilizado() {
        BancoKeys atlas = KeyStore.generate();
        String body = "{\"ping\":true}";
        ReplayCache replay = new ReplayCache();
        var headers = HttpSignatures.signRequest("POST", "/v1/ofertas", body, "atlas", KeyStore.newNonce(), atlas.privateKey());
        HttpSignatures.verifyRequest("POST", "/v1/ofertas", body, headers, atlas.publicKey(), replay);
        assertThrows(UnauthorizedProblem.class, () ->
            HttpSignatures.verifyRequest("POST", "/v1/ofertas", body, headers, atlas.publicKey(), replay));
    }
}
