/**
 * PGSnap - PostgreSQL-backed Cache, Pub/Sub, and Queue.
 *
 * A lightweight, dependency-minimal library for building distributed
 * systems on top of PostgreSQL.
 *
 * @packageDocumentation
 */

// Main client
export { createPGSnap, type PGSnapClient, type PGSnapOptions } from "./client/index.js";

// Types
export type {
  CacheExpiry,
  PGSnapOptions as PGSnapOptionsType,
} from "./types/index.js";
export {
  PGSnapError,
  PGSnapConnectionError,
  PGSnapKeyError,
  PGSnapExpiryError,
  PGSnapSerializationError,
  PGSnapDeserializationError,
  MAX_KEY_LENGTH,
  validateKey,
  validateConnectionString,
} from "./utils/validation.js";

// Bloom Filter (public API)
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

// Cache
export type { CacheBloomOptions } from "./cache/index.js";

// Pub/Sub
export type { MessageHandler } from "./pubsub/index.js";

// Queue
export type { QueueJob, QueueOptions } from "./queue/index.js";

// Default export
import { createPGSnap } from "./client/index.js";
export default createPGSnap;