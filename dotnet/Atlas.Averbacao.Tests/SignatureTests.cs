using Atlas.Averbacao.Security;

namespace Atlas.Averbacao.Tests;

public class SignatureTests
{
    [Fact]
    public void Assina_e_verifica()
    {
        var atlas = KeyStore.Generate();
        var body = """{"ping":true}""";
        var headers = HttpSignatures.SignRequest("POST", "/v1/ofertas", body, "atlas", Guid.NewGuid().ToString(), atlas.PrivateKey);
        HttpSignatures.VerifyRequest("POST", "/v1/ofertas", body, headers, atlas.PublicKey, new ReplayCache());
    }

    [Fact]
    public void Rejeita_outra_chave()
    {
        var atlas = KeyStore.Generate();
        var outro = KeyStore.Generate();
        var body = """{"ping":true}""";
        var headers = HttpSignatures.SignRequest("POST", "/v1/ofertas", body, "atlas", Guid.NewGuid().ToString(), outro.PrivateKey);
        Assert.Throws<Atlas.Averbacao.Api.UnauthorizedProblem>(() =>
            HttpSignatures.VerifyRequest("POST", "/v1/ofertas", body, headers, atlas.PublicKey, new ReplayCache()));
    }

    [Fact]
    public void Rejeita_nonce_reutilizado()
    {
        var atlas = KeyStore.Generate();
        var body = """{"ping":true}""";
        var replay = new ReplayCache();
        var headers = HttpSignatures.SignRequest("POST", "/v1/ofertas", body, "atlas", Guid.NewGuid().ToString(), atlas.PrivateKey);
        HttpSignatures.VerifyRequest("POST", "/v1/ofertas", body, headers, atlas.PublicKey, replay);
        Assert.Throws<Atlas.Averbacao.Api.UnauthorizedProblem>(() =>
            HttpSignatures.VerifyRequest("POST", "/v1/ofertas", body, headers, atlas.PublicKey, replay));
    }
}
