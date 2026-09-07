/**
 * PostgreSQL queries for cache operations.
 */

import { Pool } from "pg";
import { serialize } from "../utils/serialize.js";
import { deserialize } from "../utils/deserialize.js";
import { PGSnapKeyError } from "../utils/validation.js";

/**
 * Inserts or updates a cache entry.
 */
export async function setCacheQuery(
  pool: Pool,
  key: string,
  value: unknown,
  expiresAt: Date,
): Promise<void> {
  const serialized = serialize(value);
  await pool.query(
    `INSERT INTO pgsnap_cache (key, value, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
    [key, serialized, expiresAt],
  );
}

/**
 * Error thrown when a cache key is not found.
 * This allows callers to distinguish between "key not found" and "stored null value".
 */
export class CacheKeyNotFoundError extends Error {
  constructor(key: string) {
    super(`Cache key not found: ${key}`);
    this.name = "CacheKeyNotFoundError";
  }
}

/**
 * Retrieves a cache entry by key.
 * @throws {CacheKeyNotFoundError} If the key does not exist or has expired.
 * Returns the deserialized value, which may be null for stored null values.
 */
export async function getCacheQuery<T = unknown>(
  pool: Pool,
  key: string,
): Promise<T> {
  const result = await pool.query(
    `SELECT value FROM pgsnap_cache
     WHERE key = $1 AND expires_at > NOW()`,
    [key],
  );

  if (result.rowCount === 0) {
    throw new CacheKeyNotFoundError(key);
  }

  const serialized = result.rows[0].value;
  return deserialize(serialized) as T;
}

/**
 * Deletes a cache entry by key. Does not throw if key doesn't exist.
 */
export async function deleteCacheQuery(pool: Pool, key: string): Promise<void> {
  await pool.query(`DELETE FROM pgsnap_cache WHERE key = $1`, [key]);
}

/**
 * Deletes all cache entries.
 */
export async function clearCacheQuery(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM pgsnap_cache`);
}

/**
 * Deletes all expired cache entries.
 */
export async function clearExpiredCacheQuery(pool: Pool): Promise<number> {
  const result = await pool.query(
    `DELETE FROM pgsnap_cache WHERE expires_at <= NOW()`,
  );
  return result.rowCount ?? 0;
}

/**
 * Loads all non-expired cache keys for Bloom Filter initialization/rebuild.
 */
export async function loadCacheKeys(pool: Pool): Promise<string[]> {
  const result = await pool.query(
    `SELECT key FROM pgsnap_cache WHERE expires_at > NOW()`,
  );
  return result.rows.map((row) => row.key);
}