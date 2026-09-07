/**
 * Database schema initialization.
 */
import { Pool } from "pg";
/**
 * Creates the cache table if it doesn't exist.
 */
export declare function initializeCacheTable(pool: Pool): Promise<void>;
/**
 * Creates the queue table if it doesn't exist.
 */
export declare function initializeQueueTable(pool: Pool): Promise<void>;
/**
 * Creates the pub/sub support (no additional tables needed for LISTEN/NOTIFY).
 * This is a no-op but kept for symmetry and potential future extensions.
 */
export declare function initializePubSub(pool: Pool): Promise<void>;
/**
 * Creates the locks table if it doesn't exist.
 * Used for distributed locks and leader election.
 */
export declare function initializeLocksTable(pool: Pool): Promise<void>;
/**
 * Creates the scheduler table if it doesn't exist.
 * Used for delayed jobs, recurring jobs, and retry jobs.
 */
export declare function initializeSchedulerTable(pool: Pool): Promise<void>;
/**
 * Creates the rate limits table if it doesn't exist.
 * Used for fixed window, sliding window, and token bucket rate limiting.
 */
export declare function initializeRateLimitTable(pool: Pool): Promise<void>;
/**
 * Creates the events table if it doesn't exist.
 * Used for event storage, history, and replay.
 */
export declare function initializeEventsTable(pool: Pool): Promise<void>;
/**
 * Creates the counters table if it doesn't exist.
 * Used for atomic increment/decrement operations.
 */
export declare function initializeCountersTable(pool: Pool): Promise<void>;
/**
 * Creates the users table for authentication.
 */
export declare function initializeUsersTable(pool: Pool): Promise<void>;
/**
 * Creates the sessions table for refresh tokens.
 */
export declare function initializeSessionsTable(pool: Pool): Promise<void>;
/**
 * Creates the OTP codes table.
 */
export declare function initializeOtpCodesTable(pool: Pool): Promise<void>;
/**
 * Initializes all PGSnap tables.
 */
export declare function initializeAll(pool: Pool): Promise<void>;
//# sourceMappingURL=initialize.d.ts.map