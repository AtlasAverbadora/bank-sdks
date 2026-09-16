using System.Text.Json.Serialization;
using Atlas.Averbacao.Api;
using Atlas.Averbacao.Security;
using Atlas.Averbacao.Services.Contratacao;
using Atlas.Averbacao.Services.Contrato;
using Atlas.Averbacao.Services.Ofertas;
using Atlas.Averbacao.Services.Retencao;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    o.SerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    })
    .ConfigureApiBehaviorOptions(o =>
    {
        o.InvalidModelStateResponseFactory = ctx => new JsonResult(new
        {
            type = "about:blank",
            title = "Bad Request",
            status = 400,
            detail = "corpo fora do schema",
        })
        { StatusCode = 400, ContentType = "application/problem+json" };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Integração Atlas",
        Version = "1",
        Description = "Implemente apenas Services/. Rotas, validação e assinatura já estão prontas.",
    });
});

builder.Services.AddSingleton<ReplayCache>();
builder.Services.AddSingleton<IdentityState>();
builder.Services.AddSingleton<IOfertasService, OfertasService>();
builder.Services.AddSingleton<IContratacaoService, ContratacaoService>();
builder.Services.AddSingleton<IContratoService, ContratoService>();
builder.Services.AddSingleton<IRetencaoService, RetencaoService>();
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddProblemDetails();

if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    var listenPort = Environment.GetEnvironmentVariable("PORT") ?? "3000";
    builder.WebHost.UseUrls($"http://0.0.0.0:{listenPort}");
}

var app = builder.Build();

var dataDir = Environment.GetEnvironmentVariable("ATLAS_DATA_DIR")
    ?? Path.Combine(Directory.GetCurrentDirectory(), "data");
var keys = KeyStore.LoadOrCreate(dataDir);
var identityState = app.Services.GetRequiredService<IdentityState>();
identityState.Current = Pairing.Load(dataDir, keys);

var atlasUrl = EmptyToNull(Environment.GetEnvironmentVariable("ATLAS_URL"));
var token = EmptyToNull(Environment.GetEnvironmentVariable("ATLAS_PAIRING_TOKEN"));
var publicBaseUrl = EmptyToNull(Environment.GetEnvironmentVariable("PUBLIC_BASE_URL"));

if (identityState.Current is null && atlasUrl is not null && token is not null && publicBaseUrl is not null)
{
    try
    {
        var integracao = await Pairing.PairAsync(atlasUrl, token, publicBaseUrl, keys.PublicKey, keys.Keyid);
        Pairing.Save(dataDir, integracao);
        identityState.Current = Pairing.From(keys, integracao);
        Console.WriteLine($"Pareado. banco_id={integracao.BancoId} ambiente={integracao.Ambiente}");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine(ex.Message);
    }
}

if (identityState.Current is null)
    Console.WriteLine("Sem pareamento: /docs e /v1/saude sobem; rotas autenticadas retornam 401.");

app.UseExceptionHandler();
app.UseSwagger(c => c.RouteTemplate = "docs/{documentName}/swagger.json");
app.UseSwaggerUI(c =>
{
    c.RoutePrefix = "docs";
    c.SwaggerEndpoint("v1/swagger.json", "Integração Atlas");
});
app.UseMiddleware<AtlasAuthMiddleware>();
app.MapControllers();

Console.WriteLine($"Adaptador no ar. Docs: /docs  Saúde: /v1/saude");
app.Run();

static string? EmptyToNull(string? value)
{
    var t = value?.Trim();
    return string.IsNullOrEmpty(t) ? null : t;
}

public sealed class ProblemExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var result = ProblemHandler.From(exception);
        await result.ExecuteAsync(httpContext);
        return true;
    }
}

public partial class Program;
