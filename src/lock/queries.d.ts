/**
 * PostgreSQL queries for lock operations.
 */
import { Pool } from "pg";
/**
 * Try to acquire a lock atomically using INSERT ... ON CONFLICT.
 * Returns true if the lock was acquired, false otherwise.
 */
export declare function tryAcquireLock(pool: Pool, lockKey: string, holderId: string, expiresAt: Date): Promise<boolean>;
/**
 * Release a lock only if the holder ID matches.
 * Returns true if the lock was released, false otherwise.
 */
export declare function releaseLock(pool: Pool, lockKey: string, holderId: string): Promise<boolean>;
/**
 * Extend a lock's TTL only if the holder ID matches.
 * Returns true if the lock was extended, false otherwise.
 */
export declare function extendLock(pool: Pool, lockKey: string, holderId: string, newExpiresAt: Date): Promise<boolean>;
/**
 * Get lock information.
 * Returns lock info if lock exists and is not expired, null otherwise.
 */
export declare function getLockInfo(pool: Pool, lockKey: string): Promise<{
    holderId: string;
    acquiredAt: Date;
    expiresAt: Date;
} | null>;
//# sourceMappingURL=queries.d.ts.map