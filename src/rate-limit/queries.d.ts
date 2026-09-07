/**
 * PostgreSQL queries for rate limit operations.
 */
import { Pool } from "pg";
/**
 * Fixed Window Rate Limiting Queries
 */
/**
 * Atomically increments the fixed window counter and returns the current count.
 * Uses INSERT ... ON CONFLICT to atomically create or increment.
 */
export declare function incrementFixedWindow(pool: Pool, key: string, windowStart: Date, windowEnd: Date, limit: number): Promise<number>;
/**
 * Gets the current count for a fixed window without incrementing.
 */
export declare function getFixedWindow(pool: Pool, key: string, windowStart: Date): Promise<number>;
/**
 * Sliding Window Rate Limiting Queries
 */
/**
 * Records a request in the sliding window and returns whether allowed.
 * Uses a transaction to atomically clean old entries, count, and insert.
 */
export declare function checkSlidingWindow(pool: Pool, key: string, windowMs: number, limit: number): Promise<{
    allowed: boolean;
    count: number;
    resetAt: Date;
}>;
/**
 * Token Bucket Rate Limiting Queries
 */
/**
 * Gets or creates a token bucket entry.
 */
export declare function getTokenBucket(pool: Pool, key: string): Promise<{
    tokens: number;
    lastRefill: Date;
    capacity: number;
    refillRate: number;
} | null>;
/**
 * Updates the token bucket state atomically.
 */
export declare function updateTokenBucket(pool: Pool, key: string, tokens: number, lastRefill: Date, capacity: number, refillRate: number): Promise<void>;
/**
 * Cleanup Queries
 */
/**
 * Cleans up expired rate limit entries across all algorithms.
 */
export declare function cleanupExpiredRateLimits(pool: Pool, maxAgeMs?: number): Promise<number>;
//# sourceMappingURL=queries.d.ts.map