/**
 * Rate Limit module with Fixed Window, Sliding Window, and Token Bucket algorithms.
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import { fixedWindow } from "./fixed-window.js";
import { slidingWindow } from "./sliding-window.js";
import { tokenBucket } from "./token-bucket.js";
import { cleanupExpiredRateLimits } from "./queries.js";
import type {
  RateLimitState,
  RateLimitOptions,
  TokenBucketOptions,
  RateLimitResult,
} from "./types.js";

export type { RateLimitState, RateLimitOptions, TokenBucketOptions, RateLimitResult };

/**
 * Creates a new rate limit state with the database connection pool
 * and optional local store for caching.
 */
export function createRateLimitState(
  pool: Pool,
  localStore: import("../storage/local/types.js").LocalStore | null = null
): RateLimitState {
  return {
    pool,
    localStore,
  };
}

/**
 * Checks rate limit using the fixed window algorithm.
 */
export async function checkRateLimit(
  state: RateLimitState,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return fixedWindow(state, options);
}

/**
 * Checks rate limit using the sliding window algorithm.
 */
export async function checkSlidingRateLimit(
  state: RateLimitState,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return slidingWindow(state, options);
}

/**
 * Checks rate limit using the token bucket algorithm.
 */
export async function checkTokenBucketRateLimit(
  state: RateLimitState,
  options: TokenBucketOptions
): Promise<RateLimitResult> {
  return tokenBucket(state, options);
}

/**
 * Convenience function for simple fixed window rate limiting.
 */
export async function rateLimit(
  state: RateLimitState,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  return fixedWindow(state, { key, limit, windowMs });
}

/**
 * Convenience function for simple token bucket rate limiting.
 */
export async function rateLimitTokenBucket(
  state: RateLimitState,
  key: string,
  capacity: number,
  refillRate: number
): Promise<RateLimitResult> {
  return tokenBucket(state, { key, capacity, refillRate });
}

/**
 * Cleans up expired rate limit entries.
 */
export async function cleanup(
  state: RateLimitState,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  return cleanupExpiredRateLimits(state.pool, maxAgeMs);
}

/**
 * Generates a unique rate limit key with optional prefix.
 */
export function generateKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Generates a unique rate limit key for a user/API combination.
 */
export function generateUserKey(userId: string, api?: string): string {
  return api ? `ratelimit:user:${userId}:api:${api}` : `ratelimit:user:${userId}`;
}

/**
 * Generates a unique rate limit key for an IP address.
 */
export function generateIpKey(ip: string, endpoint?: string): string {
  return endpoint ? `ratelimit:ip:${ip}:endpoint:${endpoint}` : `ratelimit:ip:${ip}`;
}