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
export async function incrementFixedWindow(
  pool: Pool,
  key: string,
  windowStart: Date,
  windowEnd: Date,
  limit: number
): Promise<number> {
  const result = await pool.query(
    `INSERT INTO pgbloom_rate_limits (key, window_start, window_end, count, limit_val, algorithm)
     VALUES ($1, $2, $3, 1, $4, 'fixed_window')
     ON CONFLICT (key, window_start, algorithm) DO UPDATE SET
       count = pgbloom_rate_limits.count + 1,
       window_end = $3
     RETURNING count`,
    [key, windowStart, windowEnd, limit]
  );

  return parseInt(result.rows[0].count as string, 10);
}

/**
 * Gets the current count for a fixed window without incrementing.
 */
export async function getFixedWindow(
  pool: Pool,
  key: string,
  windowStart: Date
): Promise<number> {
  const result = await pool.query(
    `SELECT count FROM pgbloom_rate_limits
     WHERE key = $1 AND window_start = $2 AND algorithm = 'fixed_window'`,
    [key, windowStart]
  );

  if (result.rowCount === 0) {
    return 0;
  }

  return parseInt(result.rows[0].count as string, 10);
}

/**
 * Sliding Window Rate Limiting Queries
 */

/**
 * Records a request in the sliding window and returns whether allowed.
 * Uses a transaction to atomically clean old entries, count, and insert.
 */
export async function checkSlidingWindow(
  pool: Pool,
  key: string,
  windowMs: number,
  limit: number
): Promise<{ allowed: boolean; count: number; resetAt: Date }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Delete expired entries
    await client.query(
      `DELETE FROM pgbloom_rate_limits
       WHERE key = $1 AND algorithm = 'sliding_window' AND window_end < $2`,
      [key, windowStart]
    );

    // Count current entries in window
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM pgbloom_rate_limits
       WHERE key = $1 AND algorithm = 'sliding_window' AND window_end >= $2`,
      [key, windowStart]
    );

    const currentCount = parseInt(countResult.rows[0].count as string, 10);

    if (currentCount < limit) {
      // Insert new request
      await client.query(
        `INSERT INTO pgbloom_rate_limits (key, window_start, window_end, count, limit_val, algorithm)
         VALUES ($1, $2, $3, 1, $4, 'sliding_window')`,
        [key, windowStart, now, limit]
      );
      await client.query("COMMIT");
      return {
        allowed: true,
        count: currentCount + 1,
        resetAt: new Date(now.getTime() + windowMs),
      };
    } else {
      await client.query("ROLLBACK");
      return {
        allowed: false,
        count: currentCount,
        resetAt: new Date(now.getTime() + windowMs),
      };
    }
  } finally {
    client.release();
  }
}

/**
 * Token Bucket Rate Limiting Queries
 */

/**
 * Gets or creates a token bucket entry.
 */
export async function getTokenBucket(
  pool: Pool,
  key: string
): Promise<{ tokens: number; lastRefill: Date; capacity: number; refillRate: number } | null> {
  const result = await pool.query(
    `SELECT count as tokens, window_end as last_refill, limit_val as capacity, 0 as refill_rate
     FROM pgbloom_rate_limits
     WHERE key = $1 AND algorithm = 'token_bucket'
     ORDER BY window_end DESC LIMIT 1`,
    [key]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    tokens: parseFloat(row.tokens as string),
    lastRefill: new Date(row.last_refill as string),
    capacity: parseInt(row.capacity as string, 10),
    refillRate: 0, // Will be set by caller
  };
}

/**
 * Updates the token bucket state atomically.
 */
export async function updateTokenBucket(
  pool: Pool,
  key: string,
  tokens: number,
  lastRefill: Date,
  capacity: number,
  refillRate: number
): Promise<void> {
  await pool.query(
    `INSERT INTO pgbloom_rate_limits (key, window_start, window_end, count, limit_val, algorithm)
     VALUES ($1, $2, $3, $4, $5, 'token_bucket')
     ON CONFLICT (key, window_start, algorithm) DO UPDATE SET
       count = $4,
       window_end = $3,
       limit_val = $5`,
    [key, lastRefill, new Date(), tokens, capacity]
  );
}

/**
 * Cleanup Queries
 */

/**
 * Cleans up expired rate limit entries across all algorithms.
 */
export async function cleanupExpiredRateLimits(
  pool: Pool,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await pool.query(
    `DELETE FROM pgbloom_rate_limits
     WHERE window_end < $1`,
    [cutoff]
  );
  return result.rowCount ?? 0;
}