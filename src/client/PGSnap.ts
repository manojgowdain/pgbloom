/**
 * Main pgbloom client.
 *
 * Provides cache, pub/sub, and queue functionality backed by PostgreSQL.
 * Includes optional internal Bloom Filter for cache optimization.
 */

import pg from "pg";
import { randomUUID } from "crypto";
import { BloomFilter } from "../bloom/index.js";
import { createPool, testConnection, type PoolOptions } from "../database/index.js";
import { initializeAll } from "../database/initialize.js";
import {
  createCacheState,
  initializeBloomFilter,
  startBloomRebuildTimer,
  stopBloomRebuildTimer,
  setCache,
  getCache,
  deleteCache,
  clearCache,
  clearExpiredCache,
  type CacheBloomOptions,
  type CacheState,
} from "../cache/index.js";
import {
  createPubSubState,
  subscribe,
  publish,
  closePubSub,
  type PubSubState,
  type MessageHandler,
} from "../pubsub/index.js";
import {
  createQueueState,
  enqueue,
  dequeue,
  completeJob,
  failJob,
  getQueueStats,
  cleanupJobs,
  type QueueState,
  type QueueJob,
  type QueueOptions,
} from "../queue/index.js";
import { validateConnectionString } from "../utils/validation.js";
import type { CacheExpiry } from "../types/index.js";

// Lock imports
import {
  createLockState,
  tryLock,
  lock as lockFn,
  unlock,
  acquireLeadership,
  releaseLeadership,
  isLeader,
  type LockState,
} from "../lock/index.js";

// Scheduler imports
import {
  createSchedulerState,
  schedule,
  scheduleRecurring,
  cancelSchedule,
  getScheduleJob,
  listScheduledJobs,
  getAndClaimDueJobs,
  claimScheduledJob,
  completeScheduledJob,
  failScheduledJob,
  type SchedulerState,
} from "../scheduler/index.js";

// Rate Limit imports
import {
  createRateLimitState,
  rateLimit,
  rateLimitTokenBucket,
  type RateLimitState,
} from "../rate-limit/index.js";

// Events imports
import {
  createEventsState,
  emit,
  listen,
  getEventHistory,
  replayEvents,
  closeEvents,
  type EventsState,
} from "../events/index.js";

// Counter imports
import {
  createCounterState,
  increment,
  decrement,
  add,
  subtract,
  get as counterGet,
  set as counterSet,
  remove as counterRemove,
  type CounterState,
} from "../counter/index.js";

const { Pool } = pg;

/**
 * pgbloom configuration options.
 */
export interface PgbloomOptions {
  /**
   * Interval in milliseconds for automatic cleanup of expired cache entries.
   * Set to `false` to disable automatic cleanup.
   *
   * @default 5 * 60 * 1000 (5 minutes)
   */
  cleanupInterval?: number | false;

  /**
   * Whether to enable the internal Bloom Filter for cache lookups.
   * When enabled, getCache() first checks the Bloom Filter and skips
   * the database query for keys that are definitely not present.
   *
   * The Bloom Filter has NO false negatives but MAY have false positives.
   * PostgreSQL remains the source of truth.
   *
   * @default false
   */
  bloomFilter?: boolean;

  /**
   * Configuration for the internal Bloom Filter (when enabled).
   */
  bloom?: {
    /**
     * Expected number of cache entries. Used to size the Bloom Filter.
     *
     * @default 10000
     */
    expectedItems?: number;

    /**
     * Target false positive rate (0 < rate < 1).
     *
     * @default 0.01
     */
    falsePositiveRate?: number;

    /**
     * Interval in milliseconds for rebuilding the Bloom Filter from
     * the current database state. Set to `false` to disable.
     *
     * @default 15 * 60 * 1000 (15 minutes)
     */
    rebuildInterval?: number | false;
  };

  /**
   * Maximum number of connections in the PostgreSQL pool.
   *
   * @default 10
   */
  maxConnections?: number;

  /**
   * Number of milliseconds a connection is allowed to be idle before being closed.
   *
   * @default 30000
   */
  idleTimeoutMillis?: number;

  /**
   * Number of milliseconds to wait for a connection to become available.
   *
   * @default 2000
   */
  connectionTimeoutMillis?: number;

  /**
   * Queue configuration.
   */
  queue?: QueueOptions;

  /**
   * Lock configuration.
   */
  lock?: {
    /**
     * Default TTL for locks in milliseconds.
     * @default 30000
     */
    defaultTtl?: number;
  };

  /**
   * Scheduler configuration.
   */
  scheduler?: {
    /**
     * Unique identifier for this scheduler worker instance.
     * Required for distributed scheduling.
     */
    workerId?: string;

    /**
     * Polling interval in milliseconds for checking due jobs.
     * @default 1000
     */
    pollingInterval?: number;
  };

  /**
   * Rate limit configuration.
   */
  rateLimit?: {
    /**
     * Default algorithm to use ('fixed_window', 'sliding_window', 'token_bucket').
     * @default 'fixed_window'
     */
    defaultAlgorithm?: 'fixed_window' | 'sliding_window' | 'token_bucket';
  };

  /**
   * Events configuration.
   */
  events?: {
    /**
     * Maximum number of event listeners per type.
     * @default 100
     */
    maxListenersPerType?: number;
  };

  /**
   * Counter configuration.
   */
  counter?: {
    /**
     * Default consistency level for counter reads.
     * @default 'strong'
     */
    defaultConsistency?: 'strong' | 'local' | 'eventual';
  };
}

/**
 * Public pgbloom client interface.
 */
export interface PgbloomClient {
  // Cache
  getCache<T = unknown>(key: string): Promise<T | null>;
  setCache<T = unknown>(key: string, value: T, expiry?: CacheExpiry): Promise<T>;
  deleteCache(key: string): Promise<void>;
  clearCache(): Promise<void>;
  clearExpiredCache(): Promise<number>;

  // Pub/Sub
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: MessageHandler): Promise<() => void>;

  // Queue
  enqueue<T>(queueName: string, payload: T, options?: {
    priority?: number;
    maxAttempts?: number;
    visibilityTimeout?: number;
  }): Promise<QueueJob<T>>;
  dequeue<T>(queueName: string): Promise<QueueJob<T> | null>;
  completeJob(jobId: number): Promise<void>;
  failJob(jobId: number, error: string): Promise<void>;
  getQueueStats(queueName: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }>;
  cleanupJobs(queueName: string, olderThan?: Date): Promise<number>;

  // Lock (only available when `options.lock` is provided)
  tryLock(key: string, options?: { ttl?: number }): Promise<boolean>;
  lock(key: string, options?: { ttl?: number; timeout?: number }): Promise<void>;
  unlock(key: string, holderId: string): Promise<void>;
  acquireLeadership(resource: string, options?: { ttl?: number; onLost?: () => void }): Promise<string | null>;
  releaseLeadership(resource: string, holderId: string): Promise<void>;
  isLeader(resource: string, holderId: string): Promise<boolean>;

  // Scheduler (only available when `options.scheduler` is provided)
  schedule(name: string, payload: unknown, runAt: Date, options?: { priority?: number; maxAttempts?: number; interval?: string }): Promise<{ id: number }>;
  scheduleRecurring(name: string, payload: unknown, interval: string, options?: { priority?: number; maxAttempts?: number }): Promise<{ id: number }>;
  cancelSchedule(jobId: number): Promise<void>;
  getSchedule(jobId: number): Promise<{ id: number; name: string; payload: unknown; runAt: Date; status: string } | null>;
  listSchedules(filter?: { status?: string; name?: string }): Promise<Array<{ id: number; name: string; payload: unknown; runAt: Date; status: string }>>;

  // Rate Limit
  rateLimit(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: Date }>;
  rateLimitTokenBucket(key: string, capacity: number, refillRate: number): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: Date }>;

  // Events
  emit(type: string, payload: unknown, metadata?: Record<string, unknown>): Promise<string>;
  listen(type: string, handler: (type: string, payload: unknown, meta: any) => void | Promise<void>): Promise<() => void>;
  getEventHistory(options?: { type?: string; from?: Date; to?: Date; limit?: number; cursor?: string }): Promise<{ events: any[]; nextCursor?: string }>;
  replayEvents(from: Date, to: Date | undefined, type: string | undefined, handler: (event: any) => void | Promise<void>): Promise<{ replayed: number }>;

  // Counter
  increment(key: string, delta?: number): Promise<{ value: number }>;
  decrement(key: string, delta?: number): Promise<{ value: number }>;
  add(key: string, delta: number): Promise<{ value: number }>;
  subtract(key: string, delta: number): Promise<{ value: number }>;
  getCounter(key: string, options?: { consistency?: 'strong' | 'local' | 'eventual' }): Promise<{ value: number }>;
  setCounter(key: string, value: number): Promise<{ value: number }>;
  removeCounter(key: string): Promise<boolean>;

  // Bloom Filter (public API - independent from internal cache Bloom Filter)
  bloom(options?: { expectedItems?: number; falsePositiveRate?: number }): BloomFilter;

  // Lifecycle
  close(): Promise<void>;
}

/**
 * Internal state of the pgbloom client.
 */
interface PgbloomInternal {
  pool: pg.Pool;
  cache: CacheState;
  pubsub: PubSubState;
  queue: QueueState;
  lockState: LockState | null;
  schedulerState: SchedulerState | null;
  rateLimitState: RateLimitState | null;
  eventsState: EventsState | null;
  counterState: CounterState | null;
  cleanupTimer: ReturnType<typeof setInterval> | null;
  closed: boolean;
}

/**
 * Creates a new pgbloom client.
 *
 * @param connectionString - PostgreSQL connection string (postgres:// or postgresql://)
 * @param options - Configuration options
 */
export async function createPgbloom(
  connectionString: string,
  options: PgbloomOptions = {},
): Promise<PgbloomClient> {
  validateConnectionString(connectionString);

  // Build pool options
  const poolOptions: PoolOptions = {
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
  const cacheBloomOptions: CacheBloomOptions = {
    enabled: bloomEnabled,
    expectedItems: options.bloom?.expectedItems,
    falsePositiveRate: options.bloom?.falsePositiveRate,
    rebuildInterval: options.bloom?.rebuildInterval,
  };

  // Create internal state
  const internal: PgbloomInternal = {
    pool,
    cache: createCacheState(pool, cacheBloomOptions),
    pubsub: createPubSubState(pool),
    queue: createQueueState(pool, options.queue),
    lockState: options.lock ? createLockState(pool, null, options.lock.defaultTtl) : null,
    schedulerState: options.scheduler ? createSchedulerState(pool, null, options.scheduler.workerId ?? randomUUID()) : null,
    rateLimitState: createRateLimitState(pool, null),
    eventsState: createEventsState(pool, null),
    counterState: createCounterState(pool, null),
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
        } catch {
          // Ignore cleanup errors
        }
      }
    }, cleanupInterval);
    timer.unref();
    internal.cleanupTimer = timer;
  }

  // Build the public client interface
  const client: PgbloomClient = {
    // Cache
    getCache: async <T = unknown>(key: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return getCache<T>(internal.cache, key);
    },

    setCache: async <T = unknown>(key: string, value: T, expiry?: CacheExpiry) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return setCache(internal.cache, key, value, expiry) as Promise<T>;
    },

    deleteCache: async (key: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return deleteCache(internal.cache, key);
    },

    clearCache: async () => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return clearCache(internal.cache);
    },

    clearExpiredCache: async () => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return clearExpiredCache(internal.cache);
    },

    // Pub/Sub
    publish: async (channel: string, payload: unknown) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return publish(internal.pubsub.pool, channel, payload);
    },

    subscribe: async (channel: string, handler: MessageHandler) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return subscribe(internal.pubsub, channel, handler);
    },

    // Queue
    enqueue: async <T>(queueName: string, payload: T, opts?: {
      priority?: number;
      maxAttempts?: number;
      visibilityTimeout?: number;
    }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return enqueue<T>(internal.queue, queueName, payload, opts);
    },

    dequeue: async <T>(queueName: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return dequeue<T>(internal.queue, queueName);
    },

    completeJob: async (jobId: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return completeJob(internal.queue, jobId);
    },

    failJob: async (jobId: number, error: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return failJob(internal.queue, jobId, error);
    },

    getQueueStats: async (queueName: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return getQueueStats(internal.queue, queueName);
    },

    cleanupJobs: async (queueName: string, olderThan?: Date) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return cleanupJobs(internal.queue, queueName, olderThan);
    },

    // Lock (only available when `options.lock` is provided)
    tryLock: async (key: string, options?: { ttl?: number }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      const result = await tryLock(internal.lockState, key, options);
      return result.acquired;
    },

    lock: async (key: string, options?: { ttl?: number; timeout?: number }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      const result = await lockFn(internal.lockState, key, options);
      if (!result.acquired) {
        throw new Error(`Failed to acquire lock for key "${key}" within timeout`);
      }
    },

    unlock: async (key: string, holderId: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      await unlock(internal.lockState, key, holderId);
    },

    acquireLeadership: async (resource: string, options?: { ttl?: number; onLost?: () => void }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      const holderId = randomUUID();
      const result = await acquireLeadership(internal.lockState, {
        resource,
        holderId,
        ttl: options?.ttl,
        onLeadershipLost: options?.onLost,
      });
      return result.isLeader ? holderId : null;
    },

    releaseLeadership: async (resource: string, holderId: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      await releaseLeadership(internal.lockState, resource, holderId);
    },

    isLeader: async (resource: string, holderId: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.lockState) throw new Error("Lock feature not enabled. Provide `lock` options when creating client.");
      return isLeader(internal.lockState, resource, holderId);
    },

    // Scheduler (only available when `options.scheduler` is provided)
    schedule: async (name: string, payload: unknown, runAt: Date, options?: { priority?: number; maxAttempts?: number; interval?: string }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.schedulerState) throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
      const result = await schedule(internal.schedulerState, { name, payload, runAt, ...options });
      return { id: result.job.id };
    },

    scheduleRecurring: async (name: string, payload: unknown, interval: string, options?: { priority?: number; maxAttempts?: number }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.schedulerState) throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
      const result = await scheduleRecurring(internal.schedulerState, { name, payload, runAt: new Date(), interval, ...options });
      return { id: result.job.id };
    },

    cancelSchedule: async (jobId: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.schedulerState) throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
      await cancelSchedule(internal.schedulerState, jobId);
    },

    getSchedule: async (jobId: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.schedulerState) throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
      return getScheduleJob(internal.schedulerState, jobId);
    },

    listSchedules: async (filter?: { status?: string; name?: string }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      if (!internal.schedulerState) throw new Error("Scheduler feature not enabled. Provide `scheduler` options when creating client.");
      return listScheduledJobs(internal.schedulerState, filter);
    },

    // Rate Limit
    rateLimit: async (key: string, limit: number, windowMs: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return rateLimit(internal.rateLimitState!, key, limit, windowMs);
    },

    rateLimitTokenBucket: async (key: string, capacity: number, refillRate: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return rateLimitTokenBucket(internal.rateLimitState!, key, capacity, refillRate);
    },

    // Events
    emit: async (type: string, payload: unknown, metadata?: Record<string, unknown>) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return emit(internal.eventsState!, { type, payload, metadata });
    },

    listen: async (type: string, handler: (type: string, payload: unknown, meta: any) => void | Promise<void>) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return listen(internal.eventsState!, type, handler);
    },

    getEventHistory: async (options?: { type?: string; from?: Date; to?: Date; limit?: number; cursor?: string }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return getEventHistory(internal.eventsState!, options);
    },

    replayEvents: async (from: Date, to: Date | undefined, type: string | undefined, handler: (event: any) => void | Promise<void>) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return replayEvents(internal.eventsState!, { from, to, type, handler } as any);
    },

    // Counter
    increment: async (key: string, delta?: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return increment(internal.counterState!, key, delta);
    },

    decrement: async (key: string, delta?: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return decrement(internal.counterState!, key, delta);
    },

    add: async (key: string, delta: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return add(internal.counterState!, key, delta);
    },

    subtract: async (key: string, delta: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return subtract(internal.counterState!, key, delta);
    },

    getCounter: async (key: string, options?: { consistency?: 'strong' | 'local' | 'eventual' }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return counterGet(internal.counterState!, key, options);
    },

    setCounter: async (key: string, value: number) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return counterSet(internal.counterState!, key, value);
    },

    removeCounter: async (key: string) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return counterRemove(internal.counterState!, key);
    },

    // Public Bloom Filter API (independent from internal cache Bloom Filter)
    bloom: (bloomOptions?: { expectedItems?: number; falsePositiveRate?: number }) => {
      if (internal.closed) throw new Error("PGSnap client is closed");
      return new BloomFilter(bloomOptions);
    },

    // Lifecycle
    close: async () => {
      if (internal.closed) return;
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