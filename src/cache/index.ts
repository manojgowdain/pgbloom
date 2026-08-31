/**
 * Cache module implementation with internal Bloom Filter support.
 */

import { Pool } from "pg";
import { BloomFilter } from "../bloom/index.js";
import { validateKey } from "../utils/validation.js";
import {
  setCacheQuery,
  getCacheQuery,
  deleteCacheQuery,
  clearCacheQuery,
  clearExpiredCacheQuery,
  loadCacheKeys,
} from "./queries.js";

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
export function createCacheState(
  pool: Pool,
  options: CacheBloomOptions = {},
): CacheState {
  const bloomEnabled = options.enabled ?? false;
  const rebuildInterval = options.rebuildInterval ?? 15 * 60 * 1000;

  const state: CacheState = {
    pool,
    bloomFilter: null,
    rebuildTimer: null,
    rebuildInterval,
    bloomEnabled,
  };

  if (bloomEnabled) {
    state.bloomFilter = new BloomFilter({
      expectedItems: options.expectedItems,
      falsePositiveRate: options.falsePositiveRate,
    });
  }

  return state;
}

/**
 * Initializes the Bloom Filter by loading existing cache keys from PostgreSQL.
 * Must be called after createCacheState when bloomEnabled is true.
 */
export async function initializeBloomFilter(state: CacheState): Promise<void> {
  if (!state.bloomEnabled || !state.bloomFilter) {
    return;
  }

  const keys = await loadCacheKeys(state.pool);
  for (const key of keys) {
    state.bloomFilter.add(key);
  }
}

/**
 * Starts the periodic Bloom Filter rebuild timer.
 */
export function startBloomRebuildTimer(state: CacheState): void {
  if (!state.bloomEnabled || !state.bloomFilter || state.rebuildInterval === false) {
    return;
  }

  const timer = setInterval(async () => {
    await rebuildBloomFilter(state);
  }, state.rebuildInterval);

  // Don't prevent process exit
  timer.unref();
  state.rebuildTimer = timer;
}

/**
 * Stops the Bloom Filter rebuild timer.
 */
export function stopBloomRebuildTimer(state: CacheState): void {
  if (state.rebuildTimer) {
    clearInterval(state.rebuildTimer);
    state.rebuildTimer = null;
  }
}

/**
 * Rebuilds the Bloom Filter from the current database state.
 *
 * Creates a new filter, populates it, and atomically swaps it in.
 * This prevents a window where all keys appear absent.
 */
export async function rebuildBloomFilter(state: CacheState): Promise<void> {
  if (!state.bloomEnabled || !state.bloomFilter) {
    return;
  }

  const keys = await loadCacheKeys(state.pool);
  const newBloom = new BloomFilter({
    expectedItems: state.bloomFilter.expectedItems,
    falsePositiveRate: state.bloomFilter.falsePositiveRate,
  });

  for (const key of keys) {
    newBloom.add(key);
  }

  // Atomic swap
  state.bloomFilter = newBloom;
}

/**
 * Cache operations with integrated Bloom Filter support.
 */

export async function setCache(
  state: CacheState,
  key: string,
  value: unknown,
  expiry?: number | Date,
): Promise<unknown> {
  validateKey(key);

  // Calculate expiry timestamp
  const expiresAt =
    expiry instanceof Date
      ? expiry
      : new Date(Date.now() + (typeof expiry === "number" ? expiry : 3600000));

  await setCacheQuery(state.pool, key, value, expiresAt);

  // Update internal Bloom Filter AFTER successful database write
  if (state.bloomEnabled && state.bloomFilter) {
    state.bloomFilter.add(key);
  }

  return value;
}

export async function getCache<T = unknown>(
  state: CacheState,
  key: string,
): Promise<T | null> {
  validateKey(key);

  // Check internal Bloom Filter first (if enabled)
  if (state.bloomEnabled && state.bloomFilter) {
    if (!state.bloomFilter.has(key)) {
      // Definitely not present - skip database query entirely
      return null;
    }
    // Possibly present - must query PostgreSQL
  }

  // Query PostgreSQL (the source of truth)
  return getCacheQuery<T>(state.pool, key);
}

export async function deleteCache(state: CacheState, key: string): Promise<void> {
  validateKey(key);

  await deleteCacheQuery(state.pool, key);

  // Update Bloom Filter: use remove() on Counting Bloom Filter
  // This is safe because we only call it after successful DB deletion
  if (state.bloomEnabled && state.bloomFilter) {
    state.bloomFilter.remove(key);
  }
}

export async function clearCache(state: CacheState): Promise<void> {
  await clearCacheQuery(state.pool);

  if (state.bloomEnabled && state.bloomFilter) {
    state.bloomFilter.clear();
  }
}

export async function clearExpiredCache(state: CacheState): Promise<number> {
  const deletedCount = await clearExpiredCacheQuery(state.pool);

  // Note: expired keys may remain in the Bloom Filter temporarily.
  // This is acceptable (causes false positives, not false negatives).
  // The periodic rebuild will clean them up.
  return deletedCount;
}