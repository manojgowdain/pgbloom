/**
 * Lock module for distributed locking and leader election.
 */
import { randomUUID } from "crypto";
import { tryAcquireLock, releaseLock, extendLock as extendLockQuery, getLockInfo as getLockInfoQuery, } from "./queries.js";
/**
 * Creates a new lock state with the database connection pool
 * and optional local store for caching.
 */
export function createLockState(pool, localStore = null, defaultTtl = 30000 // 30 seconds default TTL
) {
    return {
        pool,
        localStore,
        defaultTtl,
    };
}
/**
 * Try to acquire a lock once, returning immediately with result.
 * Uses atomic INSERT ... ON CONFLICT to prevent race conditions.
 */
export async function tryLock(state, lockKey, options = {}) {
    const ttl = options.ttl ?? state.defaultTtl;
    const holderId = randomUUID();
    const expiresAt = new Date(Date.now() + ttl);
    const acquired = await tryAcquireLock(state.pool, lockKey, holderId, expiresAt);
    if (acquired) {
        return {
            acquired: true,
            holderId,
            expiresAt,
        };
    }
    return {
        acquired: false,
    };
}
/**
 * Wait for lock acquisition with exponential backoff polling.
 * Will retry until lock is acquired or timeout is reached.
 */
export async function lock(state, lockKey, options = {}) {
    const ttl = options.ttl ?? state.defaultTtl;
    const holderId = randomUUID();
    const timeoutMs = options.timeout ?? 5000; // 5 second default timeout
    const startTime = Date.now();
    let delay = 10; // Start with 10ms delay
    const maxDelay = 1000; // Cap delay at 1 second
    while (Date.now() - startTime < timeoutMs) {
        const expiresAt = new Date(Date.now() + ttl);
        const acquired = await tryAcquireLock(state.pool, lockKey, holderId, expiresAt);
        if (acquired) {
            return {
                acquired: true,
                holderId,
                expiresAt,
            };
        }
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxDelay);
    }
    // Timeout reached
    return {
        acquired: false,
    };
}
/**
 * Release a lock, verifying that the holder ID matches.
 * Only the holder that acquired the lock can release it.
 */
export async function unlock(state, lockKey, holderId) {
    return releaseLock(state.pool, lockKey, holderId);
}
/**
 * Get lock information including holder and expiration time.
 * Returns null if lock doesn't exist or is expired.
 */
export async function getLockInfo(state, lockKey) {
    return getLockInfoQuery(state.pool, lockKey);
}
/**
 * Extend a lock's TTL, verifying that the holder ID matches.
 * Returns true if lock was extended, false otherwise.
 */
export async function extendLock(state, lockKey, holderId, extensionMs) {
    const lockInfo = await getLockInfoQuery(state.pool, lockKey);
    if (!lockInfo || lockInfo.holderId !== holderId) {
        return false;
    }
    const newExpiresAt = new Date(Date.now() + extensionMs);
    return extendLockQuery(state.pool, lockKey, holderId, newExpiresAt);
}
/**
 * Internal: Generate the lock key for a leader election resource.
 */
function leaderKey(resource) {
    return `leader:${resource}`;
}
/**
 * Internal: Compute the heartbeat interval for a given TTL.
 * Uses 1/3 of the TTL to allow for 3 renewal attempts before expiry.
 */
function computeHeartbeatInterval(ttl) {
    return Math.max(Math.floor(ttl / 3), 1000);
}
/**
 * Try to acquire leadership for a resource. Returns a result indicating
 * whether this instance is now the leader. If successful, sets up an
 * automatic heartbeat to renew the leadership TTL.
 */
export async function acquireLeadership(state, options) {
    const ttl = options.ttl ?? state.defaultTtl;
    const key = leaderKey(options.resource);
    const expiresAt = new Date(Date.now() + ttl);
    const acquired = await tryAcquireLock(state.pool, key, options.holderId, expiresAt);
    if (!acquired) {
        // Check if we are already the leader (idempotent re-acquisition)
        const existing = await getLockInfoQuery(state.pool, key);
        if (existing && existing.holderId === options.holderId) {
            return {
                isLeader: true,
                acquiredAt: existing.acquiredAt,
                expiresAt: existing.expiresAt,
            };
        }
        return { isLeader: false };
    }
    // Start automatic heartbeat to renew leadership
    const intervalMs = computeHeartbeatInterval(ttl);
    const intervalId = setInterval(async () => {
        try {
            const renewed = await renewLeadership(state, options.resource, options.holderId, ttl);
            if (!renewed && options.onLeadershipLost) {
                options.onLeadershipLost();
            }
        }
        catch (err) {
            // On unexpected error during renewal, treat as leadership lost
            if (options.onLeadershipLost) {
                options.onLeadershipLost();
            }
        }
    }, intervalMs);
    // Don't block the Node.js event loop from exiting on heartbeat intervals
    if (typeof intervalId === "object" && intervalId !== null && "unref" in intervalId) {
        intervalId.unref();
    }
    // Track heartbeat for later cleanup via a weak global registry on state
    attachHeartbeat(state, options.resource, options.holderId, intervalId);
    return {
        isLeader: true,
        acquiredAt: new Date(),
        expiresAt,
    };
}
/**
 * Release leadership for a resource, verifying the holder ID matches.
 * Stops the automatic heartbeat. Returns true if leadership was released.
 */
export async function releaseLeadership(state, resource, holderId) {
    const key = leaderKey(resource);
    // Stop the heartbeat first to prevent it from re-acquiring after release
    detachHeartbeat(state, resource, holderId);
    return releaseLock(state.pool, key, holderId);
}
/**
 * Check if the given holder is currently the leader for a resource.
 */
export async function isLeader(state, resource, holderId) {
    const key = leaderKey(resource);
    const info = await getLockInfoQuery(state.pool, key);
    if (!info) {
        return false;
    }
    return info.holderId === holderId;
}
/**
 * Renew (extend) the leadership TTL for a resource. Returns true if
 * the renewal was successful. If the lock has expired or has been
 * taken by another holder, returns false.
 */
export async function renewLeadership(state, resource, holderId, ttlMs) {
    const key = leaderKey(resource);
    const ttl = ttlMs ?? state.defaultTtl;
    const newExpiresAt = new Date(Date.now() + ttl);
    return extendLockQuery(state.pool, key, holderId, newExpiresAt);
}
const heartbeatRegistry = new WeakMap();
function registryFor(state) {
    let map = heartbeatRegistry.get(state);
    if (!map) {
        map = new Map();
        heartbeatRegistry.set(state, map);
    }
    return map;
}
function attachHeartbeat(state, resource, holderId, intervalId) {
    const key = `${resource}::${holderId}`;
    const map = registryFor(state);
    // If there is already a heartbeat for this key, clear it first
    const existing = map.get(key);
    if (existing) {
        clearInterval(existing.intervalId);
    }
    map.set(key, { intervalId });
}
function detachHeartbeat(state, resource, holderId) {
    const key = `${resource}::${holderId}`;
    const map = registryFor(state);
    const existing = map.get(key);
    if (existing) {
        clearInterval(existing.intervalId);
        map.delete(key);
    }
}
//# sourceMappingURL=index.js.map