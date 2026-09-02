/**
 * pgbloom - PostgreSQL-backed Cache, Pub/Sub, Queue, Locks, Scheduler, Rate Limiting, Events, and Counters.
 *
 * A lightweight, dependency-minimal library for building distributed
 * systems on top of PostgreSQL.
 *
 * @packageDocumentation
 */

// Main client
export { createPgbloom, type PgbloomClient, type PgbloomOptions } from "./client/index.js";

// Types
export type {
  CacheExpiry,
  PgbloomOptions as PgbloomOptionsType,
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

// Lock
export {
  createLockState,
  tryLock,
  lock,
  unlock,
  acquireLeadership,
  releaseLeadership,
  isLeader,
  renewLeadership,
  getLockInfo,
  extendLock,
} from "./lock/index.js";
export type {
  LockState,
  LockOptions,
  LockResult,
  LeaderElectionOptions,
  LeaderElectionResult,
} from "./lock/index.js";

// Scheduler
export {
  createSchedulerState,
  schedule,
  scheduleRecurring,
  cancelSchedule,
  getScheduleJob,
  listScheduledJobs,
  getAndClaimDueJobs,
  claimScheduledJob,
  completeScheduledJob,
  failScheduledJob,
} from "./scheduler/index.js";
export type {
  SchedulerState,
  ScheduleOptions,
  ScheduledJob,
  ScheduleResult,
  SchedulerWorkerOptions,
} from "./scheduler/index.js";

// Rate Limit
export {
  createRateLimitState,
  rateLimit,
  rateLimitTokenBucket,
  checkRateLimit,
  checkSlidingRateLimit,
  checkTokenBucketRateLimit,
  cleanup as cleanupRateLimits,
  generateKey,
  generateUserKey,
  generateIpKey,
} from "./rate-limit/index.js";
export type {
  RateLimitState,
  RateLimitOptions,
  TokenBucketOptions,
  RateLimitResult,
} from "./rate-limit/index.js";

// Events
export {
  createEventsState,
  emit,
  listen,
  getEventHistory,
  replayEvents,
  closeEvents,
} from "./events/index.js";
export type {
  EventsState,
  EventOptions,
  EventHistoryOptions,
  EventHistoryResult,
  Event,
  ReplayOptions,
  EventMetadata,
} from "./events/index.js";

// Counter
export {
  createCounterState,
  increment,
  decrement,
  add,
  subtract,
  get as getCounter,
  set as setCounter,
  remove as removeCounter,
  list as listCounters,
  clearAll as clearAllCounters,
} from "./counter/index.js";
export type {
  CounterState,
  CounterOptions,
  CounterResult,
} from "./counter/index.js";

// Local Storage
export {
  createLocalStore,
  SSDiskStore,
  SSDiskStoreError,
} from "./storage/local/index.js";
export type {
  LocalStore,
  LocalStoreOptions,
} from "./storage/local/index.js";

export { MemoryCache } from "./storage/memory/index.js";
export type { MemoryCacheOptions } from "./storage/memory/index.js";

// Default export
import { createPgbloom } from "./client/index.js";
export default createPgbloom;