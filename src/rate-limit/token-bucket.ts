/**
 * Token Bucket Rate Limiter implementation.
 */

import { Pool } from "pg";
import { getTokenBucket, updateTokenBucket } from "./queries.js";
import type { RateLimitState, TokenBucketOptions, RateLimitResult } from "./types.js";

/**
 * Checks and consumes a rate limit using the token bucket algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export async function tokenBucket(
  state: RateLimitState,
  options: TokenBucketOptions
): Promise<RateLimitResult> {
  const { key, capacity, refillRate } = options;
  const now = new Date();

  // Get current bucket state
  const bucket = await getTokenBucket(state.pool, key);

  let tokens: number;
  let lastRefill: Date;

  if (bucket) {
    // Calculate tokens to add based on elapsed time
    const elapsedMs = now.getTime() - bucket.lastRefill.getTime();
    const tokensToAdd = (elapsedMs / 1000) * refillRate;
    tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    lastRefill = now;
  } else {
    // New bucket starts full
    tokens = capacity;
    lastRefill = now;
  }

  let allowed = false;
  if (tokens >= 1) {
    tokens -= 1;
    allowed = true;
  }

  // Update bucket state in database
  await updateTokenBucket(state.pool, key, tokens, lastRefill, capacity, refillRate);

  // Calculate resetAt (when next token will be available if empty)
  let resetAt: Date;
  if (allowed) {
    resetAt = new Date(now.getTime() + (1 / refillRate) * 1000);
  } else {
    // Time until next token
    const tokensNeeded = 1 - tokens;
    const msUntilNextToken = (tokensNeeded / refillRate) * 1000;
    resetAt = new Date(now.getTime() + msUntilNextToken);
  }

  return {
    allowed,
    limit: capacity,
    remaining: Math.max(0, Math.floor(tokens)),
    resetAt,
  };
}