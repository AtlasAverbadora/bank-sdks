package br.com.atlas.averbacao.security;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HexFormat;

public final class KeyStore {
    private KeyStore() {}

    public static BancoKeys generate() {
        try {
            KeyPairGenerator g = KeyPairGenerator.getInstance("Ed25519");
            KeyPair kp = g.generateKeyPair();
            String privatePem = writePem("PRIVATE KEY", kp.getPrivate().getEncoded());
            String publicPem = writePem("PUBLIC KEY", kp.getPublic().getEncoded());
            return new BancoKeys(privatePem, publicPem, keyidFromPublic(publicPem));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String keyidFromPublic(String publicPem) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(publicPem.getBytes(StandardCharsets.UTF_8));
            return "banco_" + HexFormat.of().formatHex(hash).substring(0, 16);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static BancoKeys loadOrCreate(Path dataDir) {
        try {
            Files.createDirectories(dataDir);
            Path priv = dataDir.resolve("banco-private.pem");
            Path pub = dataDir.resolve("banco-public.pem");
            if (Files.exists(priv) && Files.exists(pub)) {
                String privatePem = Files.readString(priv);
                String publicPem = Files.readString(pub);
                return new BancoKeys(privatePem, publicPem, keyidFromPublic(publicPem));
            }
            BancoKeys keys = generate();
            Files.writeString(priv, keys.privateKey());
            Files.writeString(pub, keys.publicKey());
            return keys;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static PrivateKey readPrivate(String pem) {
        try {
            return KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(decodePem(pem)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static PublicKey readPublic(String pem) {
        try {
            return KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(decodePem(pem)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String newNonce() {
        byte[] n = new byte[16];
        new SecureRandom().nextBytes(n);
        return HexFormat.of().formatHex(n);
    }

    static String writePem(String type, byte[] der) {
        String b64 = Base64.getEncoder().encodeToString(der);
        StringBuilder sb = new StringBuilder();
        sb.append("-----BEGIN ").append(type).append("-----\n");
        for (int i = 0; i < b64.length(); i += 64) {
            sb.append(b64, i, Math.min(i + 64, b64.length())).append('\n');
        }
        sb.append("-----END ").append(type).append("-----\n");
        return sb.toString();
    }

    static byte[] decodePem(String pem) {
        String b64 = pem.replaceAll("-----BEGIN [^-]+-----", "")
            .replaceAll("-----END [^-]+-----", "")
            .replaceAll("\\s", "");
        return Base64.getDecoder().decode(b64);
    }
}
