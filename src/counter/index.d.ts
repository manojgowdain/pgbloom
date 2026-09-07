/**
 * Counter module for distributed atomic counters.
 */
import { Pool } from "pg";
import type { CounterState, CounterOptions, CounterResult } from "./types.js";
export type { CounterState, CounterOptions, CounterResult };
/**
 * Creates a new counter state with the database connection pool
 * and optional local store for caching.
 */
export declare function createCounterState(pool: Pool, localStore?: import("../storage/local/types.js").LocalStore | null): CounterState;
/**
 * Increments a counter by the specified delta (default 1).
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export declare function increment(state: CounterState, key: string, delta?: number): Promise<CounterResult>;
/**
 * Decrements a counter by the specified delta (default 1).
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export declare function decrement(state: CounterState, key: string, delta?: number): Promise<CounterResult>;
/**
 * Adds an arbitrary amount to a counter (alias for increment).
 */
export declare function add(state: CounterState, key: string, delta: number): Promise<CounterResult>;
/**
 * Subtracts an arbitrary amount from a counter (alias for decrement with negative).
 */
export declare function subtract(state: CounterState, key: string, delta: number): Promise<CounterResult>;
/**
 * Gets the current value of a counter with configurable consistency.
 *
 * Consistency options:
 * - 'strong': Always read from PostgreSQL (default, most consistent)
 * - 'local': Read from local cache only (may be stale)
 * - 'eventual': Read from local cache, fallback to PostgreSQL on miss
 */
export declare function get(state: CounterState, key: string, options?: CounterOptions): Promise<CounterResult>;
/**
 * Sets a counter to a specific value.
 * Uses atomic PostgreSQL operation to prevent race conditions.
 */
export declare function set(state: CounterState, key: string, value: number): Promise<CounterResult>;
/**
 * Deletes a counter.
 */
export declare function remove(state: CounterState, key: string): Promise<boolean>;
/**
 * Lists all counters with their values.
 */
export declare function list(state: CounterState): Promise<Array<{
    key: string;
    value: number;
    updatedAt: Date;
}>>;
/**
 * Cleans up all counters (for testing/cleanup purposes).
 */
export declare function clearAll(state: CounterState): Promise<void>;
//# sourceMappingURL=index.d.ts.map