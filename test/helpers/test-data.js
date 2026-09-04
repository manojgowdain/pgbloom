/**
 * Test data helpers — unique RUN_ID, namespaced keys, cleanup utilities.
 */

import { randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

export const RUN_ID = `${Date.now()}-${process.pid}-${randomUUID().slice(0, 8)}`;

export function key(prefix) {
  return `pgbloom-test-${RUN_ID}:${prefix}`;
}

export function channel(prefix) {
  return `pgbloom-test-${RUN_ID}:channel:${prefix}`;
}

export function queueName(prefix) {
  return `pgbloom-test-${RUN_ID}:queue:${prefix}`;
}

export function scheduleName(prefix) {
  return `pgbloom-test-${RUN_ID}:schedule:${prefix}`;
}

export function eventType(prefix) {
  return `pgbloom-test-${RUN_ID}:event:${prefix}`;
}

export function counterKey(prefix) {
  return `pgbloom-test-${RUN_ID}:counter:${prefix}`;
}

export function lockKey(prefix) {
  return `pgbloom-test-${RUN_ID}:lock:${prefix}`;
}

export function resourceKey(prefix) {
  return `pgbloom-test-${RUN_ID}:leader:${prefix}`;
}

/**
 * Create a temporary local-storage directory for ssdiskdb.
 */
export function makeTempDir(suffix = "") {
  return fs.mkdtemp(path.join(os.tmpdir(), `pgbloom-test-${RUN_ID}${suffix}-`));
}

/**
 * Best-effort cleanup of all PGBloom test data created in the database.
 * Uses prefixed identifiers, so it touches ONLY rows belonging to this RUN_ID.
 */
export async function cleanupDatabase(client, prefix = RUN_ID) {
  const p = `%${prefix}%`;
  try { await client.pool.query(`DELETE FROM pgsnap_cache WHERE key LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgsnap_queue WHERE queue_name LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgbloom_locks WHERE lock_key LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgbloom_schedules WHERE name LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgbloom_rate_limits WHERE key LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgbloom_events WHERE type LIKE $1`, [p]); } catch { /* ignore */ }
  try { await client.pool.query(`DELETE FROM pgbloom_counters WHERE key LIKE $1`, [p]); } catch { /* ignore */ }
}

/**
 * Remove a temporary directory recursively.
 */
export async function rmTempDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

/**
 * Sleep helper.
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
