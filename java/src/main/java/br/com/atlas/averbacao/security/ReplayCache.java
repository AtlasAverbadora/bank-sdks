package br.com.atlas.averbacao.security;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

@Component
public class ReplayCache {
    private final Map<String, Long> seen = new ConcurrentHashMap<>();
    private final long ttlMs;

    public ReplayCache() { this(60_000); }
    public ReplayCache(long ttlMs) { this.ttlMs = ttlMs; }

    public boolean claim(String nonce) {
        long now = System.currentTimeMillis();
        seen.entrySet().removeIf(e -> e.getValue() <= now);
        if (seen.containsKey(nonce)) return false;
        seen.put(nonce, now + ttlMs);
        return true;
    }
}
