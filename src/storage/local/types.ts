/**
 * LocalStore interface and options for the local storage abstraction layer.
 *
 * This interface provides a uniform API for local persistent storage,
 * allowing different backend implementations (e.g., ssdiskdb) to be swapped.
 */

/**
 * Options for configuring a LocalStore instance.
 */
export interface LocalStoreOptions {
  /**
   * Filesystem path where the local database files will be stored.
   */
  path: string;

  /**
   * Default time-to-live (in milliseconds) for keys.
   *
   * If set, keys will expire after the specified duration.
   * When omitted, keys do not expire.
   */
  ttl?: number;

  /**
   * Maximum number of entries to retain.
   *
   * When the store exceeds this limit, eviction behavior is
   * implementation-defined.
   */
  maxEntries?: number;
}

/**
 * Interface for a local persistent key-value store.
 *
 * Implementations provide a simple get/set/delete API with JSON
 * serialization. Errors during local storage operations should be
 * handled gracefully and not cause library crashes.
 */
export interface LocalStore {
  /**
   * Retrieves a value by key from the local store.
   *
   * @param key - The key to look up.
   * @returns The stored value, or `undefined` if the key does not exist.
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Stores a value with the given key in the local store.
   *
   * @param key - The key under which to store the value.
   * @param value - The value to store (will be JSON-serialized).
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * Deletes a key from the local store.
   *
   * Does not throw if the key does not exist.
   *
   * @param key - The key to delete.
   */
  delete(key: string): Promise<void>;

  /**
   * Checks whether a key exists in the local store.
   *
   * @param key - The key to check.
   * @returns `true` if the key exists, `false` otherwise.
   */
  has(key: string): Promise<boolean>;

  /**
   * Removes all keys from the local store.
   *
   * After calling this method, the store will be empty.
   */
  clear(): Promise<void>;

  /**
   * Closes the local store and releases any underlying resources.
   *
   * After calling this method, the store should not be used.
   */
  close(): Promise<void>;
}
