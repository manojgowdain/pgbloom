/**
 * Browser-safe entry point for PGBloom.
 *
 * This module exports only functionality that works in browser environments:
 * - Bloom Filter (pure JavaScript, no Node.js dependencies)
 * - Validation utilities
 * - Serialization utilities
 *
 * NOTE: PostgreSQL features (cache, pub/sub, queue, locks, scheduler, etc.)
 * require a server runtime. Browser applications should access these via
 * HTTP/RPC to a backend server that runs PGBloom.
 *
 * Browser Architecture:
 * ```
 * Browser App → HTTP/RPC → Backend Server → PGBloom → PostgreSQL
 * ```
 *
 * @module pgbloom/browser
 */

// Bloom Filter - completely runtime-independent
export {
  BloomFilter,
  type BloomFilterValue,
  type BloomFilterOptions,
  type BloomFilterJSON,
  BloomFilterError,
  BloomFilterConfigError,
  // Hash utilities
  encodeValue,
  fnv1a,
  xorshift32,
  hashPair,
} from "./bloom/index.js";

// Validation utilities - pure functions, no Node.js dependencies
export {
  PGSnapError,
  PGSnapKeyError,
  PGSnapSerializationError,
  PGSnapDeserializationError,
  MAX_KEY_LENGTH,
  validateKey,
} from "./utils/validation.js";

// Serialization utilities - pure functions, no Node.js dependencies
export { serialize } from "./utils/serialize.js";
export { deserialize } from "./utils/deserialize.js";
