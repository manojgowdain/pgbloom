/**
 * Cache module implementation with internal Bloom Filter support.
 */
import { Pool } from "pg";
import { BloomFilter } from "../bloom/index.js";
/**
 * Configuration options specific to the cache's internal Bloom Filter.
 */
export interface CacheBloomOptions {
    /**
     * Whether to enable the internal Bloom Filter for cache lookups.
     *
     * @default false
     */
    enabled?: boolean;
    /**
     * Expected number of cache entries. Used to size the Bloom Filter.
     *
     * @default 10000
     */
    expectedItems?: number;
    /**
     * Target false positive rate for the Bloom Filter.
     *
     * @default 0.01
     */
    falsePositiveRate?: number;
    /**
     * Interval in milliseconds for rebuilding the Bloom Filter from
     * the current database state. This compensates for the fact that
     * standard Bloom Filters cannot safely remove individual items.
     *
     * Set to `false` to disable automatic rebuilds.
     *
     * @default 15 * 60 * 1000 (15 minutes)
     */
    rebuildInterval?: number | false;
}
/**
 * Internal cache state including the Bloom Filter and rebuild timer.
 */
export interface CacheState {
    pool: Pool;
    bloomFilter: BloomFilter | null;
    rebuildTimer: ReturnType<typeof setInterval> | null;
    rebuildInterval: number | false;
    bloomEnabled: boolean;
}
/**
 * Creates a new cache state with optional Bloom Filter.
 */
export declare function createCacheState(pool: Pool, options?: CacheBloomOptions): CacheState;
/**
 * Initializes the Bloom Filter by loading existing cache keys from PostgreSQL.
 * Must be called after createCacheState when bloomEnabled is true.
 */
export declare function initializeBloomFilter(state: CacheState): Promise<void>;
/**
 * Starts the periodic Bloom Filter rebuild timer.
 */
export declare function startBloomRebuildTimer(state: CacheState): void;
/**
 * Stops the Bloom Filter rebuild timer.
 */
export declare function stopBloomRebuildTimer(state: CacheState): void;
/**
 * Rebuilds the Bloom Filter from the current database state.
 *
 * Creates a new filter, populates it, and atomically swaps it in.
 * This prevents a window where all keys appear absent.
 */
export declare function rebuildBloomFilter(state: CacheState): Promise<void>;
/**
 * Cache operations with integrated Bloom Filter support.
 */
export declare function setCache(state: CacheState, key: string, value: unknown, expiry?: number | Date): Promise<unknown>;
export declare function getCache<T = unknown>(state: CacheState, key: string): Promise<T | null>;
export declare function deleteCache(state: CacheState, key: string): Promise<void>;
export declare function clearCache(state: CacheState): Promise<void>;
export declare function clearExpiredCache(state: CacheState): Promise<number>;
//# sourceMappingURL=index.d.ts.map