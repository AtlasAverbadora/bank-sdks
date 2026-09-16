using System.Security.Cryptography;
using System.Text;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Generators;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.OpenSsl;
using Org.BouncyCastle.Pkcs;
using Org.BouncyCastle.Security;
using Org.BouncyCastle.X509;

namespace Atlas.Averbacao.Security;

public sealed record BancoKeys(string PrivateKey, string PublicKey, string Keyid);

public sealed record Identity(
    string AtlasPublicKey,
    string BancoPrivateKey,
    string BancoPublicKey,
    string BancoId,
    string Keyid);

public static class KeyStore
{
    public static BancoKeys Generate()
    {
        var gen = new Ed25519KeyPairGenerator();
        gen.Init(new Ed25519KeyGenerationParameters(new SecureRandom()));
        var pair = gen.GenerateKeyPair();
        var privatePem = WritePem("PRIVATE KEY", PrivateKeyInfoFactory.CreatePrivateKeyInfo(pair.Private).GetEncoded());
        var publicPem = WritePem("PUBLIC KEY", SubjectPublicKeyInfoFactory.CreateSubjectPublicKeyInfo(pair.Public).GetEncoded());
        return new BancoKeys(privatePem, publicPem, KeyidFromPublic(publicPem));
    }

    public static string KeyidFromPublic(string publicPem)
    {
        var hex = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(publicPem))).ToLowerInvariant();
        return $"banco_{hex[..16]}";
    }

    public static BancoKeys LoadOrCreate(string dataDir)
    {
        Directory.CreateDirectory(dataDir);
        var privatePath = Path.Combine(dataDir, "banco-private.pem");
        var publicPath = Path.Combine(dataDir, "banco-public.pem");
        if (File.Exists(privatePath) && File.Exists(publicPath))
        {
            var privatePem = File.ReadAllText(privatePath);
            var publicPem = File.ReadAllText(publicPath);
            return new BancoKeys(privatePem, publicPem, KeyidFromPublic(publicPem));
        }
        var keys = Generate();
        File.WriteAllText(privatePath, keys.PrivateKey);
        File.WriteAllText(publicPath, keys.PublicKey);
        return keys;
    }

    public static AsymmetricKeyParameter ReadPrivate(string pem)
    {
        var obj = ReadPem(pem);
        return obj switch
        {
            AsymmetricCipherKeyPair pair => pair.Private,
            AsymmetricKeyParameter p => p,
            _ => throw new InvalidOperationException($"chave privada inesperada: {obj.GetType().Name}"),
        };
    }

    public static AsymmetricKeyParameter ReadPublic(string pem)
    {
        var obj = ReadPem(pem);
        return obj is AsymmetricCipherKeyPair pair ? pair.Public : (AsymmetricKeyParameter)obj;
    }

    private static object ReadPem(string pem)
    {
        using var reader = new StringReader(pem);
        var parsed = new PemReader(reader).ReadObject()
            ?? throw new InvalidOperationException("PEM inválido");
        return parsed;
    }

    private static string WritePem(string label, byte[] der)
    {
        var b64 = Convert.ToBase64String(der);
        var sb = new StringBuilder();
        sb.Append("-----BEGIN ").Append(label).AppendLine("-----");
        for (var i = 0; i < b64.Length; i += 64)
            sb.AppendLine(b64.Substring(i, Math.Min(64, b64.Length - i)));
        sb.Append("-----END ").Append(label).AppendLine("-----");
        return sb.ToString().Replace("\r\n", "\n");
    }
}

public sealed class IdentityState
{
    public Identity? Current { get; set; }
}
