import { createHash } from "node:crypto";
import { getRedis } from "../jobs/queue";

const TTL_SECONDS = 60;
const PREFIX = "properties:list:";

function cacheKey(rawQuery: Record<string, unknown>): string {
  const sorted = Object.keys(rawQuery)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = rawQuery[k];
      return acc;
    }, {});
  const hash = createHash("sha256").update(JSON.stringify(sorted)).digest("hex").slice(0, 24);
  return `${PREFIX}${hash}`;
}

export async function getPropertyListCache<T>(query: Record<string, unknown>): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(cacheKey(query));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setPropertyListCache(query: Record<string, unknown>, payload: unknown) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.setex(cacheKey(query), TTL_SECONDS, JSON.stringify(payload));
  } catch {
    /* cache is best-effort */
  }
}

export async function invalidatePropertyListCache() {
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${PREFIX}*`, "COUNT", 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch {
    /* best-effort */
  }
}
