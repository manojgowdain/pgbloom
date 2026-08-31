/**
 * Configuration options for the PGSnap cache client.
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
   * Maximum number of connections in the PostgreSQL pool.
   */
  maxConnections?: number;

  /**
   * Number of milliseconds a connection is allowed to be idle before being closed.
   */
  idleTimeoutMillis?: number;

  /**
   * Number of milliseconds to wait for a connection to become available.
   */
  connectionTimeoutMillis?: number;
}

/**
 * Supported expiry values for cache entries.
 *
 * - `number`: Milliseconds from now until expiration.
 * - `Date`: Absolute timestamp at which the entry expires.
 */
export type CacheExpiry = number | Date;

/**
 * The PGSnap cache client interface.
 */
export interface PGSnap {
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
