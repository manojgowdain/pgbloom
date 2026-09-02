# pgbloom

A lightweight PostgreSQL-backed **Cache**, **Pub/Sub**, **Queue**, **Locks**, **Scheduler**, **Rate Limiting**, **Events**, and **Counters** library for Node.js with built-in Bloom Filter optimization.

## Installation

```bash
npm install pgbloom
```

Requires Node.js 14+ and a PostgreSQL database.

---

## Quick Start

```typescript
import pgbloom from "pgbloom";

const client = await pgbloom(process.env.DATABASE_URL!);

// Cache
await client.setCache("user:123", { name: "user", role: "admin" }, 3600000);
const user = await client.getCache("user:123");

// Pub/Sub
await client.publish("notifications", { type: "welcome", userId: 123 });
await client.subscribe("notifications", (channel, payload) => {
  console.log("Received:", payload);
});

// Queue
await client.enqueue("email-queue", { to: "user@example.com", subject: "Hello" });
const job = await client.dequeue("email-queue");
if (job) {
  await sendEmail(job.payload);
  await client.completeJob(job.id);
}

// Locks
const acquired = await client.tryLock("resource:123");
if (acquired) {
  try {
    // critical section
  } finally {
    await client.unlock("resource:123", holderId);
  }
}

// Scheduler
await client.schedule("send-email", { userId: 123 }, new Date(Date.now() + 60000));

// Rate Limiting
const result = await client.rateLimit("user:123", 100, 60000);
if (result.allowed) {
  // proceed
}

// Events
await client.emit("user.created", { userId: 123 });
await client.listen("user.created", (type, payload, meta) => {
  console.log("User created:", payload);
});

// Counters
await client.increment("page_views");
const views = await client.getCounter("page_views");

await client.close();
```

---

## Configuration

```typescript
interface PgbloomOptions {
  // Cache
  cleanupInterval?: number | false;     // default: 5 minutes; false = disable
  bloomFilter?: boolean;                // default: false
  bloom?: {
    expectedItems?: number;             // default: 10000
    falsePositiveRate?: number;         // default: 0.01
    rebuildInterval?: number | false;   // default: 15 minutes
  };

  // PostgreSQL Pool
  maxConnections?: number;              // default: 10
  idleTimeoutMillis?: number;           // default: 30000
  connectionTimeoutMillis?: number;     // default: 2000

  // Queue
  queue?: {
    visibilityTimeout?: number;         // default: 30000
  };

  // Locks
  lock?: {
    defaultTtl?: number;                // default: 30000 (30 seconds)
  };

  // Scheduler
  scheduler?: {
    workerId?: string;                  // unique worker identifier
    pollingInterval?: number;           // default: 1000ms
  };

  // Rate Limit
  rateLimit?: {
    defaultAlgorithm?: 'fixed_window' | 'sliding_window' | 'token_bucket'; // default: 'fixed_window'
  };

  // Events
  events?: {
    maxListenersPerType?: number;       // default: 100
  };

  // Counters
  counter?: {
    defaultConsistency?: 'strong' | 'local' | 'eventual'; // default: 'strong'
  };
}
```

---

## Cache API

```typescript
// Store a value (objects auto-serialized to JSON)
await client.setCache(key: string, value: unknown, expiry?: number | Date): Promise<unknown>;

// Retrieve a value (null if missing or expired)
await client.getCache<T>(key: string): Promise<T | null>;

// Delete a key
await client.deleteCache(key: string): Promise<void>;

// Clear all entries
await client.clearCache(): Promise<void>;

// Clear only expired entries
await client.clearExpiredCache(): Promise<number>;
```

**Supported value types:** strings, numbers, booleans, `null`, objects, arrays.

**Expiry:** Pass milliseconds from now (`number`) or an absolute `Date`.

### Internal Bloom Filter (Cache Optimization)

Enable an internal Bloom Filter to accelerate `getCache()` calls for keys that definitely don't exist:

```typescript
const client = await pgbloom(DATABASE_URL, {
  bloomFilter: true,
  bloom: {
    expectedItems: 100000,
    falsePositiveRate: 0.01,
    rebuildInterval: 15 * 60 * 1000
  }
});
```

---

## Pub/Sub API

```typescript
// Publish to a channel
await client.publish(channel: string, payload: unknown): Promise<void>;

// Subscribe to a channel
const unsubscribe = await client.subscribe(channel: string, handler: (channel, payload) => void): Promise<() => void>;
```

Uses PostgreSQL `LISTEN`/`NOTIFY` — no polling, minimal latency.

---

## Queue API

```typescript
// Enqueue a job
const job = await client.enqueue<T>(queueName: string, payload: T, options?: {
  priority?: number;         // higher = processed first (default: 0)
  maxAttempts?: number;      // default: 3
  visibilityTimeout?: number // ms before re-queue on failure (default: 30000)
}): Promise<QueueJob<T>>;

// Dequeue next available job (uses FOR UPDATE SKIP LOCKED)
const job = await client.dequeue<T>(queueName: string): Promise<QueueJob<T> | null>;

// Mark job complete
await client.completeJob(jobId: number): Promise<void>;

// Mark job failed (auto-retries if attempts remain)
await client.failJob(jobId: number, error: string): Promise<void>;

// Get queue statistics
const stats = await client.getQueueStats(queueName: string);

// Cleanup old completed/failed jobs
await client.cleanupJobs(queueName: string, olderThan?: Date): Promise<number>;
```

---

## Locks API

```typescript
// Try to acquire a lock (non-blocking)
const acquired = await client.tryLock(key: string, options?: { ttl?: number }): Promise<boolean>;

// Acquire a lock (blocking with timeout)
await client.lock(key: string, options?: { ttl?: number; timeout?: number }): Promise<void>;

// Release a lock
await client.unlock(key: string, holderId: string): Promise<void>;

// Leader Election
const holderId = await client.acquireLeadership(resource: string, options?: { ttl?: number; onLost?: () => void }): Promise<string | null>;
await client.releaseLeadership(resource: string, holderId: string): Promise<void>;
const isLeader = await client.isLeader(resource: string, holderId: string): Promise<boolean>;
```

Uses PostgreSQL advisory locks for distributed coordination across multiple processes.

**Lock Features:**
- Automatic TTL-based expiration
- Safe release (only lock holder can unlock)
- Leader election with automatic heartbeat renewal
- `onLeadershipLost` callback for failover handling

---

## Scheduler API

```typescript
// Schedule a one-time job
await client.schedule(name: string, payload: unknown, runAt: Date, options?: {
  priority?: number;
  maxAttempts?: number;
  interval?: string; // for recurring
}): Promise<{ id: number }>;

// Schedule a recurring job (cron-like intervals: 5s, 10m, 1h, 1d)
await client.scheduleRecurring(name: string, payload: unknown, interval: string, options?: {
  priority?: number;
  maxAttempts?: number;
}): Promise<{ id: number }>;

// Cancel a scheduled job
await client.cancelSchedule(jobId: number): Promise<void>;

// Get job details
const job = await client.getSchedule(jobId: number);

// List schedules
const jobs = await client.listSchedules({ status?: string; name?: string });
```

**Features:**
- Delayed jobs (run at specific time)
- Recurring jobs with simple intervals
- Priority-based ordering
- Automatic retry with exponential backoff
- Multiple workers supported via `FOR UPDATE SKIP LOCKED`
- Worker identification for distributed scheduling

---

## Rate Limiting API

```typescript
// Fixed Window Rate Limiting
const result = await client.rateLimit(key: string, limit: number, windowMs: number): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}>;

// Token Bucket Rate Limiting
const result = await client.rateLimitTokenBucket(key: string, capacity: number, refillRate: number): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}>;

// Helper functions for key generation
pgbloom.generateUserKey(userId: string, api?: string): string;
pgbloom.generateIpKey(ip: string, endpoint?: string): string;
pgbloom.generateKey(prefix: string, identifier: string): string;
```

**Algorithms:**
- **Fixed Window**: Simple, low overhead. Divides time into fixed windows.
- **Sliding Window**: More accurate. Counts requests in rolling time window.
- **Token Bucket**: Supports bursts. Bucket refills at constant rate.

All algorithms are atomic and safe under concurrent access across multiple processes.

---

## Events API

```typescript
// Emit an event (stored in DB + real-time NOTIFY)
const eventId = await client.emit(type: string, payload: unknown, metadata?: Record<string, unknown>): Promise<string>;

// Listen for events
const unsubscribe = await client.listen(type: string, handler: (type, payload, meta) => void): Promise<() => void>;

// Get event history with pagination
const { events, nextCursor } = await client.getEventHistory(options?: {
  type?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
});

// Replay events through handlers
await client.replayEvents(from: Date, to: Date | undefined, type: string | undefined, handler: (event) => void): Promise<{ replayed: number }>;
```

**Features:**
- Persistent event storage in PostgreSQL
- Real-time delivery via LISTEN/NOTIFY
- Event history with pagination
- Event replay with `isReplay` metadata flag
- Multiple listeners per event type

---

## Counters API

```typescript
// Increment counter (default delta=1)
await client.increment(key: string, delta?: number): Promise<{ value: number }>;

// Decrement counter (default delta=1)
await client.decrement(key: string, delta?: number): Promise<{ value: number }>;

// Add arbitrary amount
await client.add(key: string, delta: number): Promise<{ value: number }>;

// Subtract arbitrary amount
await client.subtract(key: string, delta: number): Promise<{ value: number }>;

// Get counter value with consistency options
await client.getCounter(key: string, options?: { consistency?: 'strong' | 'local' | 'eventual' }): Promise<{ value: number }>;

// Set counter to specific value
await client.setCounter(key: string, value: number): Promise<{ value: number }>;

// Remove counter
await client.removeCounter(key: string): Promise<boolean>;
```

**Consistency Levels:**
- **strong**: Always reads from PostgreSQL (default, most consistent)
- **local**: Reads from local cache only (fast, may be stale)
- **eventual**: Reads from local cache, falls back to PostgreSQL on miss

All write operations are atomic (PostgreSQL `UPDATE ... SET value = value + $delta`).

---

## Local Storage

PGBloom supports a local persistent cache layer using `ssdiskdb` to reduce unnecessary PostgreSQL calls.

```typescript
const client = await pgbloom(DATABASE_URL, {
  localCache: {
    enabled: true,
    path: "./.pgbloom",      // local storage directory
    ttl: 60000,              // default TTL in ms
    maxEntries: 100000       // max memory cache entries
  }
});
```

**Architecture:**
```
Application
     ↓
PGBloom
     ↓
Memory Cache (L1)
     ↓
ssdiskdb (L2 - persistent)
     ↓
PostgreSQL (Source of Truth)
```

**Cache Coherency:** Uses existing Pub/Sub infrastructure for invalidation across processes.

---

## Bloom Filter

PGBloom includes a production-quality **Bloom Filter** implementation with two distinct use cases:

### 1. Internal Bloom Filter (Cache Optimization)

See Cache section above.

### 2. Public Bloom Filter (Independent)

Create independent Bloom Filters for your own use cases:

```typescript
const bloom = client.bloom({
  expectedItems: 100000,
  falsePositiveRate: 0.01
});

bloom.add("user:123");
bloom.add("session:abc");

console.log(bloom.has("user:123"));  // true
console.log(bloom.has("user:999"));  // false (definitely not present)

bloom.clear();
console.log(bloom.has("user:123"));  // false
```

**API:**
```typescript
interface BloomFilter {
  add(value: BloomFilterValue): void;
  has(value: BloomFilterValue): boolean;
  clear(): void;
  size(): number;
  toJSON(): BloomFilterJSON;
  static fromJSON(json: BloomFilterJSON): BloomFilter;
}

type BloomFilterValue = string | number | boolean | bigint | null;
```

---

## Module Formats

Both ESM and CommonJS are supported:

```typescript
// ESM
import pgbloom, { BloomFilter } from "pgbloom";

// CommonJS
const { default: pgbloom, BloomFilter } = require("pgbloom");
```

---

## License

MIT