/**
 * PostgreSQL queries for lock operations.
 */

import { Pool } from "pg";

/**
 * Try to acquire a lock atomically using INSERT ... ON CONFLICT.
 * Returns true if the lock was acquired, false otherwise.
 */
export async function tryAcquireLock(
  pool: Pool,
  lockKey: string,
  holderId: string,
  expiresAt: Date
): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO pgbloom_locks (lock_key, holder_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (lock_key) DO NOTHING
     RETURNING lock_key`,
    [lockKey, holderId, expiresAt]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Release a lock only if the holder ID matches.
 * Returns true if the lock was released, false otherwise.
 */
export async function releaseLock(
  pool: Pool,
  lockKey: string,
  holderId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM pgbloom_locks
     WHERE lock_key = $1 AND holder_id = $2
     RETURNING lock_key`,
    [lockKey, holderId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Extend a lock's TTL only if the holder ID matches.
 * Returns true if the lock was extended, false otherwise.
 */
export async function extendLock(
  pool: Pool,
  lockKey: string,
  holderId: string,
  newExpiresAt: Date
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE pgbloom_locks
     SET expires_at = $1
     WHERE lock_key = $2 AND holder_id = $3
     RETURNING lock_key`,
    [newExpiresAt, lockKey, holderId]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Get lock information.
 * Returns lock info if lock exists and is not expired, null otherwise.
 */
export async function getLockInfo(
  pool: Pool,
  lockKey: string
): Promise<{ holderId: string; acquiredAt: Date; expiresAt: Date } | null> {
  const result = await pool.query(
    `SELECT holder_id, acquired_at, expires_at
     FROM pgbloom_locks
     WHERE lock_key = $1 AND expires_at > NOW()`,
    [lockKey]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    holderId: row.holder_id as string,
    acquiredAt: new Date(row.acquired_at as string),
    expiresAt: new Date(row.expires_at as string)
  };
}