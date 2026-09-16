package br.com.atlas.averbacao.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public final class Pairing {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private Pairing() {}

    public static Integracao pair(String atlasUrl, String token, String publicBaseUrl, String publicKey, String keyid) {
        try {
            String url = atlasUrl.replaceAll("/$", "") + "/v1/integracao/parear";
            String json = MAPPER.writeValueAsString(Map.of(
                "public_key", publicKey,
                "base_url", publicBaseUrl,
                "keyid", keyid
            ));
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new IllegalStateException("pareamento falhou: HTTP " + res.statusCode() + " " + res.body());
            }
            JsonNode body = MAPPER.readTree(res.body());
            String atlasPublic = body.path("atlas_public_key").asText(null);
            if (atlasPublic == null || atlasPublic.isBlank()) {
                throw new IllegalStateException("pareamento: resposta sem atlas_public_key");
            }
            String bancoId = body.path("banco_id").asText("");
            String kid = body.path("keyid").asText(keyid);
            String ambiente = body.path("ambiente").asText("");
            return new Integracao(bancoId, kid.isBlank() ? keyid : kid, atlasPublic, ambiente);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static Path integracaoPath(Path dataDir) {
        return dataDir.resolve("integracao.json");
    }

    public static Identity load(Path dataDir, BancoKeys keys) {
        try {
            JsonNode raw = MAPPER.readTree(Files.readString(integracaoPath(dataDir)));
            String atlasPublic = raw.path("atlasPublicKey").asText(raw.path("atlas_public_key").asText(""));
            if (atlasPublic.isBlank()) return null;
            String bancoId = raw.path("bancoId").asText(raw.path("banco_id").asText(""));
            String keyid = raw.path("keyid").asText(keys.keyid());
            return new Identity(atlasPublic, keys.privateKey(), keys.publicKey(), bancoId, keyid.isBlank() ? keys.keyid() : keyid);
        } catch (Exception e) {
            return null;
        }
    }

    public static void save(Path dataDir, Integracao integracao) {
        try {
            Files.createDirectories(dataDir);
            Files.writeString(integracaoPath(dataDir), MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(integracao) + "\n");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static Identity from(BancoKeys keys, Integracao integracao) {
        String keyid = integracao.keyid() == null || integracao.keyid().isBlank() ? keys.keyid() : integracao.keyid();
        return new Identity(integracao.atlasPublicKey(), keys.privateKey(), keys.publicKey(), integracao.bancoId(), keyid);
    }
}
