import { CACHE_TTL_SECONDS } from "./constants";

export interface CacheResult<T> {
  value: T;
  cached: boolean;
}

export async function getOrCreateCached<T>(
  cache: KVNamespace,
  endpoint: string,
  payload: unknown,
  bypass: boolean,
  create: () => Promise<T>,
): Promise<CacheResult<T>> {
  const key = await cacheKey(endpoint, payload);

  if (!bypass) {
    const stored = await cache.get(key);
    if (stored !== null) {
      try {
        return { value: JSON.parse(stored) as T, cached: true };
      } catch {
        console.warn(JSON.stringify({ event: "cache_entry_invalid", endpoint, key }));
        await cache.delete(key);
      }
    }
  }

  const value = await create();
  if (!bypass) await cache.put(key, JSON.stringify(value), { expirationTtl: CACHE_TTL_SECONDS });
  return { value, cached: false };
}

export async function cacheKey(endpoint: string, payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${endpoint}:${stableStringify(payload)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `response:${hash}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
