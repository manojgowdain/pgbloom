/**
 * Database schema initialization.
 */

import { Pool } from "pg";

/**
 * Creates the cache table if it doesn't exist.
 */
export async function initializeCacheTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgsnap_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pgsnap_cache_expires_at_idx ON pgsnap_cache (expires_at);
  `);
}

/**
 * Creates the queue table if it doesn't exist.
 */
export async function initializeQueueTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgsnap_queue (
      id BIGSERIAL PRIMARY KEY,
      queue_name TEXT NOT NULL,
      payload JSONB NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 3,
      visibility_timeout INT NOT NULL DEFAULT 30000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS pgsnap_queue_name_status_idx ON pgsnap_queue (queue_name, status, available_at);
  `);
}

/**
 * Creates the pub/sub support (no additional tables needed for LISTEN/NOTIFY).
 * This is a no-op but kept for symmetry and potential future extensions.
 */
export async function initializePubSub(pool: Pool): Promise<void> {
  // LISTEN/NOTIFY uses PostgreSQL built-in channels; no tables required.
  // We could add a metadata table for channel tracking if needed in future.
}

/**
 * Creates the locks table if it doesn't exist.
 * Used for distributed locks and leader election.
 */
export async function initializeLocksTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgbloom_locks (
      lock_key TEXT PRIMARY KEY,
      holder_id TEXT NOT NULL,
      acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pgbloom_locks_expires_at_idx ON pgbloom_locks (expires_at);
  `);
}

/**
 * Creates the scheduler table if it doesn't exist.
 * Used for delayed jobs, recurring jobs, and retry jobs.
 */
export async function initializeSchedulerTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgbloom_schedules (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      payload JSONB NOT NULL,
      run_at TIMESTAMPTZ NOT NULL,
      priority INT NOT NULL DEFAULT 0,
      attempts INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'scheduled',
      interval TEXT,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS pgbloom_schedules_run_at_idx ON pgbloom_schedules (run_at) WHERE status = 'scheduled';
    CREATE INDEX IF NOT EXISTS pgbloom_schedules_status_priority_idx ON pgbloom_schedules (status, priority DESC, run_at);
  `);
}

/**
 * Creates the rate limits table if it doesn't exist.
 * Used for fixed window, sliding window, and token bucket rate limiting.
 */
export async function initializeRateLimitTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgbloom_rate_limits (
      key TEXT NOT NULL,
      window_start TIMESTAMPTZ NOT NULL,
      window_end TIMESTAMPTZ NOT NULL,
      count INT NOT NULL DEFAULT 0,
      limit_val INT NOT NULL,
      algorithm TEXT NOT NULL,
      PRIMARY KEY (key, window_start, algorithm)
    );
    CREATE INDEX IF NOT EXISTS pgbloom_rate_limits_key_algorithm_idx ON pgbloom_rate_limits (key, algorithm);
    CREATE INDEX IF NOT EXISTS pgbloom_rate_limits_window_end_idx ON pgbloom_rate_limits (window_end);
  `);
}

/**
 * Creates the events table if it doesn't exist.
 * Used for event storage, history, and replay.
 */
export async function initializeEventsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgbloom_events (
      id BIGSERIAL PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB
    );
    CREATE INDEX IF NOT EXISTS pgbloom_events_type_idx ON pgbloom_events (type);
    CREATE INDEX IF NOT EXISTS pgbloom_events_created_at_idx ON pgbloom_events (created_at);
    CREATE INDEX IF NOT EXISTS pgbloom_events_type_created_at_idx ON pgbloom_events (type, created_at);
  `);
}

/**
 * Creates the counters table if it doesn't exist.
 * Used for atomic increment/decrement operations.
 */
export async function initializeCountersTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pgbloom_counters (
      key TEXT PRIMARY KEY,
      value BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS pgbloom_counters_value_idx ON pgbloom_counters (value);
  `);
}

/**
 * Initializes all PGSnap tables.
 */
export async function initializeAll(pool: Pool): Promise<void> {
  await initializeCacheTable(pool);
  await initializeQueueTable(pool);
  await initializePubSub(pool);
  await initializeLocksTable(pool);
  await initializeSchedulerTable(pool);
  await initializeRateLimitTable(pool);
  await initializeEventsTable(pool);
  await initializeCountersTable(pool);
}