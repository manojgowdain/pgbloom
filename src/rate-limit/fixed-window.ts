/**
 * Fixed Window Rate Limiter implementation.
 */

import { Pool } from "pg";
import { incrementFixedWindow } from "./queries.js";
import type { RateLimitState, RateLimitOptions, RateLimitResult } from "./types.js";

/**
 * Calculates the fixed window boundaries for the current time.
 */
function calculateWindow(windowMs: number): { windowStart: Date; windowEnd: Date } {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const windowEnd = new Date(windowStart.getTime() + windowMs);
  return { windowStart, windowEnd };
}

/**
 * Checks and consumes a rate limit using the fixed window algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export async function fixedWindow(
  state: RateLimitState,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;
  const { windowStart, windowEnd } = calculateWindow(windowMs);

  const currentCount = await incrementFixedWindow(
    state.pool,
    key,
    windowStart,
    windowEnd,
    limit
  );

  const allowed = currentCount <= limit;
  const remaining = allowed ? limit - currentCount : 0;

  return {
    allowed,
    limit,
    remaining,
    resetAt: windowEnd,
  };
}