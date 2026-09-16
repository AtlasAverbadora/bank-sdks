using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Atlas.Averbacao.Api;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.Crypto.Signers;

namespace Atlas.Averbacao.Security;

public static class HttpSignatures
{
    public const int ClockSkewSec = 30;

    public static string ContentDigest(string body)
    {
        var hash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(body)));
        return $"sha-256=:{hash}:";
    }

    public static string CanonicalContentType(string value) =>
        value.Split(';')[0].Trim().ToLowerInvariant();

    public static string SignatureParams(long created, string keyid, string nonce) =>
        $"(\"@method\" \"@path\" \"content-digest\" \"content-type\");created={created};keyid=\"{keyid}\";nonce=\"{nonce}\";alg=\"ed25519\"";

    public static string SignatureBase(string method, string path, string digest, string contentType, string @params) =>
        string.Join('\n',
            $"\"@method\": {method.ToUpperInvariant()}",
            $"\"@path\": {path}",
            $"\"content-digest\": {digest}",
            $"\"content-type\": {contentType}",
            $"\"@signature-params\": {@params}");

    public static Dictionary<string, string> SignRequest(
        string method,
        string path,
        string body,
        string keyid,
        string nonce,
        string privatePem,
        long? created = null,
        string? contentType = null)
    {
        var ct = CanonicalContentType(contentType ?? "application/json");
        var ts = created ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var digest = ContentDigest(body);
        var @params = SignatureParams(ts, keyid, nonce);
        var toSign = SignatureBase(method, path, digest, ct, @params);
        var sig = Convert.ToBase64String(SignEd25519(privatePem, Encoding.UTF8.GetBytes(toSign)));
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["content-type"] = ct,
            ["content-digest"] = digest,
            ["signature-input"] = $"sig1={@params}",
            ["signature"] = $"sig1=:{sig}:",
        };
    }

    public static void VerifyRequest(
        string method,
        string path,
        string body,
        IDictionary<string, string> headers,
        string publicPem,
        ReplayCache replay,
        long? nowSec = null)
    {
        string Header(string name) =>
            headers.TryGetValue(name, out var v) ? v : headers.TryGetValue(name.ToLowerInvariant(), out var v2) ? v2 : "";

        var parsed = ParseSignatureInput(Header("signature-input"))
            ?? throw new UnauthorizedProblem("Signature-Input ausente ou inválido");
        var signature = ParseSignature(Header("signature"))
            ?? throw new UnauthorizedProblem("Signature ausente ou inválida");

        var now = nowSec ?? DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        if (Math.Abs(now - parsed.Created) > ClockSkewSec)
            throw new UnauthorizedProblem("timestamp fora da janela");

        var expectedDigest = ContentDigest(body);
        if (Header("content-digest") != expectedDigest)
            throw new UnauthorizedProblem("Content-Digest não confere");

        var ct = CanonicalContentType(string.IsNullOrEmpty(Header("content-type")) ? "application/json" : Header("content-type"));
        var @params = SignatureParams(parsed.Created, parsed.Keyid, parsed.Nonce);
        var toSign = SignatureBase(method, path, expectedDigest, ct, @params);
        if (!VerifyEd25519(publicPem, Encoding.UTF8.GetBytes(toSign), Convert.FromBase64String(signature)))
            throw new UnauthorizedProblem("assinatura inválida");
        if (!replay.Claim(parsed.Nonce))
            throw new UnauthorizedProblem("nonce reutilizado");
    }

    public static string SignOfertaJws(string privatePem, object oferta)
    {
        var header = Base64Url(Encoding.UTF8.GetBytes("""{"alg":"EdDSA"}"""));
        var payload = Base64Url(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(oferta, Json.Options)));
        var signingInput = $"{header}.{payload}";
        var sig = Base64Url(SignEd25519(privatePem, Encoding.UTF8.GetBytes(signingInput)));
        return $"{signingInput}.{sig}";
    }

    public static bool VerifyOfertaJws(string publicPem, string jws, object oferta)
    {
        var parts = jws.Split('.');
        if (parts.Length != 3) return false;
        var signingInput = $"{parts[0]}.{parts[1]}";
        try
        {
            var parsedJson = Encoding.UTF8.GetString(FromBase64Url(parts[1]));
            var expected = JsonSerializer.Serialize(oferta, Json.Options);
            if (parsedJson != expected) return false;
            return VerifyEd25519(publicPem, Encoding.UTF8.GetBytes(signingInput), FromBase64Url(parts[2]));
        }
        catch
        {
            return false;
        }
    }

    public static byte[] SignEd25519(string privatePem, byte[] data)
    {
        var key = (Ed25519PrivateKeyParameters)KeyStore.ReadPrivate(privatePem);
        var signer = new Ed25519Signer();
        signer.Init(true, key);
        signer.BlockUpdate(data, 0, data.Length);
        return signer.GenerateSignature();
    }

    public static bool VerifyEd25519(string publicPem, byte[] data, byte[] signature)
    {
        var key = (Ed25519PublicKeyParameters)KeyStore.ReadPublic(publicPem);
        var verifier = new Ed25519Signer();
        verifier.Init(false, key);
        verifier.BlockUpdate(data, 0, data.Length);
        return verifier.VerifySignature(signature);
    }

    private static (long Created, string Keyid, string Nonce)? ParseSignatureInput(string header)
    {
        var match = Regex.Match(
            header.Trim(),
            "^sig1=\\(\"@method\" \"@path\" \"content-digest\" \"content-type\"\\);created=(\\d+);keyid=\"([^\"]+)\";nonce=\"([^\"]+)\";alg=\"ed25519\"$");
        if (!match.Success) return null;
        return (long.Parse(match.Groups[1].Value), match.Groups[2].Value, match.Groups[3].Value);
    }

    private static string? ParseSignature(string header)
    {
        var match = Regex.Match(header.Trim(), "^sig1=:([A-Za-z0-9+/]+=*):$");
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string Base64Url(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }
}
