package br.com.atlas.averbacao.security;

import java.nio.file.Path;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class PairingRunner implements ApplicationRunner {
    private final IdentityState identity;

    public PairingRunner(IdentityState identity) {
        this.identity = identity;
    }

    @Override
    public void run(ApplicationArguments args) {
        String data = env("ATLAS_DATA_DIR", Path.of("data").toAbsolutePath().toString());
        Path dataDir = Path.of(data);
        BancoKeys keys = KeyStore.loadOrCreate(dataDir);
        Identity loaded = Pairing.load(dataDir, keys);
        identity.setCurrent(loaded);

        String atlasUrl = emptyToNull(System.getenv("ATLAS_URL"));
        String token = emptyToNull(System.getenv("ATLAS_PAIRING_TOKEN"));
        String publicBaseUrl = emptyToNull(System.getenv("PUBLIC_BASE_URL"));
        if (identity.current() == null && atlasUrl != null && token != null && publicBaseUrl != null) {
            try {
                Integracao integracao = Pairing.pair(atlasUrl, token, publicBaseUrl, keys.publicKey(), keys.keyid());
                Pairing.save(dataDir, integracao);
                identity.setCurrent(Pairing.from(keys, integracao));
                System.out.println("Pareado. banco_id=" + integracao.bancoId() + " ambiente=" + integracao.ambiente());
            } catch (Exception e) {
                System.err.println(e.getMessage());
            }
        }
        if (identity.current() == null) {
            System.out.println("Sem pareamento: /docs e /v1/saude sobem; rotas autenticadas retornam 401.");
        }
    }

    private static String env(String name, String fallback) {
        String v = System.getenv(name);
        return v == null || v.isBlank() ? fallback : v;
    }

    private static String emptyToNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
