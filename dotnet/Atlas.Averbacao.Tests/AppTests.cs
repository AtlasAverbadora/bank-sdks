using Atlas.Averbacao.Api.Ofertas;
using Atlas.Averbacao.Security;
using Atlas.Averbacao.Services.Ofertas;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Atlas.Averbacao.Tests;

public class AppTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AppTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Saude_sem_assinatura()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/v1/saude");
        Assert.Equal(System.Net.HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        Assert.Contains("\"ok\":true", json.Replace(" ", ""));
    }

    [Fact]
    public async Task Ofertas_sem_pareamento_401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsync("/v1/ofertas", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Ofertas_stub_501()
    {
        var atlas = KeyStore.Generate();
        var banco = KeyStore.Generate();
        var factory = _factory.WithWebHostBuilder(_ => { });
        var client = factory.CreateClient();
        factory.Services.GetRequiredService<IdentityState>().Current = new Identity(
            atlas.PublicKey, banco.PrivateKey, banco.PublicKey, "42", banco.Keyid);

        var body = OfertasJson();
        var headers = HttpSignatures.SignRequest("POST", "/v1/ofertas", body, "atlas", Guid.NewGuid().ToString(), atlas.PrivateKey);
        using var req = new HttpRequestMessage(HttpMethod.Post, "/v1/ofertas") { Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json") };
        foreach (var h in headers)
            if (h.Key is not "content-type") req.Headers.TryAddWithoutValidation(h.Key, h.Value);
        var res = await client.SendAsync(req);
        Assert.Equal(System.Net.HttpStatusCode.NotImplemented, res.StatusCode);
    }

    [Fact]
    public async Task Ofertas_implementado_assina_jws()
    {
        var atlas = KeyStore.Generate();
        var banco = KeyStore.Generate();
        var factory = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureTestServices(s => s.AddSingleton<IOfertasService, OfertasFake>());
        });
        var client = factory.CreateClient();
        factory.Services.GetRequiredService<IdentityState>().Current = new Identity(
            atlas.PublicKey, banco.PrivateKey, banco.PublicKey, "42", banco.Keyid);

        var body = OfertasJson();
        var headers = HttpSignatures.SignRequest("POST", "/v1/ofertas", body, "atlas", Guid.NewGuid().ToString(), atlas.PrivateKey);
        using var req = new HttpRequestMessage(HttpMethod.Post, "/v1/ofertas") { Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json") };
        foreach (var h in headers)
            if (h.Key is not "content-type") req.Headers.TryAddWithoutValidation(h.Key, h.Value);
        var res = await client.SendAsync(req);
        Assert.Equal(System.Net.HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        Assert.Contains("\"jws\":", json);
    }

    private static string OfertasJson() => """
        {"correlacao_id":"0192f3e1-0000-7000-8000-000000000001","convenio":{"id":12,"codigo":"CONV-1","prazo_maximo_meses":96,"taxa_teto_am":0.021},"servidor":{"cpf":"12345678901","matricula":"0001","vinculo":"ESTATUTARIO","situacao_funcional":"ATIVO"},"margem":{"tipo":"EMPRESTIMO","disponivel":800,"total":1700},"solicitacao":{"valor_desejado":null,"prazo_desejado":null}}
        """;
}

file sealed class OfertasFake : IOfertasService
{
    public Task<OfertasResponse> Gerar(OfertasRequest request) => Task.FromResult(new OfertasResponse
    {
        ValidadeSegundos = 300,
        Ofertas =
        [
            new Oferta
            {
                ReferenciaBanco = "X-1",
                ValorFinanciado = 10000,
                ValorLiquido = 9800,
                ValorParcela = 400,
                PrazoMeses = 24,
                TaxaAm = 0.017,
                CetAm = 0.018,
            },
        ],
    });
}
