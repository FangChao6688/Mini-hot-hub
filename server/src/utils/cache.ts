interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_SEC = 600;

function readDefaultTtlSec(): number {
  const raw = process.env.CACHE_TTL;
  if (raw === undefined || raw === '') {
    return DEFAULT_TTL_SEC;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_SEC;
  }

  return parsed;
}

export function getDefaultTtlSec(): number {
  return readDefaultTtlSec();
}

export function getCache<T>(key: string): T | undefined {
  const entry = store.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() >= entry.expiresAt) {
    store.delete(key);
    return undefined;
  }

  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlSec?: number): void {
  const ttl = ttlSec ?? readDefaultTtlSec();

  store.set(key, {
    data,
    expiresAt: Date.now() + ttl * 1000,
  });
}
