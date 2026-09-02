/**
 * Memory cache layer that wraps another LocalStore as backing store.
 * Provides L1 caching with TTL-based expiration and LRU eviction.
 */

import type { LocalStore, LocalStoreOptions } from "../local/types.js";

/**
 * Options for configuring the MemoryCache.
 */
export interface MemoryCacheOptions {
  /**
   * Maximum number of entries to keep in memory cache.
   * When exceeded, LRU eviction removes least recently used items.
   *
   * @default 1000
   */
  maxEntries?: number;

  /**
   * Default time-to-live for cache entries in milliseconds.
   * When omitted, entries do not expire.
   *
   * @default 60000 (60 seconds)
   */
  ttl?: number;
}

/**
 * Internal cache entry structure holding value and expiry timestamp.
 */
interface CacheEntry<V> {
  value: V;
  expiry: number | null; // null means no expiry
}

/**
 * MemoryCache implements a LocalStore with L1 caching.
 *
 * Features:
 * - In-memory Map for fast access
 * - TTL-based expiration
 * - LRU eviction when max entries is reached
 * - Composition with backing LocalStore (ssdiskdb)
 */
export class MemoryCache implements LocalStore {
  private memory: Map<string, CacheEntry<any>>;
  private accessOrder: string[]; // Tracks access order for LRU (most recent at end)
  private readonly backingStore: LocalStore;
  private readonly maxEntries: number;
  private readonly defaultTTL: number;
  private closed: boolean;

  /**
   * Creates a new MemoryCache instance.
   *
   * @param backingStore - The underlying LocalStore to use as backing store
   * @param options - Configuration options for the memory cache
   */
  constructor(backingStore: LocalStore, options: MemoryCacheOptions = {}) {
    this.backingStore = backingStore;
    this.memory = new Map();
    this.accessOrder = [];
    this.maxEntries = options.maxEntries ?? 1000;
    this.defaultTTL = options.ttl ?? 60_000; // 60 seconds default
    this.closed = false;
  }

  /**
   * Gets the current timestamp for expiry comparisons.
   */
  private now(): number {
    return Date.now();
  }

  /**
   * Updates the access order for LRU tracking.
   * Moves the key to the end (most recently used).
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position if exists
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evicts the least recently used entry when cache is full.
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // The least recently used item is at the beginning of the array
    const lruKey = this.accessOrder.shift();
    if (lruKey !== undefined) {
      this.memory.delete(lruKey);
    }
  }

  /**
   * Validates that the cache is not closed.
   */
  private ensureNotClosed(): void {
    if (this.closed) {
      throw new Error("Cannot perform operations on a closed MemoryCache");
    }
  }

  /**
   * Calculates the expiry timestamp based on TTL.
   */
  private calculateExpiry(ttlOverride?: number): number | null {
    if (ttlOverride === undefined) {
      ttlOverride = this.defaultTTL;
    }

    if (ttlOverride <= 0) {
      return null; // No expiry
    }

    return this.now() + ttlOverride;
  }

  /**
   * Retrieves a value by key from the memory cache or backing store.
   *
   * @param key - The key to look up.
   * @returns The stored value, or undefined if the key does not exist.
   */
  async get<T>(key: string): Promise<T | undefined> {
    this.ensureNotClosed();

    // Check memory cache first
    const entry = this.memory.get(key);
    if (entry !== undefined) {
      // Check if expired
      if (entry.expiry !== null && entry.expiry < this.now()) {
        // Expired, remove from memory and fall through to backing store
        this.memory.delete(key);
        // Remove from access order
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
          this.accessOrder.splice(index, 1);
        }
      } else {
        // Valid entry, update LRU and return
        this.updateAccessOrder(key);
        return entry.value as T;
      }
    }

    // Not in memory or expired, try backing store
    try {
      const value = await this.backingStore.get<T>(key);
      if (value !== undefined) {
        // Found in backing store, cache it in memory
        await this.set(key, value);
      }
      return value;
    } catch (err) {
      // If backing store fails, return undefined (graceful degradation)
      return undefined;
    }
  }

  /**
   * Stores a value with the given key in both memory and backing store.
   *
   * @param key - The key under which to store the value.
   * @param value - The value to store.
   * @param ttlOverride - Optional TTL override for this specific entry.
   */
  async set<T>(key: string, value: T, ttlOverride?: number): Promise<void> {
    this.ensureNotClosed();

    // Store in memory
    const expiry = this.calculateExpiry(ttlOverride);
    const entry: CacheEntry<T> = {
      value,
      expiry
    };

    this.memory.set(key, entry);
    this.updateAccessOrder(key);

    // Enforce LRU eviction if needed
    if (this.accessOrder.length > this.maxEntries) {
      this.evictLRU();
    }

    // Also store in backing store
    try {
      await this.backingStore.set<T>(key, value);
    } catch (err) {
      // If backing store fails, we still have the value in memory
      // In a production system, we might want to log this or handle it differently
      // For now, we'll let it continue (graceful degradation)
    }
  }

  /**
   * Deletes a key from both memory and backing store.
   *
   * @param key - The key to delete.
   */
  async delete(key: string): Promise<void> {
    this.ensureNotClosed();

    // Remove from memory
    this.memory.delete(key);
    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }

    // Also delete from backing store
    try {
      await this.backingStore.delete(key);
    } catch (err) {
      // Gracefully handle backing store failures
    }
  }

  /**
   * Checks whether a key exists in memory or backing store.
   *
   * @param key - The key to check.
   * @returns true if the key exists, false otherwise.
   */
  async has(key: string): Promise<boolean> {
    this.ensureNotClosed();

    // Check memory first
    const entry = this.memory.get(key);
    if (entry !== undefined) {
      // Check if expired
      if (entry.expiry !== null && entry.expiry < this.now()) {
        // Expired, remove from memory and check backing store
        this.memory.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
          this.accessOrder.splice(index, 1);
        }
      } else {
        // Valid entry in memory
        return true;
      }
    }

    // Not in valid memory, check backing store
    try {
      return await this.backingStore.has(key);
    } catch (err) {
      // If backing store fails, assume key doesn't exist
      return false;
    }
  }

  /**
   * Removes all keys from both memory and backing store.
   */
  async clear(): Promise<void> {
    this.ensureNotClosed();

    // Clear memory
    this.memory.clear();
    this.accessOrder = [];

    // Also clear backing store
    try {
      await this.backingStore.clear();
    } catch (err) {
      // Gracefully handle backing store failures
    }
  }

  /**
   * Closes the memory cache and releases any underlying resources.
   * After calling this method, the store should not be used.
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    // Clear memory
    this.memory.clear();
    this.accessOrder = [];

    // Also close backing store
    try {
      await this.backingStore.close();
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
}