using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Atlas.Averbacao.Security;

public sealed record Integracao(string BancoId, string Keyid, string AtlasPublicKey, string Ambiente);

public static class Pairing
{
    public static async Task<Integracao> PairAsync(
        string atlasUrl,
        string token,
        string publicBaseUrl,
        string publicKey,
        string keyid,
        HttpClient? http = null)
    {
        var client = http ?? new HttpClient();
        var url = $"{atlasUrl.TrimEnd('/')}/v1/integracao/parear";
        using var req = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(new PairBody(publicKey, publicBaseUrl, keyid)),
        };
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {token}");
        var res = await client.SendAsync(req);
        var corpo = await res.Content.ReadAsStringAsync();
        if (!res.IsSuccessStatusCode)
            throw new InvalidOperationException($"pareamento falhou: HTTP {(int)res.StatusCode} {corpo}".Trim());
        var body = System.Text.Json.JsonSerializer.Deserialize<PairResponse>(corpo, Json.Options)
            ?? throw new InvalidOperationException("pareamento: resposta inválida");
        if (string.IsNullOrWhiteSpace(body.AtlasPublicKey))
            throw new InvalidOperationException("pareamento: resposta sem atlas_public_key");
        return new Integracao(
            body.BancoId ?? "",
            string.IsNullOrWhiteSpace(body.Keyid) ? keyid : body.Keyid!,
            body.AtlasPublicKey,
            body.Ambiente ?? "");
    }

    public static string IntegracaoPath(string dataDir) => Path.Combine(dataDir, "integracao.json");

    public static Identity? Load(string dataDir, BancoKeys keys)
    {
        try
        {
            var raw = File.ReadAllText(IntegracaoPath(dataDir));
            var integ = System.Text.Json.JsonSerializer.Deserialize<Integracao>(raw, Json.Options);
            if (integ is null || string.IsNullOrWhiteSpace(integ.AtlasPublicKey)) return null;
            return From(keys, integ);
        }
        catch
        {
            return null;
        }
    }

    public static void Save(string dataDir, Integracao integracao)
    {
        Directory.CreateDirectory(dataDir);
        File.WriteAllText(IntegracaoPath(dataDir), System.Text.Json.JsonSerializer.Serialize(integracao, Json.Options) + "\n");
    }

    public static Identity From(BancoKeys keys, Integracao integracao) => new(
        integracao.AtlasPublicKey,
        keys.PrivateKey,
        keys.PublicKey,
        integracao.BancoId,
        string.IsNullOrWhiteSpace(integracao.Keyid) ? keys.Keyid : integracao.Keyid);

    private sealed record PairBody(
        [property: JsonPropertyName("public_key")] string PublicKey,
        [property: JsonPropertyName("base_url")] string BaseUrl,
        [property: JsonPropertyName("keyid")] string Keyid);

    private sealed class PairResponse
    {
        [JsonPropertyName("banco_id")]
        public string? BancoId { get; set; }
        [JsonPropertyName("atlas_public_key")]
        public string? AtlasPublicKey { get; set; }
        [JsonPropertyName("ambiente")]
        public string? Ambiente { get; set; }
        [JsonPropertyName("keyid")]
        public string? Keyid { get; set; }
    }
}
