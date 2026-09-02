/**
 * SSDiskDB adapter for local persistent storage.
 *
 * This adapter wraps the `ssdiskdb` library to provide a concrete
 * implementation of the LocalStore interface. Values are JSON-serialized
 * before storage and deserialized on retrieval.
 *
 * @see LocalStore
 */

import { connect } from "ssdiskdb";
import type { LocalStore, LocalStoreOptions } from "./types.js";

/**
 * Internal state for the SSDiskStore instance.
 */
interface SSDiskStoreState {
  /** The connected ssdiskdb client. */
  client: any | null;
  /** The options the store was configured with. */
  options: LocalStoreOptions;
  /** Whether the store has been closed. */
  closed: boolean;
}

/**
 * Error thrown when local storage operations fail in an unrecoverable way.
 */
export class SSDiskStoreError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SSDiskStoreError";
  }
}

/**
 * Local persistent store backed by ssdiskdb.
 *
 * Wraps the `ssdiskdb` library's connection to provide a simple
 * key-value store with JSON value serialization. All operations are
 * asynchronous and return Promises.
 *
 * Usage:
 * ```typescript
 * const store = new SSDiskStore({ path: "/tmp/pgsnap-local" });
 * await store.set("foo", { bar: 1 });
 * const value = await store.get("foo"); // { bar: 1 }
 * await store.close();
 * ```
 */
export class SSDiskStore implements LocalStore {
  private state: SSDiskStoreState;

  /**
   * Creates a new SSDiskStore instance.
   *
   * Note: The ssdiskdb client is created lazily on first access
   * to handle connection errors gracefully.
   *
   * @param options - Configuration options for the store.
   */
  constructor(options: LocalStoreOptions) {
    this.state = {
      client: null,
      options,
      closed: false,
    };
  }

  /**
   * Lazily connects to ssdiskdb, creating the client on first use.
   *
   * This deferred initialization allows construction to succeed even
   * if the storage path is temporarily unavailable.
   */
  private async getClient(): Promise<any> {
    if (this.state.client) {
      return this.state.client;
    }

    if (this.state.closed) {
      throw new SSDiskStoreError(
        "Cannot perform operations on a closed SSDiskStore",
      );
    }

    try {
      const client = await connect({
        storagePath: this.state.options.path,
      });

      this.state.client = client;
      return client;
    } catch (err) {
      throw new SSDiskStoreError(
        `Failed to connect to local storage at path: ${this.state.options.path}`,
        err,
      );
    }
  }

  /**
   * Retrieves a value by key from the local store.
   *
   * @param key - The key to look up.
   * @returns The stored value (deserialized), or `undefined` if not found.
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const client = await this.getClient();
      const raw = await client.get(key);

      // ssdiskdb returns null for missing keys
      if (raw === null || raw === undefined) {
        return undefined;
      }

      return JSON.parse(raw) as T;
    } catch (err) {
      if (err instanceof SSDiskStoreError) {
        throw err;
      }
      // Gracefully handle storage failures by returning undefined
      return undefined;
    }
  }

  /**
   * Stores a value with the given key in the local store.
   *
   * The value is JSON-serialized before storage.
   *
   * @param key - The key under which to store the value.
   * @param value - The value to store.
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const client = await this.getClient();
      const serialized = JSON.stringify(value);
      await client.set(key, serialized);
    } catch (err) {
      if (err instanceof SSDiskStoreError) {
        throw err;
      }
      // Gracefully swallow storage errors to prevent library crashes
    }
  }

  /**
   * Deletes a key from the local store.
   *
   * Does not throw if the key does not exist or if the underlying
   * storage is unavailable.
   *
   * @param key - The key to delete.
   */
  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (err) {
      if (err instanceof SSDiskStoreError) {
        throw err;
      }
      // Gracefully swallow storage errors
    }
  }

  /**
   * Checks whether a key exists in the local store.
   *
   * @param key - The key to check.
   * @returns `true` if the key exists, `false` otherwise.
   */
  async has(key: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      return await client.exists(key);
    } catch (err) {
      if (err instanceof SSDiskStoreError) {
        throw err;
      }
      return false;
    }
  }

  /**
   * Removes all keys from the local store.
   *
   * @throws {SSDiskStoreError} if the client cannot be created.
   */
  async clear(): Promise<void> {
    try {
      const client = await this.getClient();
      await client.flush();
    } catch (err) {
      if (err instanceof SSDiskStoreError) {
        throw err;
      }
      // Gracefully swallow storage errors
    }
  }

  /**
   * Closes the local store and releases the underlying ssdiskdb connection.
   *
   * After calling this method, the store must not be used.
   */
  async close(): Promise<void> {
    if (this.state.closed) {
      return;
    }

    this.state.closed = true;

    if (this.state.client) {
      try {
        await this.state.client.close();
      } catch {
        // Ignore errors during cleanup
      }
      this.state.client = null;
    }
  }
}
