export class ReplayCache {
  private readonly seen = new Map<string, number>()

  constructor(private readonly ttlMs = 60_000) {}

  /** `true` se o nonce é novo. `false` se já foi usado. */
  claim(nonce: string, now = Date.now()): boolean {
    this.gc(now)
    if (this.seen.has(nonce)) return false
    this.seen.set(nonce, now + this.ttlMs)
    return true
  }

  private gc(now: number): void {
    for (const [nonce, expires] of this.seen) {
      if (expires <= now) this.seen.delete(nonce)
    }
  }
}
