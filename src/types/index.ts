/**
 * Configuration options for the pgbloom cache client.
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
  queue?: {
    visibilityTimeout?: number;
  };
}

/**
 * Supported expiry values for cache entries.
 *
 * - `number`: Milliseconds from now until expiration.
 * - `Date`: Absolute timestamp at which the entry expires.
 */
export type CacheExpiry = number | Date;

/**
 * The pgbloom cache client interface.
 */
export interface Pgbloom {
  /**
   * Retrieves a value from the cache.
   *
   * @param key The cache key.
   * @returns The deserialized value, or `null` if not found or expired.
   */
  getCache<T = unknown>(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache.
   *
   * Objects and arrays are automatically JSON serialized. Strings, numbers,
   * booleans, and `null` are stored as-is.
   *
   * @param key The cache key.
   * @param value The value to store.
   * @param expiry Milliseconds from now, or an absolute Date. Defaults to 1 hour.
   */
  setCache<T = unknown>(key: string, value: T, expiry?: CacheExpiry): Promise<T>;

  /**
   * Deletes a value from the cache. Does not throw if the key does not exist.
   */
  deleteCache(key: string): Promise<void>;

  /**
   * Deletes all entries from the cache.
   */
  clearCache(): Promise<void>;

  /**
   * Deletes all expired entries from the cache.
   */
  clearExpiredCache(): Promise<void>;

  /**
   * Stops background cleanup and closes the PostgreSQL pool.
   */
  close(): Promise<void>;
}