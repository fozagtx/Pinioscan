// In-memory cache with TTL (best-effort in serverless — resets on cold start)
const memStore = new Map<string, { data: unknown; expiresAt: number }>();

const DEFAULT_TTL_S = 21600; // 6 hours

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = memStore.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) memStore.delete(key);
    return null;
  }
  return entry.data as T;
}

export async function cacheSet<T>(key: string, data: T, ttlS: number = DEFAULT_TTL_S): Promise<void> {
  if (memStore.size > 200) {
    const keys = Array.from(memStore.keys());
    for (let i = 0; i < 50; i++) memStore.delete(keys[i]);
  }
  memStore.set(key, { data, expiresAt: Date.now() + ttlS * 1000 });
}
