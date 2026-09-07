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

  /**
   * Lock configuration.
   */
  lock?: {
    /**
     * Default lock TTL in milliseconds.
     *
     * @default 30000 (30 seconds)
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
    defaultAlgorithm?: "fixed_window" | "sliding_window" | "token_bucket";
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
    defaultConsistency?: "strong" | "local" | "eventual";
  };

  /**
   * Model/CRUD configuration.
   */
  model?: {
    /**
     * Whether to automatically create tables for models.
     * @default false
     */
    autoCreateTables?: boolean;

    /**
     * Whether to enable caching for model queries by default.
     * @default false
     */
    cache?: boolean;
  };

  /**
   * Authentication configuration.
   */
  auth?: {
    /**
     * Whether to enable authentication features.
     * @default false
     */
    enabled?: boolean;

    /**
     * Access token expiry (e.g., "15m", "1h", "7d").
     * @default "15m"
     */
    accessTokenExpiry?: string;

    /**
     * Refresh token expiry (e.g., "30d", "1y").
     * @default "30d"
     */
    refreshTokenExpiry?: string;

    /**
     * JWT secret for signing tokens.
     * Should be set via environment variable in production.
     */
    jwtSecret?: string;

    /**
     * Password hashing algorithm.
     * @default "argon2id"
     */
    passwordHashAlgorithm?: "argon2id" | "bcrypt";

    /**
     * Argon2id options.
     */
    argon2Options?: {
      memoryCost?: number;
      timeCost?: number;
      parallelism?: number;
    };
  };

  /**
   * OTP configuration.
   */
  otp?: {
    /**
     * Whether to enable OTP features.
     * @default false
     */
    enabled?: boolean;

    /**
     * OTP expiry (e.g., "5m", "10m").
     * @default "5m"
     */
    expiry?: string;

    /**
     * Maximum verification attempts per OTP.
     * @default 5
     */
    maxAttempts?: number;

    /**
     * Resend cooldown (e.g., "60s", "2m").
     * @default "60s"
     */
    resendCooldown?: string;

    /**
     * OTP code length.
     * @default 6
     */
    length?: number;
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