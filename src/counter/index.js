/**
 * Counter module for distributed atomic counters.
 */
import { incrementCounter, getCounter, setCounter, deleteCounter, listCounters, } from "./queries.js";
/**
 * Creates a new counter state with the database connection pool
 * and optional local store for caching.
 */
export function createCounterState(pool, localStore = null) {
    return {
        pool,
        localStore,
    };
}
/**
 * Increments a counter by the specified delta (default 1).
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export async function increment(state, key, delta = 1) {
    const value = await incrementCounter(state.pool, key, delta);
    // Update local cache if available
    if (state.localStore) {
        await state.localStore.set(`counter:${key}`, value);
    }
    return { value };
}
/**
 * Decrements a counter by the specified delta (default 1).
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export async function decrement(state, key, delta = 1) {
    const value = await incrementCounter(state.pool, key, -delta);
    // Update local cache if available
    if (state.localStore) {
        await state.localStore.set(`counter:${key}`, value);
    }
    return { value };
}
/**
 * Adds an arbitrary amount to a counter (alias for increment).
 */
export async function add(state, key, delta) {
    return increment(state, key, delta);
}
/**
 * Subtracts an arbitrary amount from a counter (alias for decrement with negative).
 */
export async function subtract(state, key, delta) {
    return decrement(state, key, delta);
}
/**
 * Gets the current value of a counter with configurable consistency.
 *
 * Consistency options:
 * - 'strong': Always read from PostgreSQL (default, most consistent)
 * - 'local': Read from local cache only (may be stale)
 * - 'eventual': Read from local cache, fallback to PostgreSQL on miss
 */
export async function get(state, key, options = {}) {
    const consistency = options.consistency ?? 'strong';
    // Try local cache first for 'local' and 'eventual' consistency
    if (state.localStore && (consistency === 'local' || consistency === 'eventual')) {
        const cached = await state.localStore.get(`counter:${key}`);
        if (cached !== undefined) {
            return { value: cached };
        }
        // For 'eventual', fall through to PostgreSQL on cache miss
        if (consistency === 'local') {
            return { value: 0 };
        }
    }
    // Read from PostgreSQL (strong consistency or eventual fallback)
    const value = await getCounter(state.pool, key) ?? 0;
    // Update local cache if available
    if (state.localStore) {
        await state.localStore.set(`counter:${key}`, value);
    }
    return { value };
}
/**
 * Sets a counter to a specific value.
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export async function set(state, key, value) {
    const newValue = await setCounter(state.pool, key, value);
    // Update local cache if available
    if (state.localStore) {
        await state.localStore.set(`counter:${key}`, newValue);
    }
    return { value: newValue };
}
/**
 * Deletes a counter.
 */
export async function remove(state, key) {
    const result = await deleteCounter(state.pool, key);
    // Remove from local cache if available
    if (state.localStore && result) {
        await state.localStore.delete(`counter:${key}`);
    }
    return result;
}
/**
 * Lists all counters with their values.
 */
export async function list(state) {
    return listCounters(state.pool);
}
/**
 * Cleans up all counters (for testing/cleanup purposes).
 */
export async function clearAll(state) {
    await state.pool.query(`DELETE FROM pgbloom_counters`);
    // Clear local cache if available
    if (state.localStore) {
        // We can't easily clear only counter keys, so clear all
        // This is a simple approach; a more sophisticated one would track counter keys
        await state.localStore.clear();
    }
}
//# sourceMappingURL=index.js.map