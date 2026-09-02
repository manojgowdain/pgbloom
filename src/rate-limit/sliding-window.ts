/**
 * Sliding Window Rate Limiter implementation.
 */

import { Pool } from "pg";
import { checkSlidingWindow } from "./queries.js";
import type { RateLimitState, RateLimitOptions, RateLimitResult } from "./types.js";

/**
 * Checks and consumes a rate limit using the sliding window algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export async function slidingWindow(
  state: RateLimitState,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;

  const result = await checkSlidingWindow(state.pool, key, windowMs, limit);

  const remaining = result.allowed ? limit - result.count : 0;

  return {
    allowed: result.allowed,
    limit,
    remaining,
    resetAt: result.resetAt,
  };
}