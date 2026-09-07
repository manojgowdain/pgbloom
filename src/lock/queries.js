/**
 * PostgreSQL queries for lock operations.
 */
/**
 * Try to acquire a lock atomically using INSERT ... ON CONFLICT.
 * Returns true if the lock was acquired, false otherwise.
 */
export async function tryAcquireLock(pool, lockKey, holderId, expiresAt) {
    const result = await pool.query(`INSERT INTO pgbloom_locks (lock_key, holder_id, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (lock_key) DO NOTHING
     RETURNING lock_key`, [lockKey, holderId, expiresAt]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Release a lock only if the holder ID matches.
 * Returns true if the lock was released, false otherwise.
 */
export async function releaseLock(pool, lockKey, holderId) {
    const result = await pool.query(`DELETE FROM pgbloom_locks
     WHERE lock_key = $1 AND holder_id = $2
     RETURNING lock_key`, [lockKey, holderId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Extend a lock's TTL only if the holder ID matches.
 * Returns true if the lock was extended, false otherwise.
 */
export async function extendLock(pool, lockKey, holderId, newExpiresAt) {
    const result = await pool.query(`UPDATE pgbloom_locks
     SET expires_at = $1
     WHERE lock_key = $2 AND holder_id = $3
     RETURNING lock_key`, [newExpiresAt, lockKey, holderId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Get lock information.
 * Returns lock info if lock exists and is not expired, null otherwise.
 */
export async function getLockInfo(pool, lockKey) {
    const result = await pool.query(`SELECT holder_id, acquired_at, expires_at
     FROM pgbloom_locks
     WHERE lock_key = $1 AND expires_at > NOW()`, [lockKey]);
    if (result.rowCount === 0) {
        return null;
    }
    const row = result.rows[0];
    return {
        holderId: row.holder_id,
        acquiredAt: new Date(row.acquired_at),
        expiresAt: new Date(row.expires_at)
    };
}
//# sourceMappingURL=queries.js.map