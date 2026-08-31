/**
 * PostgreSQL queries for cache operations.
 */

import { Pool } from "pg";
import { serialize } from "../utils/serialize.js";
import { deserialize } from "../utils/deserialize.js";

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
 * Retrieves a cache entry by key. Returns null if not found or expired.
 */
export async function getCacheQuery<T = unknown>(
  pool: Pool,
  key: string,
): Promise<T | null> {
  const result = await pool.query(
    `SELECT value FROM pgsnap_cache
     WHERE key = $1 AND expires_at > NOW()`,
    [key],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return deserialize(result.rows[0].value) as T;
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