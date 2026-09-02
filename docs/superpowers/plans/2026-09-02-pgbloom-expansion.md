# PGBloom Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand PGBloom from a Cache/Pub/Sub/Queue/Bloom library to a complete PostgreSQL-backed infrastructure library with Locks, Scheduler, Rate Limiting, Events, and Counters while maintaining backward compatibility.

**Architecture:** 
- Keep PostgreSQL as the source of truth for all features
- Add ssdiskdb as a local persistent cache layer to reduce unnecessary database calls
- Implement memory cache as L1 cache for frequently accessed data
- Use existing Pub/Sub infrastructure for cache invalidation across processes
- Follow existing code patterns and module structure
- Maintain separation of concerns with each feature in its own module

**Tech Stack:** 
- TypeScript
- PostgreSQL (pg library)
- ssdiskdb (local persistent storage)
- Existing PGBloom patterns and conventions

**Spec:** docs/superpowers/specs/2026-08-31-pgsnap-design.md

## Global Constraints

- Do not rewrite existing Cache, Pub/Sub, Queue, or Bloom implementation unless absolutely required for integration
- PostgreSQL must remain the authoritative/shared storage
- Use ssdiskdb for local storage
- Implement configurable local cache with memory, disk, and PostgreSQL layers
- Implement cache coherency using existing Pub/Sub functionality
- Implement distributed locks using PostgreSQL-native mechanisms
- Implement leader election using PostgreSQL advisory locking
- Implement PostgreSQL-backed scheduling with workers
- Implement three rate limiting algorithms (fixed window, sliding window, token bucket)
- Implement event system with history and replay using PostgreSQL LISTEN/NOTIFY
- Implement PostgreSQL-backed atomic counters
- Create internal PostgreSQL tables for new features with appropriate indexing
- Implement automatic cleanup for expired records
- Handle failure scenarios gracefully
- Maintain backward compatibility
- Provide complete TypeScript types
- Add comprehensive tests
- Update documentation

---

## Detailed Implementation Tasks

### Phase 1: Foundation - Local Storage Abstraction

#### Task 1: Create Local Storage Adapter
**Files:**
- Create: `src/storage/local/ssdiskdb-adapter.ts`
- Create: `src/storage/local/index.ts`
- Create: `src/storage/local/types.ts`
- Modify: `src/index.ts` (export storage module)

**Interfaces:**
- Consumes: 
- Produces: LocalStore interface with get, set, delete, has, clear, close methods

- [ ] **Step 1: Research ssdiskdb API**
  - Read ssdiskdb documentation and TypeScript definitions
  - Determine exact API for get, set, del, exists, close methods
  - Note any special initialization requirements

- [ ] **Step 2: Create LocalStore interface**
  ```typescript
  export interface LocalStore {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    close(): Promise<void>;
  }
  ```

- [ ] **Step 3: Implement SSDiskDBAdapter class**
  - Implement constructor that takes storage path and options
  - Implement all LocalStore methods using ssdiskdb client
  - Handle serialization/deserialization to match PGBloom's format
  - Proper error handling and resource cleanup

- [ ] **Step 4: Create storage factory/index**
  - Export function to create local store instances
  - Handle configuration options (path, ttl, maxEntries)

- [ ] **Step 5: Commit foundation**
  ```bash
  git add src/storage/
  git commit -m "feat: add local storage abstraction layer"
  ```

#### Task 2: Add Local Cache Configuration to PGBloom Options
**Files:**
- Modify: `src/client/PGSnap.ts` (add localCache options)
- Modify: `src/types/index.ts` (extend PgbloomOptions)
- Modify: `src/database/index.ts` (pass local cache options to initialization)

**Interfaces:**
- Consumes: LocalStore interface from storage module
- Produces: Updated PGBloomOptions with localCache configuration

- [ ] **Step 1: Define local cache configuration interface**
  ```typescript
  export interface LocalCacheOptions {
    enabled?: boolean;
    path?: string;
    ttl?: number; // milliseconds
    maxEntries?: number;
  }
  ```

- [ ] **Step 2: Extend PgbloomOptions with localCache**
  - Add localCache?: LocalCacheOptions field
  - Set appropriate defaults

- [ ] **Step 3: Modify createPgbloom to initialize local storage**
  - Create local store instance when localCache.enabled === true
  - Pass local store to cache/pubsub/queue/bloom state creators
  - Handle cleanup of local store on close()

- [ ] **Step 4: Commit configuration changes**
  ```bash
  git add src/client/PGSnap.ts src/types/index.ts src/database/index.ts
  git commit -m "feat: add local cache configuration"
  ```

### Phase 2: Memory Cache Layer

#### Task 3: Implement Memory Cache Wrapper
**Files:**
- Create: `src/storage/memory/memory-cache.ts`
- Create: `src/storage/memory/index.ts`

**Interfaces:**
- Consumes: LocalStore interface
- Produces: Enhanced LocalStore with memory caching

- [ ] **Step 1: Create MemoryCache class**
  - Implement LRU or similar eviction policy
  - Support TTL-based expiration
  - Wrap another LocalStore (ssdiskdb) as backing store
  - Implement get/set/delete/has/clear/close with memory optimization

- [ ] **Step 2: Create cache factory**
  - Function to create memory-enabled cache stack
  - Configure memory size, TTL, etc.

- [ ] **Step 3: Commit memory cache**
  ```bash
  git add src/storage/memory/
  git commit -m "feat: add memory cache layer"
  ```

### Phase 3: Distributed Locks

#### Task 4: Design Locks Table Schema
**Files:**
- Modify: `src/database/initialize.ts` (add locks table creation)

**Interfaces:**
- Consumes: 
- Produces: SQL schema for pgbloom_locks table

- [ ] **Step 1: Design locks table schema**
  ```sql
  CREATE TABLE IF NOT EXISTS pgbloom_locks (
    lock_key TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS pgbloom_locks_expires_at_idx ON pgbloom_locks (expires_at);
  ```

- [ ] **Step 2: Add table initialization**
  - Modify initializeAll to create locks table
  - Add appropriate indexes

- [ ] **Step 3: Commit schema changes**
  ```bash
  git add src/database/initialize.ts
  git commit -m "feat: add locks table schema"
  ```

#### Task 5: Implement Lock State and Core Operations
**Files:**
- Create: `src/lock/index.ts`
- Create: `src/lock/types.ts`
- Create: `src/lock/queries.ts`

**Interfaces:**
- Consumes: Pool, LocalStore (for optimization)
- Produces: LockState interface and basic lock/unlock/tryLock operations

- [ ] **Step 1: Define LockState interface**
  ```typescript
  export interface LockState {
    pool: Pool;
    localStore: LocalStore | null;
    defaultTtl: number;
  }
  ```

- [ ] **Step 2: Create lock state factory**
  - Function to create lock state from pool and options

- [ ] **Step 3: Implement basic lock operations**
  - tryLock: Attempt to acquire lock with optional TTL
  - lock: Wait for lock acquisition
  - unlock: Release lock
  - All operations use PostgreSQL transactions for safety

- [ ] **Step 4: Commit lock implementation**
  ```bash
  git add src/lock/
  git commit -m "feat: implement lock state and core operations"
  ```

#### Task 6: Implement Leader Election
**Files:**
- Modify: `src/lock/index.ts` (add leader election methods)

**Interfaces:**
- Consumes: LockState
- Produces: Leader election API (acquireLeadership, isLeader, releaseLeadership)

- [ ] **Step 1: Implement leader election using locks**
  - Use special lock key format: `leader:${resource}`
  - Implement acquireLeadership with heartbeat/renewal
  - Implement isLeader to check current leadership
  - Implement releaseLeadership to voluntarily step down
  - Handle automatic renewal and failure detection

- [ ] **Step 2: Commit leader election**
  ```bash
  git add src/lock/index.ts
  git commit -m "feat: implement leader election"
  ```

#### Task 7: Integrate Locks into PGBloom Client
**Files:**
- Modify: `src/client/PGSnap.ts` (add lock initialization)
- Modify: `src/index.ts` (export lock API)
- Modify: `src/types/index.ts` (add lock options to PgbloomOptions)

**Interfaces:**
- Consumes: LockState factory
- Produces: Public lock API on Pgbloom client

- [ ] **Step 1: Add lock options to PgbloomOptions**
  - Add lock?: { defaultTtl?: number } configuration

- [ ] **Step 2: Initialize lock state in createPgbloom**
  - Create lock state when needed
  - Pass pool and local store to lock state
  - Start cleanup processes if needed

- [ ] **Step 3: Expose lock API on client**
  - Add lock, unlock, tryLock methods
  - Add leader election methods: acquireLeadership, isLeader, releaseLeadership

- [ ] **Step 4: Commit client integration**
  ```bash
  git add src/client/PGSnap.ts src/index.ts src/types/index.ts
  git commit -m "feat: integrate locks into PGBloom client"
  ```

### Phase 4: Scheduler

#### Task 8: Design Scheduler Table Schema
**Files:**
- Modify: `src/database/initialize.ts` (add scheduler tables)

**Interfaces:**
- Consumes: 
- Produces: SQL schema for pgbloom_schedules and related tables

- [ ] **Step 1: Design scheduler tables**
  ```sql
  CREATE TABLE IF NOT EXISTS pgbloom_schedules (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    payload JSONB NOT NULL,
    run_at TIMESTAMPTZ NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, processing, completed, failed, cancelled
    interval TEXT, -- for recurring jobs (cron expression)
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS pgbloom_schedules_run_at_idx ON pgbloom_schedules (run_at) WHERE status = 'scheduled';
  CREATE INDEX IF NOT EXISTS pgbloom_schedules_status_priority_idx ON pgbloom_schedules (status, priority DESC, run_at);
  ```

- [ ] **Step 2: Add table initialization**
  - Modify initializeAll to create scheduler tables
  - Add appropriate indexes for efficient querying

- [ ] **Step 3: Commit schema changes**
  ```bash
  git add src/database/initialize.ts
  git commit -m "feat: add scheduler table schema"
  ```

#### Task 9: Implement Scheduler State and Core Operations
**Files:**
- Create: `src/scheduler/index.ts`
- Create: `src/scheduler/types.ts`
- Create: `src/scheduler/queries.ts`

**Interfaces:**
- Consumes: Pool, LocalStore (for optimization)
- Produces: SchedulerState interface and basic schedule/cancel operations

- [ ] **Step 1: Define SchedulerState interface**
  ```typescript
  export interface SchedulerState {
    pool: Pool;
    localStore: LocalStore | null;
    workerId: string; // Unique identifier for this worker/scheduler instance
  }
  ```

- [ ] **Step 2: Create scheduler state factory**
  - Function to create scheduler state from pool and options

- [ ] **Step 3: Implement basic scheduler operations**
  - schedule: Schedule a one-time job for specific time
  - scheduleRecurring: Schedule a recurring job (cron-like)
  - cancelSchedule: Cancel a scheduled job
  - getNextSchedule: Get the next scheduled job to run
  - All operations use proper locking to prevent race conditions

- [ ] **Step 4: Commit scheduler implementation**
  ```bash
  git add src/scheduler/
  git commit -m "feat: implement scheduler state and core operations"
  ```

#### Task 10: Implement Scheduler Workers
**Files:**
- Modify: `src/scheduler/index.ts` (add worker functionality)
- Create: `src/scheduler/worker.ts` (optional: dedicated worker module)

**Interfaces:**
- Consumes: SchedulerState
- Produces: Worker functionality for processing scheduled jobs

- [ ] **Step 1: Implement job claiming mechanism**
  - Use FOR UPDATE SKIP LOCKED to claim jobs safely across workers
  - Update job status to 'processing' when claimed
  - Handle job execution and completion/failure

- [ ] **Step 2: Implement worker loop**
  - Continuous polling for scheduled jobs
  - Sleep when no jobs are due
  - Proper shutdown handling

- [ ] **Step 3: Implement retry logic with backoff**
  - Track attempts and apply exponential backoff
  - Move to failed state after max attempts

- [ ] **Step 4: Commit worker implementation**
  ```bash
  git add src/scheduler/index.ts src/scheduler/worker.ts
  git commit -m "feat: implement scheduler workers"
  ```

#### Task 11: Integrate Scheduler into PGBloom Client
**Files:**
- Modify: `src/client/PGSnap.ts` (add scheduler initialization)
- Modify: `src/index.ts` (export scheduler API)
- Modify: `src/types/index.ts` (add scheduler options to PgbloomOptions)

**Interfaces:**
- Consumes: SchedulerState factory
- Produces: Public scheduler API on Pgbloom client

- [ ] **Step 1: Add scheduler options to PgbloomOptions**
  - Add scheduler?: { workerId?: string, pollingInterval?: number } configuration

- [ ] **Step 2: Initialize scheduler state in createPgbloom**
  - Create scheduler state when needed
  - Pass pool and local store to scheduler state
  - Start worker processes if configured

- [ ] **Step 3: Expose scheduler API on client**
  - Add schedule, scheduleRecurring, cancelSchedule methods
  - Add methods to get scheduled jobs, etc.

- [ ] **Step 4: Commit client integration**
  ```bash
  git add src/client/PGSnap.ts src/index.ts src/types/index.ts
  git commit -m "feat: integrate scheduler into PGBloom client"
  ```

### Phase 5: Rate Limiting

#### Task 12: Design Rate Limit Table Schema
**Files:**
- Modify: `src/database/initialize.ts` (add rate limit tables)

**Interfaces:**
- Consumes: 
- Produces: SQL schema for pgbloom_rate_limits table

- [ ] **Step 1: Design rate limits table**
  ```sql
  CREATE TABLE IF NOT EXISTS pgbloom_rate_limits (
    key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    count INT NOT NULL DEFAULT 0,
    limit_val INT NOT NULL,
    algorithm TEXT NOT NULL, -- fixed_window, sliding_window, token_bucket
    PRIMARY KEY (key, window_start, algorithm)
  );
  CREATE INDEX IF NOT EXISTS pgbloom_rate_limits_key_algorithm_idx ON pgbloom_rate_limits (key, algorithm);
  CREATE INDEX IF NOT EXISTS pgbloom_rate_limits_window_end_idx ON pgbloom_rate_limits (window_end);
  ```

- [ ] **Step 2: Add table initialization**
  - Modify initializeAll to create rate limit tables
  - Add appropriate indexes

- [ ] **Step 3: Commit schema changes**
  ```bash
  git add src/database/initialize.ts
  git commit -m "feat: add rate limit table schema"
  ```

#### Task 13: Implement Fixed Window Rate Limiter
**Files:**
- Create: `src/rate-limit/index.ts`
- Create: `src/rate-limit/types.ts`
- Create: `src/rate-limit/fixed-window.ts`
- Create: `src/rate-limit/queries.ts`

**Interfaces:**
- Consumes: Pool, LocalStore (for optimization)
- Produces: Fixed window rate limiting implementation

- [ ] **Step 1: Define rate limit state and options**
  ```typescript
  export interface RateLimitState {
    pool: Pool;
    localStore: LocalStore | null;
  }
  
  export interface FixedWindowOptions {
    limit: number;
    windowMs: number;
    algorithm: 'fixed_window';
  }
  ```

- [ ] **Step 2: Implement fixed window algorithm**
  - Use atomic increments in PostgreSQL
  - Key format: `${algorithm}:${key}:${windowStartTimestamp}`
  - Return { allowed, limit, remaining, resetAt } information
  - Clean up old entries periodically

- [ ] **Step 3: Implement fixed window query functions**
  - Functions to check and update rate limit counts
  - Use transactions for atomicity where needed

- [ ] **Step 4: Commit fixed window implementation**
  ```bash
  git add src/rate-limit/
  git commit -m "feat: implement fixed window rate limiter"
  ```

#### Task 14: Implement Sliding Window Rate Limiter
**Files:**
- Modify: `src/rate-limit/index.ts` (add sliding window)
- Create: `src/rate-limit/sliding-window.ts`

**Interfaces:**
- Consumes: RateLimitState
- Produces: Sliding window rate limiting implementation

- [ ] **Step 1: Implement sliding window algorithm**
  - Use sorted set or timestamp-based approach in PostgreSQL
  - Calculate request count in sliding time window
  - Implement efficient cleanup of old entries

- [ ] **Step 2: Implement sliding window query functions**
  - Functions to check request count in sliding window
  - Add new request atomically
  - Return rate limit info

- [ ] **Step 3: Commit sliding window implementation**
  ```bash
  git add src/rate-limit/sliding-window.ts
  git commit -m "feat: implement sliding window rate limiter"
  ```

#### Task 15: Implement Token Bucket Rate Limiter
**Files:**
- Modify: `src/rate-limit/index.ts` (add token bucket)
- Create: `src/rate-limit/token-bucket.ts`

**Interfaces:**
- Consumes: RateLimitState
- Produces: Token bucket rate limiting implementation

- [ ] **Step 1: Implement token bucket algorithm**
  - Store bucket state (tokens, lastRefillTimestamp) in PostgreSQL
  - Atomic refill and consumption operations
  - Support burst capacity and refill rate

- [ ] **Step 2: Implement token bucket query functions**
  - Functions to get current token count
  - Consume tokens atomically
  - Refill based on elapsed time
  - Return allowance decision

- [ ] **Step 3: Commit token bucket implementation**
  ```bash
  git add src/rate-limit/token-bucket.ts
  git commit -m "feat: implement token bucket rate limiter"
  ```

#### Task 16: Implement Rate Limit Local Cache Optimization
**Files:**
- Modify: `src/rate-limit/index.ts` (add local cache layer)
- Modify: `src/rate-limit/*` (use local cache where safe)

**Interfaces:**
- Consumes: LocalStore
- Produces: Rate limiting with local cache optimization

- [ ] **Step 1: Determine safe caching strategies**
  - Fixed window: Can cache limit/remaining for short periods
  - Sliding window: Limited caching safety
  - Token bucket: Can cache token count with short TTL
  - Always verify with PostgreSQL for consistency when needed

- [ ] **Step 2: Implement local cache layers**
  - Add local store to rate limit state
  - Check local cache before PostgreSQL calls where safe
  - Update local cache after successful PostgreSQL operations
  - Implement proper invalidation strategies

- [ ] **Step 3: Commit local cache optimization**
  ```bash
  git add src/rate-limit/index.ts src/rate-limit/*.ts
  git commit -m "feat: add local cache optimization to rate limiter"
  ```

#### Task 17: Integrate Rate Limiting into PGBloom Client
**Files:**
- Modify: `src/client/PGSnap.ts` (add rate limit initialization)
- Modify: `src/index.ts` (export rate limit API)
- Modify: `src/types/index.ts` (add rate limit options to PgbloomOptions)

**Interfaces:**
- Consumes: RateLimitState factory
- Produces: Public rate limit API on Pgbloom client

- [ ] **Step 1: Add rate limit options to PgbloomOptions**
  - Add rateLimit?: { defaultAlgorithm?: string, etc } configuration

- [ ] **Step 2: Initialize rate limit state in createPgbloom**
  - Create rate limit state when needed
  - Pass pool and local store to rate limit state

- [ ] **Step 3: Expose rate limit API on client**
  - Add rateLimit.fixedWindow, rateLimit.slidingWindow, rateLimit.tokenBucket methods
  - Return standardized rate limit information objects

- [ ] **Step 4: Commit client integration**
  ```bash
  git add src/client/PGSnap.ts src/index.ts src/types/index.ts
  git commit -m "feat: integrate rate limiting into PGBloom client"
  ```

### Phase 6: Events System

#### Task 18: Design Events Table Schema
**Files:**
- Modify: `src/database/initialize.ts` (add events tables)

**Interfaces:**
- Consumes: 
- Produces: SQL schema for pgbloom_events table

- [ ] **Step 1: Design events table**
  ```sql
  CREATE TABLE IF NOT EXISTS pgbloom_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT UNIQUE NOT NULL, -- UUID or similar
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB -- for replay flags, etc.
  );
  CREATE INDEX IF NOT EXISTS pgbloom_events_type_idx ON pgbloom_events (type);
  CREATE INDEX IF NOT EXISTS pgbloom_events_created_at_idx ON pgbloom_events (created_at);
  CREATE INDEX IF NOT EXISTS pgbloom_events_type_created_at_idx ON pgbloom_events (type, created_at);
  ```

- [ ] **Step 2: Add table initialization**
  - Modify initializeAll to create events table
  - Add appropriate indexes

- [ ] **Step 3: Commit schema changes**
  ```bash
  git add src/database/initialize.ts
  git commit -m "feat: add events table schema"
  ```

#### Task 19: Implement Events State and Core Operations
**Files:**
- Create: `src/events/index.ts`
- Create: `src/events/types.ts`
- Create: `src/events/queries.ts`

**Interfaces:**
- Consumes: Pool, LocalStore (for optimization)
- Produces: EventsState interface and basic emit/listen operations

- [ ] **Step 1: Define EventsState interface**
  ```typescript
  export interface EventsState {
    pool: Pool;
    localStore: LocalStore | null;
    // For managing listeners
    listeners: Map<string, Set<(channel: string, payload: unknown, meta: any) => void | Promise<void>>>;
    listenClient: PoolClient | null;
    isListening: boolean;
  }
  ```

- [ ] **Step 2: Create events state factory**
  - Function to create events state from pool and options

- [ ] **Step 3: Implement basic events operations**
  - emit: Store event in PostgreSQL and send NOTIFY
  - listen: Subscribe to events of specific type(s)
  - Uses existing Pub/Sub infrastructure for real-time distribution
  - Persistent storage in PostgreSQL for history/replay

- [ ] **Step 4: Commit events implementation**
  ```bash
  git add src/events/
  git commit -m "feat: implement events state and core operations"
  ```

#### Task 20: Implement Event History and Replay
**Files:**
- Modify: `src/events/index.ts` (add history/replay methods)
- Modify: `src/events/queries.ts` (add history/replay queries)

**Interfaces:**
- Consumes: EventsState
- Produces: Event history and replay functionality

- [ ] **Step 1: Implement event history**
  - Fetch events with filtering (type, time range, limit, cursor)
  - Implement pagination efficiently
  - Return events in chronological order

- [ ] **Step 2: Implement event replay**
  - Replay events through normal listener path
  - Mark replayed events in metadata to distinguish from live events
  - Support date range and type filtering for replay

- [ ] **Step 3: Commit history and replay implementation**
  ```bash
  git add src/events/index.ts src/events/queries.ts
  git commit -m "feat: implement event history and replay"
  ```

#### Task 21: Integrate Events into PGBloom Client
**Files:**
- Modify: `src/client/PGSnap.ts` (add events initialization)
- Modify: `src/index.ts` (export events API)
- Modify: `src/types/index.ts` (add events options to PgbloomOptions)

**Interfaces:**
- Consumes: EventsState factory
- Produces: Public events API on Pgbloom client

- [ ] **Step 1: Add events options to PgbloomOptions**
  - Add events?: { etc } configuration

- [ ] **Step 2: Initialize events state in createPgbloom**
  - Create events state when needed
  - Pass pool and local store to events state
  - Set up listener infrastructure

- [ ] **Step 3: Expose events API on client**
  - Add emit, listen methods
  - Add history, replay methods
  - Return unsubscribe functions for listeners

- [ ] **Step 4: Commit client integration**
  ```bash
  git add src/client/PGSnap.ts src/index.ts src/types/index.ts
  git commit -m "feat: integrate events into PGBloom client"
  ```

### Phase 7: Counters

#### Task 22: Design Counters Table Schema
**Files:**
- Modify: `src/database/initialize.ts` (add counters table)

**Interfaces:**
- Consumes: 
- Produces: SQL schema for pgbloom_counters table

- [ ] **Step 1: Design counters table**
  ```sql
  CREATE TABLE IF NOT EXISTS pgbloom_counters (
    key TEXT PRIMARY KEY,
    value BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS pgbloom_counters_value_idx ON pgbloom_counters (value);
  ```

- [ ] **Step 2: Add table initialization**
  - Modify initializeAll to create counters table
  - Add appropriate index

- [ ] **Step 3: Commit schema changes**
  ```bash
  git add src/database/initialize.ts
  git commit -m "feat: add counters table schema"
  ```

#### Task 23: Implement Counters State and Core Operations
**Files:**
- Create: `src/counter/index.ts`
- Create: `src/counter/types.ts`
- Create: `src/counter/queries.ts`

**Interfaces:**
- Consumes: Pool, LocalStore (for optimization)
- Produces: CounterState interface and basic increment/decrement operations

- [ ] **Step 1: Define CounterState interface**
  ```typescript
  export interface CounterState {
    pool: Pool;
    localStore: LocalStore | null;
  }
  ```

- [ ] **Step 2: Create counter state factory**
  - Function to create counter state from pool and options

- [ ] **Step 3: Implement basic counter operations**
  - increment: Atomic increment using PostgreSQL UPDATE
  - decrement: Atomic decrement using PostgreSQL UPDATE
  - add/subtract: Add or subtract arbitrary amount atomically
  - get: Retrieve current counter value
  - set: Set counter to specific value
  - All operations use PostgreSQL's atomic capabilities to prevent race conditions

- [ ] **Step 4: Commit counter implementation**
  ```bash
  git add src/counter/
  git commit -m "feat: implement counter state and core operations"
  ```

#### Task 24: Implement Counter Local Cache with Consistency Options
**Files:**
- Modify: `src/counter/index.ts` (add local cache layer)
- Modify: `src/counter/*` (implement consistency options)

**Interfaces:**
- Consumes: LocalStore
- Produces: Counter implementation with local cache and consistency options

- [ ] **Step 1: Implement consistency options**
  - strong: Always read from PostgreSQL (no local cache for reads)
  - local: Read from local cache only (may be stale)
  - eventual: Read from local cache, fallback to PostgreSQL on miss
  - Implement get operation with consistency parameter

- [ ] **Step 2: Implement local cache for counters**
  - Store counter values in local cache with short TTL
  - Update local cache after successful write operations
  - Handle cache invalidation properly
  - Ensure write operations always go to PostgreSQL first

- [ ] **Step 3: Commit local cache with consistency options**
  ```bash
  git add src/counter/index.ts src/counter/*.ts
  git commit -m "feat: implement counter local cache with consistency options"
  ```

#### Task 25: Integrate Counters into PGBloom Client
**Files:**
- Modify: `src/client/PGSnap.ts` (add counter initialization)
- Modify: `src/index.ts` (export counter API)
- Modify: `src/types/index.ts` (add counter options to PgbloomOptions)

**Interfaces:**
- Consumes: CounterState factory
- Produces: Public counter API on Pgbloom client

- [ ] **Step 1: Add counter options to PgbloomOptions**
  - Add counter?: { etc } configuration

- [ ] **Step 2: Initialize counter state in createPgbloom**
  - Create counter state when needed
  - Pass pool and local store to counter state

- [ ] **Step 3: Expose counter API on client**
  - Add counter.increment, counter.decrement, counter.add, counter.subtract methods
  - Add counter.get and counter.set methods
  - Support consistency options in get operation

- [ ] **Step 4: Commit client integration**
  ```bash
  git add src/client/PGSnap.ts src/index.ts src/types/index.ts
  git commit -m "feat: integrate counters into PGBloom client"
  ```

### Phase 8: Testing and Documentation

#### Task 26: Create Comprehensive Tests
**Files:**
- Create: `test/lock.test.ts`
- Create: `test/scheduler.test.ts`
- Create: `test/rate-limit.test.ts`
- Create: `test/events.test.ts`
- Create: `test/counter.test.ts`
- Create: `test/storage.test.ts` (for local storage abstraction)

**Interfaces:**
- Consumes: All implemented features
- Produces: Test suite for new functionality

- [ ] **Step 1: Write unit tests for storage abstraction**
  - Test local store interface implementations
  - Test memory cache wrapper
  - Test factory functions

- [ ] **Step 2: Write integration tests for locks**
  - Test lock/unlock/tryLock operations
  - Test leader election
  - Test failure scenarios and recovery
  - Test multi-process coordination (using test doubles or mock processes)

- [ ] **Step 3: Write integration tests for scheduler**
  - Test scheduling delayed jobs
  - Test recurring jobs
  - Test worker job processing
  - Test retry logic and backoff
  - Test multiple worker coordination

- [ ] **Step 4: Write integration tests for rate limiting**
  - Test fixed window algorithm
  - Test sliding window algorithm
  - Test token bucket algorithm
  - Test concurrent requests
  - Test local cache optimization safety

- [ ] **Step 5: Write integration tests for events**
  - Test event emit/listen
  - Test event history and pagination
  - Test event replay functionality
  - Test multiple listeners
  - Test LISTEN/NOTIFY integration

- [ ] **Step 6: Write integration tests for counters**
  - Test atomic increment/decrement
  - Test consistency options
  - Test concurrent counter updates
  - Test local cache behavior

- [ ] **Step 7: Commit test suite**
  ```bash
  git add test/*.test.ts
  git commit -m "feat: add comprehensive tests for new features"
  ```

#### Task 27: Run Existing Tests to Ensure Backward Compatibility
**Files:**
- No new files (run existing tests)

**Interfaces:**
- Consumes: 
- Produces: Verification that existing functionality still works

- [ ] **Step 1: Run existing cache tests**
  - Ensure cache functionality unchanged
  - Ensure Bloom Filter integration still works
  - Test with and without local cache enabled

- [ ] **Step 2: Run existing pubsub tests**
  - Ensure publish/subscribe still works
  - Test LISTEN/NOTIFY functionality
  - Test with local cache enabled/disabled

- [ ] **Step 3: Run existing queue tests**
  - Ensure enqueue/dequeue still works
  - Test FOR UPDATE SKIP LOCKED behavior
  - Test job completion/failure/retry

- [ ] **Step 4: Run existing bloom tests**
  - Ensure public Bloom Filter API works
  - Ensure internal cache Bloom Filter still functions
  - Test serialization/deserialization

- [ ] **Step 5: Commit compatibility verification**
  ```bash
  # After running tests and verifying they pass
  git commit -m "test: verify backward compatibility"
  ```

#### Task 28: Update Documentation
**Files:**
- Modify: `README.md` (add documentation for new features)
- Create: `docs/locks.md`, `docs/scheduler.md`, etc. (detailed documentation)
- Modify: `tsdoc comments` in source code (if applicable)

**Interfaces:**
- Consumes: All implemented features
- Produces: Updated documentation

- [ ] **Step 1: Update README with new features**
  - Add sections for Locks, Scheduler, Rate Limiting, Events, Counters
  - Show usage examples for each new feature
  - Explain local cache configuration
  - Mention backward compatibility

- [ ] **Step 2: Create detailed documentation files**
  - Document each feature's API in detail
  - Explain configuration options
  - Provide usage examples
  - Mention performance considerations and best practices

- [ ] **Step 3: Update JSDoc/Typedoc comments**
  - Ensure all new functions and types are properly documented
  - Document parameters, return values, and exceptions
  - Include usage examples where helpful

- [ ] **Step 4: Commit documentation updates**
  ```bash
  git add README.md docs/
  git commit -m "docs: update documentation for new features"
  ```

#### Task 29: Perform Final Build and Type Checking
**Files:**
- No new files (run build commands)

**Interfaces:**
- Consumes: All source code
- Produces: Built distributable packages

- [ ] **Step 1: Run type checking**
  - Execute `npm run typecheck`
  - Verify no TypeScript errors
  - Fix any type issues that arise

- [ ] **Step 2: Run build process**
  - Execute `npm run build`
  - Verify ESM and CJS bundles are created correctly
  - Verify output files are in dist/ directory

- [ ] **Step 3: Run linting if available**
  - Execute `npm run lint` if linting is configured
  - Fix any linting issues

- [ ] **Step 4: Commit build verification**
  ```bash
  git add dist/
  git commit -m "build: verify successful build and type checking"
  ```

#### Task 30: Final Verification and Cleanup
**Files:**
- No specific files

**Interfaces:**
- Consumes: 
- Produces: Final verification that everything works

- [ ] **Step 1: Run all tests one final time**
  - Execute `npm test`
  - Verify all tests pass (existing and new)
  - Check for any regressions

- [ ] **Step 2: Check for and remove any temporary files**
  - Remove console.log statements, debug code, etc.
  - Ensure code follows existing style guidelines

- [ ] **Step 3: Commit final verification**
  ```bash
  git commit -m "feat: final verification and cleanup"
  ```

## Summary

This plan implements the PGBloom expansion by:

1. **Foundation**: Creating local storage abstraction with ssdiskdb and memory cache layers
2. **Locks**: Implementing distributed locks and leader election using PostgreSQL
3. **Scheduler**: Adding delayed jobs, recurring jobs, and retry jobs with worker coordination
4. **Rate Limiting**: Implementing fixed window, sliding window, and token bucket algorithms
5. **Events**: Creating event system with history, replay, and LISTEN/NOTIFY integration
6. **Counters**: Building PostgreSQL-backed atomic counters with consistency options
7. **Testing**: Ensuring comprehensive test coverage and backward compatibility
8. **Documentation**: Updating README and creating detailed documentation

Each phase builds upon the previous one, maintaining the existing architecture while adding new features that follow the same patterns and conventions.