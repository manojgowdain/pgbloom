/**
 * Main pgbloom client.
 *
 * Provides cache, pub/sub, and queue functionality backed by PostgreSQL.
 * Includes optional internal Bloom Filter for cache optimization.
 */
import pg from "pg";
import { randomUUID } from "crypto";
import { BloomFilter } from "../bloom/index.js";
import { createPool, testConnection } from "../database/index.js";
import { initializeAll } from "../database/initialize.js";
import { createCacheState, initializeBloomFilter, startBloomRebuildTimer, stopBloomRebuildTimer, setCache, getCache, deleteCache, clearCache, clearExpiredCache, } from "../cache/index.js";
import { createPubSubState, subscribe, publish, closePubSub, } from "../pubsub/index.js";
import { createQueueState, enqueue, dequeue, completeJob, failJob, getQueueStats, cleanupJobs, } from "../queue/index.js";
import { validateConnectionString } from "../utils/validation.js";
// Lock imports
import { createLockState, tryLock, lock as lockFn, unlock, acquireLeadership, releaseLeadership, isLeader, } from "../lock/index.js";
// Scheduler imports
import { createSchedulerState, schedule, scheduleRecurring, cancelSchedule, getScheduleJob, listScheduledJobs, } from "../scheduler/index.js";
// Rate Limit imports
import { createRateLimitState, rateLimit, rateLimitTokenBucket, } from "../rate-limit/index.js";
// Events imports
import { createEventsState, emit, listen, getEventHistory, replayEvents, closeEvents, } from "../events/index.js";
// Counter imports
import { createCounterState, increment, decrement, add, subtract, get as counterGet, set as counterSet, remove as counterRemove, } from "../counter/index.js";
// Model imports
import { createModelState, createModel, } from "../model/index.js";
// Auth imports - class as value, types separate
import { createAuthState, Auth, } from "../auth/index.js";
const { Pool } = pg;
/**
 * Creates a new pgbloom client.
 *
 * @param connectionString - PostgreSQL connection string (postgres:// or postgresql://)
 * @param options - Configuration options
 */
export async function createPgbloom(connectionString, options = {}) {
    validateConnectionString(connectionString);
    // Build pool options
    const poolOptions = {
        connectionString,
        max: options.maxConnections,
        idleTimeoutMillis: options.idleTimeoutMillis,
        connectionTimeoutMillis: options.connectionTimeoutMillis,
    };
    const pool = createPool(poolOptions);
    // Test the connection
    await testConnection(pool);
    // Initialize database schema
    await initializeAll(pool);
    // Build cache Bloom Filter options
    const bloomEnabled = options.bloomFilter ?? false;
    const cacheBloomOptions = {
        enabled: bloomEnabled,
        expectedItems: options.bloom?.expectedItems,
        falsePositiveRate: options.bloom?.falsePositiveRate,
        rebuildInterval: options.bloom?.rebuildInterval,
    };
    // Create internal state
    const internal = {
        pool,
        cache: createCacheState(pool, cacheBloomOptions),
        pubsub: createPubSubState(pool),
        queue: createQueueState(pool, options.queue),
        lockState: options.lock ? createLockState(pool, null, options.lock.defaultTtl) : null,
        schedulerState: options.scheduler ? createSchedulerState(pool, null, options.scheduler.workerId ?? randomUUID()) : null,
        rateLimitState: createRateLimitState(pool, null),
        eventsState: createEventsState(pool, null),
        counterState: createCounterState(pool, null),
        modelStates: new Map(),
        authState: null,
        cleanupTimer: null,
        closed: false,
    };
    // Initialize internal Bloom Filter (load existing keys from DB)
    if (bloomEnabled) {
        await initializeBloomFilter(internal.cache);
        startBloomRebuildTimer(internal.cache);
    }
    // Start automatic cache cleanup timer
    const cleanupInterval = options.cleanupInterval ?? 5 * 60 * 1000;
    if (cleanupInterval !== false) {
        const timer = setInterval(async () => {
            if (!internal.closed) {
                try {
                    await clearExpiredCache(internal.cache);
                }
                catch {
                    // Ignore cleanup errors
                }
            }
        }, cleanupInterval);
        timer.unref();
        internal.cleanupTimer = timer;
    }
    // Build the public client interface
    const client = {
        // Cache
        getCache: async (key) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return getCache(internal.cache, key);
        },
        setCache: async (key, value, expiry) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return setCache(internal.cache, key, value, expiry);
        },
        deleteCache: async (key) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return deleteCache(internal.cache, key);
        },
        clearCache: async () => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return clearCache(internal.cache);
        },
        clearExpiredCache: async () => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return clearExpiredCache(internal.cache);
        },
        // Pub/Sub
        publish: async (channel, payload) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return publish(internal.pubsub.pool, channel, payload);
        },
        subscribe: async (channel, handler) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return subscribe(internal.pubsub, channel, handler);
        },
        // Queue
        enqueue: async (queueName, payload, opts) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return enqueue(internal.queue, queueName, payload, opts);
        },
        dequeue: async (queueName) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return dequeue(internal.queue, queueName);
        },
        completeJob: async (jobId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return completeJob(internal.queue, jobId);
        },
        failJob: async (jobId, error) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return failJob(internal.queue, jobId, error);
        },
        getQueueStats: async (queueName) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return getQueueStats(internal.queue, queueName);
        },
        cleanupJobs: async (queueName, olderThan) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return cleanupJobs(internal.queue, queueName, olderThan);
        },
        // Lock (only available when `options.lock` is provided)
        tryLock: async (key, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            const result = await tryLock(internal.lockState, key, options);
            return result.acquired;
        },
        lock: async (key, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            const result = await lockFn(internal.lockState, key, options);
            if (!result.acquired) {
                throw new Error(`Failed to acquire lock for key "${key}" within timeout`);
            }
        },
        unlock: async (key, holderId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            await unlock(internal.lockState, key, holderId);
        },
        acquireLeadership: async (resource, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            const holderId = randomUUID();
            const result = await acquireLeadership(internal.lockState, {
                resource,
                holderId,
                ttl: options?.ttl,
                onLeadershipLost: options?.onLost,
            });
            return result.isLeader ? holderId : null;
        },
        releaseLeadership: async (resource, holderId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            await releaseLeadership(internal.lockState, resource, holderId);
        },
        isLeader: async (resource, holderId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.lockState)
                throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
            return isLeader(internal.lockState, resource, holderId);
        },
        // Scheduler (only available when `options.scheduler` is provided)
        schedule: async (name, payload, runAt, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.schedulerState)
                throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
            const result = await schedule(internal.schedulerState, { name, payload, runAt, ...options });
            return { id: result.job.id };
        },
        scheduleRecurring: async (name, payload, interval, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.schedulerState)
                throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
            const result = await scheduleRecurring(internal.schedulerState, { name, payload, runAt: new Date(), interval, ...options });
            return { id: result.job.id };
        },
        cancelSchedule: async (jobId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.schedulerState)
                throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
            await cancelSchedule(internal.schedulerState, jobId);
        },
        getSchedule: async (jobId) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.schedulerState)
                throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
            return getScheduleJob(internal.schedulerState, jobId);
        },
        listSchedules: async (filter) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.schedulerState)
                throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
            return listScheduledJobs(internal.schedulerState, filter);
        },
        // Rate Limit
        rateLimit: async (key, limit, windowMs) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return rateLimit(internal.rateLimitState, key, limit, windowMs);
        },
        rateLimitTokenBucket: async (key, capacity, refillRate) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return rateLimitTokenBucket(internal.rateLimitState, key, capacity, refillRate);
        },
        // Events
        emit: async (type, payload, metadata) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return emit(internal.eventsState, { type, payload, metadata });
        },
        listen: async (type, handler) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return listen(internal.eventsState, type, handler);
        },
        getEventHistory: async (options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return getEventHistory(internal.eventsState, options);
        },
        replayEvents: async (from, to, type, handler) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return replayEvents(internal.eventsState, { from, to, type, handler });
        },
        // Counter
        increment: async (key, delta) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return increment(internal.counterState, key, delta);
        },
        decrement: async (key, delta) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return decrement(internal.counterState, key, delta);
        },
        add: async (key, delta) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return add(internal.counterState, key, delta);
        },
        subtract: async (key, delta) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return subtract(internal.counterState, key, delta);
        },
        getCounter: async (key, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return counterGet(internal.counterState, key, options);
        },
        setCounter: async (key, value) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return counterSet(internal.counterState, key, value);
        },
        removeCounter: async (key) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return counterRemove(internal.counterState, key);
        },
        // Model / CRUD
        model: (tableName, schema, options) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            let state = internal.modelStates.get(tableName);
            if (!state) {
                state = createModelState(pool, tableName, schema || {}, options || {}, null);
                internal.modelStates.set(tableName, state);
            }
            return createModel(pool, tableName, schema || {}, options || {}, null);
        },
        // Authentication
        auth: (authOptions) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            if (!internal.authState) {
                const authOpts = {
                    ...options.auth,
                    ...authOptions,
                    jwtSecret: authOptions?.jwtSecret || options.auth?.jwtSecret || process.env.JWT_SECRET || process.env.PGBLOOM_JWT_SECRET,
                };
                internal.authState = createAuthState(pool, null, authOpts);
            }
            return new Auth(internal.authState);
        },
        // Public Bloom Filter API (independent from internal cache Bloom Filter)
        bloom: (bloomOptions) => {
            if (internal.closed)
                throw new Error("PGSnap client is closed");
            return new BloomFilter(bloomOptions);
        },
        // Lifecycle
        close: async () => {
            if (internal.closed)
                return;
            internal.closed = true;
            if (internal.cleanupTimer) {
                clearInterval(internal.cleanupTimer);
                internal.cleanupTimer = null;
            }
            stopBloomRebuildTimer(internal.cache);
            if (internal.eventsState) {
                await closeEvents(internal.eventsState);
            }
            await closePubSub(internal.pubsub);
            await pool.end();
        },
    };
    return client;
}
/**
 * Default export for convenience: `import pgbloom from "pgbloom"`
 * Usage: `const pgsnap = await pgbloom(connectionString, options)`
 */
export default createPgbloom;
//# sourceMappingURL=PGSnap.js.map