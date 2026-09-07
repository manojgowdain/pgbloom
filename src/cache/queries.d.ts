/**
 * PostgreSQL queries for cache operations.
 */
import { Pool } from "pg";
/**
 * Inserts or updates a cache entry.
 */
export declare function setCacheQuery(pool: Pool, key: string, value: unknown, expiresAt: Date): Promise<void>;
/**
 * Retrieves a cache entry by key. Returns null if not found or expired.
 */
export declare function getCacheQuery<T = unknown>(pool: Pool, key: string): Promise<T | null>;
/**
 * Deletes a cache entry by key. Does not throw if key doesn't exist.
 */
export declare function deleteCacheQuery(pool: Pool, key: string): Promise<void>;
/**
 * Deletes all cache entries.
 */
export declare function clearCacheQuery(pool: Pool): Promise<void>;
/**
 * Deletes all expired cache entries.
 */
export declare function clearExpiredCacheQuery(pool: Pool): Promise<number>;
/**
 * Loads all non-expired cache keys for Bloom Filter initialization/rebuild.
 */
export declare function loadCacheKeys(pool: Pool): Promise<string[]>;
//# sourceMappingURL=queries.d.ts.map