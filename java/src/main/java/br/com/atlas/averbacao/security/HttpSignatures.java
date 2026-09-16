package br.com.atlas.averbacao.security;

import br.com.atlas.averbacao.api.UnauthorizedProblem;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Signature;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class HttpSignatures {
    public static final int CLOCK_SKEW_SEC = 30;
    private static final Pattern INPUT = Pattern.compile(
        "^sig1=\\(\"@method\" \"@path\" \"content-digest\" \"content-type\"\\);created=(\\d+);keyid=\"([^\"]+)\";nonce=\"([^\"]+)\";alg=\"ed25519\"$");
    private static final Pattern SIG = Pattern.compile("^sig1=:([A-Za-z0-9+/]+=*):$");
    private static final ObjectMapper MAPPER = new ObjectMapper()
        .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
        .setSerializationInclusion(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, false);

    private HttpSignatures() {}

    public static String contentDigest(String body) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(body.getBytes(StandardCharsets.UTF_8));
            return "sha-256=:" + Base64.getEncoder().encodeToString(hash) + ":";
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String canonicalContentType(String value) {
        return value.split(";")[0].trim().toLowerCase();
    }

    public static String signatureParams(long created, String keyid, String nonce) {
        return "(\"@method\" \"@path\" \"content-digest\" \"content-type\");created=" + created
            + ";keyid=\"" + keyid + "\";nonce=\"" + nonce + "\";alg=\"ed25519\"";
    }

    public static String signatureBase(String method, String path, String digest, String contentType, String params) {
        return "\"@method\": " + method.toUpperCase() + "\n"
            + "\"@path\": " + path + "\n"
            + "\"content-digest\": " + digest + "\n"
            + "\"content-type\": " + contentType + "\n"
            + "\"@signature-params\": " + params;
    }

    public static Map<String, String> signRequest(String method, String path, String body, String keyid, String nonce, String privatePem) {
        return signRequest(method, path, body, keyid, nonce, privatePem, System.currentTimeMillis() / 1000, "application/json");
    }

    public static Map<String, String> signRequest(
        String method, String path, String body, String keyid, String nonce, String privatePem, long created, String contentType
    ) {
        String ct = canonicalContentType(contentType);
        String digest = contentDigest(body);
        String params = signatureParams(created, keyid, nonce);
        String base = signatureBase(method, path, digest, ct, params);
        String sig = Base64.getEncoder().encodeToString(signEd25519(privatePem, base.getBytes(StandardCharsets.UTF_8)));
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("content-type", ct);
        headers.put("content-digest", digest);
        headers.put("signature-input", "sig1=" + params);
        headers.put("signature", "sig1=:" + sig + ":");
        return headers;
    }

    public static void verifyRequest(
        String method, String path, String body, Map<String, String> headers, String publicPem, ReplayCache replay
    ) {
        String signatureInput = header(headers, "signature-input");
        String signatureHeader = header(headers, "signature");
        Matcher im = INPUT.matcher(signatureInput.trim());
        if (!im.matches()) throw new UnauthorizedProblem("Signature-Input ausente ou inválido");
        Matcher sm = SIG.matcher(signatureHeader.trim());
        if (!sm.matches()) throw new UnauthorizedProblem("Signature ausente ou inválida");

        long created = Long.parseLong(im.group(1));
        String keyid = im.group(2);
        String nonce = im.group(3);
        long now = System.currentTimeMillis() / 1000;
        if (Math.abs(now - created) > CLOCK_SKEW_SEC) throw new UnauthorizedProblem("timestamp fora da janela");

        String expectedDigest = contentDigest(body);
        if (!expectedDigest.equals(header(headers, "content-digest"))) {
            throw new UnauthorizedProblem("Content-Digest não confere");
        }
        String ct = canonicalContentType(header(headers, "content-type").isBlank() ? "application/json" : header(headers, "content-type"));
        String params = signatureParams(created, keyid, nonce);
        String base = signatureBase(method, path, expectedDigest, ct, params);
        byte[] sig = Base64.getDecoder().decode(sm.group(1));
        if (!verifyEd25519(publicPem, base.getBytes(StandardCharsets.UTF_8), sig)) {
            throw new UnauthorizedProblem("assinatura inválida");
        }
        if (!replay.claim(nonce)) throw new UnauthorizedProblem("nonce reutilizado");
    }

    public static String signOfertaJws(String privatePem, Object oferta) {
        try {
            String header = base64Url("{\"alg\":\"EdDSA\"}".getBytes(StandardCharsets.UTF_8));
            String payload = base64Url(MAPPER.writeValueAsBytes(oferta));
            String signingInput = header + "." + payload;
            String sig = base64Url(signEd25519(privatePem, signingInput.getBytes(StandardCharsets.UTF_8)));
            return signingInput + "." + sig;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static byte[] signEd25519(String privatePem, byte[] data) {
        try {
            Signature s = Signature.getInstance("Ed25519");
            s.initSign(KeyStore.readPrivate(privatePem));
            s.update(data);
            return s.sign();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static boolean verifyEd25519(String publicPem, byte[] data, byte[] signature) {
        try {
            Signature s = Signature.getInstance("Ed25519");
            s.initVerify(KeyStore.readPublic(publicPem));
            s.update(data);
            return s.verify(signature);
        } catch (Exception e) {
            return false;
        }
    }

    private static String header(Map<String, String> headers, String name) {
        for (Map.Entry<String, String> e : headers.entrySet()) {
            if (e.getKey().equalsIgnoreCase(name)) return e.getValue() == null ? "" : e.getValue();
        }
        return "";
    }

    private static String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}
