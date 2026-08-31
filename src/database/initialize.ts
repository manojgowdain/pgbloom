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
 * Initializes all PGSnap tables.
 */
export async function initializeAll(pool: Pool): Promise<void> {
  await initializeCacheTable(pool);
  await initializeQueueTable(pool);
  await initializePubSub(pool);
}