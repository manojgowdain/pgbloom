/**
 * Rate limit module types for distributed rate limiting.
 * Supports fixed window, sliding window, and token bucket algorithms.
 */

import { Pool } from "pg";

/**
 * State for the rate limit module containing the database connection pool
 * and optional local store for caching.
 */
export interface RateLimitState {
  pool: Pool;
  localStore: import("../storage/local/types.js").LocalStore | null;
}

/**
 * Generic rate limit options (for fixed window and sliding window).
 */
export interface RateLimitOptions {
  /** The key to rate limit on */
  key: string;
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Token bucket options configuration.
 */
export interface TokenBucketOptions {
  /** The key to rate limit on */
  key: string;
  /** Maximum number of tokens the bucket can hold (burst capacity) */
  capacity: number;
  /** Token refill rate in tokens per second */
  refillRate: number;
}

/**
 * Result of a rate limit check/consume operation.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current/remaining tokens (for token bucket) or remaining requests */
  remaining: number;
  /** Maximum limit allowed */
  limit: number;
  /** Timestamp when the rate limit resets (Date) */
  resetAt: Date;
  /** Algorithm used for rate limiting */
  algorithm?: string;
  /** Human-readable key for debugging */
  key?: string;
}

/**
 * Fixed window options with algorithm tag.
 */
export interface FixedWindowOptions extends RateLimitOptions {
  algorithm: 'fixed_window';
}

/**
 * Sliding window options with algorithm tag.
 */
export interface SlidingWindowOptions extends RateLimitOptions {
  algorithm: 'sliding_window';
}