// Shared round-robin + cooldown strategy for providers backed by several free-tier API
// keys. Each provider gets its own rotator instance (isolate-local state), so a Gemini
// key on cooldown never affects NIM key selection and vice versa.
export interface KeyRotator {
  // Returns keys in try-order: rotated starting point, then keys still on cooldown
  // filtered out (unless every key is cooling down, in which case all are returned so
  // the caller can still attempt one rather than fail outright).
  orderKeys(apiKeys: readonly string[]): string[];
  cooldown(apiKey: string, durationMs: number): void;
}

export function createKeyRotator(): KeyRotator {
  let nextIndex = 0;
  const cooledDownUntil = new Map<string, number>();

  return {
    orderKeys(apiKeys) {
      if (apiKeys.length === 0) return [];
      const start = nextIndex % apiKeys.length;
      nextIndex = (nextIndex + 1) % apiKeys.length;
      const rotated = [...apiKeys.slice(start), ...apiKeys.slice(0, start)];
      const now = Date.now();
      const ready = rotated.filter((key) => (cooledDownUntil.get(key) ?? 0) <= now);
      return ready.length > 0 ? ready : rotated;
    },
    cooldown(apiKey, durationMs) {
      cooledDownUntil.set(apiKey, Date.now() + durationMs);
    },
  };
}
