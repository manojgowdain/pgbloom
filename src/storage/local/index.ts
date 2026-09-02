/**
 * Local storage module for PGBloom.
 *
 * Provides a persistent local storage abstraction backed by ssdiskdb,
 * used to cache data locally and reduce unnecessary PostgreSQL calls.
 */

import { SSDiskStore } from "./ssdiskdb-adapter.js";
import type { LocalStore, LocalStoreOptions } from "./types.js";

/**
 * Creates and initializes a LocalStore instance backed by ssdiskdb.
 *
 * The store is lazily connected: the underlying ssdiskdb client is
 * created on first use, so this function only validates the options
 * and returns a ready-to-use store object.
 *
 * @param options - Configuration for the local store.
 * @returns A promise that resolves to an initialized LocalStore instance.
 *
 * @example
 * ```typescript
 * const store = await createLocalStore({ path: "/tmp/pgsnap" });
 * await store.set("cacheKey", { data: "value" });
 * const value = await store.get("cacheKey");
 * await store.close();
 * ```
 */
export async function createLocalStore(
  options: LocalStoreOptions,
): Promise<LocalStore> {
  // Validate the path option
  if (!options.path || typeof options.path !== "string") {
    throw new Error(
      "LocalStore requires a valid 'path' option (string)",
    );
  }

  const store = new SSDiskStore(options);

  // Verify that ssdiskdb can connect to the specified path by performing
  // a lightweight existence check. This surfaces connection errors early
  // rather than on the first user operation.
  try {
    await store.has("__ping__");
  } catch (err) {
    throw new Error(
      `Failed to initialize local storage at "${options.path}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return store;
}

// Re-export the SSDiskStore class for direct usage if needed
export { SSDiskStore } from "./ssdiskdb-adapter.js";
export { SSDiskStoreError } from "./ssdiskdb-adapter.js";

// Re-export types
export type { LocalStore, LocalStoreOptions } from "./types.js";
