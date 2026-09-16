namespace Atlas.Averbacao.Security;

public sealed class ReplayCache
{
    private readonly Dictionary<string, long> _seen = new();
    private readonly long _ttlMs;
    private readonly object _gate = new();

    public ReplayCache(long ttlMs = 60_000) => _ttlMs = ttlMs;

    public bool Claim(string nonce, long? nowMs = null)
    {
        var now = nowMs ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        lock (_gate)
        {
            foreach (var expired in _seen.Where(kv => kv.Value <= now).Select(kv => kv.Key).ToList())
                _seen.Remove(expired);
            if (_seen.ContainsKey(nonce)) return false;
            _seen[nonce] = now + _ttlMs;
            return true;
        }
    }
}
