/**
 * Rate Limit module with Fixed Window, Sliding Window, and Token Bucket algorithms.
 */
import { Pool } from "pg";
import type { RateLimitState, RateLimitOptions, TokenBucketOptions, RateLimitResult } from "./types.js";
export type { RateLimitState, RateLimitOptions, TokenBucketOptions, RateLimitResult };
/**
 * Creates a new rate limit state with the database connection pool
 * and optional local store for caching.
 */
export declare function createRateLimitState(pool: Pool, localStore?: import("../storage/local/types.js").LocalStore | null): RateLimitState;
/**
 * Checks rate limit using the fixed window algorithm.
 */
export declare function checkRateLimit(state: RateLimitState, options: RateLimitOptions): Promise<RateLimitResult>;
/**
 * Checks rate limit using the sliding window algorithm.
 */
export declare function checkSlidingRateLimit(state: RateLimitState, options: RateLimitOptions): Promise<RateLimitResult>;
/**
 * Checks rate limit using the token bucket algorithm.
 */
export declare function checkTokenBucketRateLimit(state: RateLimitState, options: TokenBucketOptions): Promise<RateLimitResult>;
/**
 * Convenience function for simple fixed window rate limiting.
 */
export declare function rateLimit(state: RateLimitState, key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
/**
 * Convenience function for simple token bucket rate limiting.
 */
export declare function rateLimitTokenBucket(state: RateLimitState, key: string, capacity: number, refillRate: number): Promise<RateLimitResult>;
/**
 * Cleans up expired rate limit entries.
 */
export declare function cleanup(state: RateLimitState, maxAgeMs?: number): Promise<number>;
/**
 * Generates a unique rate limit key with optional prefix.
 */
export declare function generateKey(prefix: string, identifier: string): string;
/**
 * Generates a unique rate limit key for a user/API combination.
 */
export declare function generateUserKey(userId: string, api?: string): string;
/**
 * Generates a unique rate limit key for an IP address.
 */
export declare function generateIpKey(ip: string, endpoint?: string): string;
//# sourceMappingURL=index.d.ts.map