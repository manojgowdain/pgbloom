/**
 * Cache module implementation with internal Bloom Filter support.
 */
import { BloomFilter } from "../bloom/index.js";
import { validateKey } from "../utils/validation.js";
import { setCacheQuery, getCacheQuery, deleteCacheQuery, clearCacheQuery, clearExpiredCacheQuery, loadCacheKeys, } from "./queries.js";
/**
 * Creates a new cache state with optional Bloom Filter.
 */
export function createCacheState(pool, options = {}) {
    const bloomEnabled = options.enabled ?? false;
    const rebuildInterval = options.rebuildInterval ?? 15 * 60 * 1000;
    const state = {
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
export async function initializeBloomFilter(state) {
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
export function startBloomRebuildTimer(state) {
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
export function stopBloomRebuildTimer(state) {
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
export async function rebuildBloomFilter(state) {
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
export async function setCache(state, key, value, expiry) {
    validateKey(key);
    // Calculate expiry timestamp
    const expiresAt = expiry instanceof Date
        ? expiry
        : new Date(Date.now() + (typeof expiry === "number" ? expiry : 3600000));
    await setCacheQuery(state.pool, key, value, expiresAt);
    // Update internal Bloom Filter AFTER successful database write
    if (state.bloomEnabled && state.bloomFilter) {
        state.bloomFilter.add(key);
    }
    return value;
}
export async function getCache(state, key) {
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
    return getCacheQuery(state.pool, key);
}
export async function deleteCache(state, key) {
    validateKey(key);
    await deleteCacheQuery(state.pool, key);
    // Update Bloom Filter: use remove() on Counting Bloom Filter
    // This is safe because we only call it after successful DB deletion
    if (state.bloomEnabled && state.bloomFilter) {
        state.bloomFilter.remove(key);
    }
}
export async function clearCache(state) {
    await clearCacheQuery(state.pool);
    if (state.bloomEnabled && state.bloomFilter) {
        state.bloomFilter.clear();
    }
}
export async function clearExpiredCache(state) {
    const deletedCount = await clearExpiredCacheQuery(state.pool);
    // Note: expired keys may remain in the Bloom Filter temporarily.
    // This is acceptable (causes false positives, not false negatives).
    // The periodic rebuild will clean them up.
    return deletedCount;
}
//# sourceMappingURL=index.js.map