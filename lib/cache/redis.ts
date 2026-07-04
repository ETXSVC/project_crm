import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    client.on("error", (error) => {
      console.error("[redis]", error.message);
    });
  }

  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Fail open — fall back to database reads.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const redis = getClient();
  if (!redis) return;

  try {
    await redis.del(...keys);
  } catch {
    // Fail open.
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

export async function verifyRedisConnection(): Promise<boolean> {
  const redis = getClient();
  if (!redis) return false;

  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
