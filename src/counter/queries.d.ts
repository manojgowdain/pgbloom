/**
 * PostgreSQL queries for counter operations.
 */
import { Pool } from "pg";
/**
 * Atomically increments a counter by the specified delta.
 * Creates the counter if it doesn't exist.
 * Returns the new value.
 */
export declare function incrementCounter(pool: Pool, key: string, delta: number): Promise<number>;
/**
 * Gets the current value of a counter.
 * Returns null if the counter doesn't exist.
 */
export declare function getCounter(pool: Pool, key: string): Promise<number | null>;
/**
 * Sets a counter to a specific value.
 * Creates the counter if it doesn't exist.
 * Returns the new value.
 */
export declare function setCounter(pool: Pool, key: string, value: number): Promise<number>;
/**
 * Deletes a counter.
 * Returns true if the counter was deleted, false if it didn't exist.
 */
export declare function deleteCounter(pool: Pool, key: string): Promise<boolean>;
/**
 * Gets all counters with their values.
 */
export declare function listCounters(pool: Pool): Promise<Array<{
    key: string;
    value: number;
    updatedAt: Date;
}>>;
//# sourceMappingURL=queries.d.ts.map