/**
 * Memory cache module exports.
 *
 * Provides the MemoryCache class which implements a LocalStore
 * with L1 caching, TTL expiration, and LRU eviction.
 */

export { MemoryCache } from "./memory-cache.js";
export type { MemoryCacheOptions } from "./memory-cache.js";