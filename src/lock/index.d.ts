/**
 * Lock module for distributed locking and leader election.
 */
import { Pool } from "pg";
import type { LockState, LockOptions, LockResult, LeaderElectionOptions, LeaderElectionResult } from "./types.js";
export type { LockState, LockOptions, LockResult, LeaderElectionOptions, LeaderElectionResult };
/**
 * Creates a new lock state with the database connection pool
 * and optional local store for caching.
 */
export declare function createLockState(pool: Pool, localStore?: import("../storage/local/types.js").LocalStore | null, defaultTtl?: number): LockState;
/**
 * Try to acquire a lock once, returning immediately with result.
 * Uses atomic INSERT ... ON CONFLICT to prevent race conditions.
 */
export declare function tryLock(state: LockState, lockKey: string, options?: LockOptions): Promise<LockResult>;
/**
 * Wait for lock acquisition with exponential backoff polling.
 * Will retry until lock is acquired or timeout is reached.
 */
export declare function lock(state: LockState, lockKey: string, options?: LockOptions & {
    timeout?: number;
}): Promise<LockResult>;
/**
 * Release a lock, verifying that the holder ID matches.
 * Only the holder that acquired the lock can release it.
 */
export declare function unlock(state: LockState, lockKey: string, holderId: string): Promise<boolean>;
/**
 * Get lock information including holder and expiration time.
 * Returns null if lock doesn't exist or is expired.
 */
export declare function getLockInfo(state: LockState, lockKey: string): Promise<{
    holderId: string;
    acquiredAt: Date;
    expiresAt: Date;
} | null>;
/**
 * Extend a lock's TTL, verifying that the holder ID matches.
 * Returns true if lock was extended, false otherwise.
 */
export declare function extendLock(state: LockState, lockKey: string, holderId: string, extensionMs: number): Promise<boolean>;
/**
 * Try to acquire leadership for a resource. Returns a result indicating
 * whether this instance is now the leader. If successful, sets up an
 * automatic heartbeat to renew the leadership TTL.
 */
export declare function acquireLeadership(state: LockState, options: LeaderElectionOptions): Promise<LeaderElectionResult>;
/**
 * Release leadership for a resource, verifying the holder ID matches.
 * Stops the automatic heartbeat. Returns true if leadership was released.
 */
export declare function releaseLeadership(state: LockState, resource: string, holderId: string): Promise<boolean>;
/**
 * Check if the given holder is currently the leader for a resource.
 */
export declare function isLeader(state: LockState, resource: string, holderId: string): Promise<boolean>;
/**
 * Renew (extend) the leadership TTL for a resource. Returns true if
 * the renewal was successful. If the lock has expired or has been
 * taken by another holder, returns false.
 */
export declare function renewLeadership(state: LockState, resource: string, holderId: string, ttlMs?: number): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map