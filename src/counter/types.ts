/**
 * Counter module types for distributed atomic counters.
 */

import { Pool } from "pg";

/**
 * State for the counter module containing the database connection pool
 * and optional local store for caching.
 */
export interface CounterState {
  pool: Pool;
  localStore: import("../storage/local/types.js").LocalStore | null;
}

/**
 * Options for counter operations.
 */
export interface CounterOptions {
  /**
   * Consistency level for reads.
   * - 'strong': Always read from PostgreSQL (default, most consistent)
   * - 'local': Read from local cache only (may be stale)
   * - 'eventual': Read from local cache, fallback to PostgreSQL on miss
   */
  consistency?: 'strong' | 'local' | 'eventual';
}

/**
 * Result of a counter operation.
 */
export interface CounterResult {
  /** The counter value */
  value: number;
}