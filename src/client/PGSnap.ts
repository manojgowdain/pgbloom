/**
 * Main PGSnap client.
 *
 * Provides cache, pub/sub, and queue functionality backed by PostgreSQL.
 * Includes optional internal Bloom Filter for cache optimization.
 */

import pg from "pg";
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

const { Pool } = pg;

/**
 * PGSnap configuration options.
 */
export interface PGSnapOptions {
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
}

/**
 * Public PGSnap client interface.
 */
export interface PGSnapClient {
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

  // Bloom Filter (public API - independent from internal cache Bloom Filter)
  bloom(options?: { expectedItems?: number; falsePositiveRate?: number }): BloomFilter;

  // Lifecycle
  close(): Promise<void>;
}

/**
 * Internal state of the PGSnap client.
 */
interface PGSnapInternal {
  pool: pg.Pool;
  cache: CacheState;
  pubsub: PubSubState;
  queue: QueueState;
  cleanupTimer: ReturnType<typeof setInterval> | null;
  closed: boolean;
}

/**
 * Creates a new PGSnap client.
 *
 * @param connectionString - PostgreSQL connection string (postgres:// or postgresql://)
 * @param options - Configuration options
 */
export async function createPGSnap(
  connectionString: string,
  options: PGSnapOptions = {},
): Promise<PGSnapClient> {
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
  const internal: PGSnapInternal = {
    pool,
    cache: createCacheState(pool, cacheBloomOptions),
    pubsub: createPubSubState(pool),
    queue: createQueueState(pool, options.queue),
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
  const client: PGSnapClient = {
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
      await closePubSub(internal.pubsub);
      await pool.end();
    },
  };

  return client;
}

/**
 * Default export for convenience: `import PGSnap from "pgsnap"`
 * Usage: `const pgsnap = await PGSnap(connectionString, options)`
 */
export default createPGSnap;