// JSR entry point - exports all public API from the library
export { createPgbloom, type PgbloomClient, type PgbloomOptions } from "./src/client/index.ts";

export type {
  CacheExpiry,
  PgbloomOptions as PgbloomOptionsType,
} from "./src/types/index.ts";

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
} from "./src/utils/validation.ts";

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
} from "./src/bloom/index.ts";

// Cache
export type { CacheBloomOptions } from "./src/cache/index.ts";

// Pub/Sub
export type { MessageHandler } from "./src/pubsub/index.ts";

// Queue
export type { QueueJob, QueueOptions } from "./src/queue/index.ts";

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
} from "./src/lock/index.ts";

export type {
  LockState,
  LockOptions,
  LockResult,
  LeaderElectionOptions,
  LeaderElectionResult,
} from "./src/lock/index.ts";

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
} from "./src/scheduler/index.ts";

export type {
  SchedulerState,
  ScheduleOptions,
  ScheduledJob,
  ScheduleResult,
  SchedulerWorkerOptions,
} from "./src/scheduler/index.ts";

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
} from "./src/rate-limit/index.ts";

export type {
  RateLimitState,
  RateLimitOptions,
  TokenBucketOptions,
  RateLimitResult,
} from "./src/rate-limit/index.ts";

// Events
export {
  createEventsState,
  emit,
  listen,
  getEventHistory,
  replayEvents,
  closeEvents,
} from "./src/events/index.ts";

export type {
  EventsState,
  EventOptions,
  EventHistoryOptions,
  EventHistoryResult,
  Event,
  ReplayOptions,
  EventMetadata,
} from "./src/events/index.ts";

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
} from "./src/counter/index.ts";

export type {
  CounterState,
  CounterOptions,
  CounterResult,
} from "./src/counter/index.ts";

// Local Storage
export {
  createLocalStore,
  SSDiskStore,
  SSDiskStoreError,
} from "./src/storage/local/index.ts";

export type {
  LocalStore,
  LocalStoreOptions,
} from "./src/storage/local/index.ts";

export { MemoryCache } from "./src/storage/memory/index.ts";
export type { MemoryCacheOptions } from "./src/storage/memory/index.ts";

// Default export
import { createPgbloom } from "./src/client/index.ts";
export default createPgbloom;
