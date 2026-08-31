# pgsnap

A lightweight PostgreSQL-backed **Cache**, **Pub/Sub**, and **Queue** library for Node.js.

## Installation

```bash
npm install pgsnap
```

Requires Node.js 14+ and a PostgreSQL database.

---

## Quick Start

```typescript
import PGSnap from "pgsnap";

const pgsnap = await PGSnap(process.env.DATABASE_URL!);

// Cache
await pgsnap.setCache("user:123", { name: "Manoj", role: "admin" }, 3600000);
const user = await pgsnap.getCache("user:123");

// Pub/Sub
await pgsnap.publish("notifications", { type: "welcome", userId: 123 });
await pgsnap.subscribe("notifications", (channel, payload) => {
  console.log("Received:", payload);
});

// Queue
await pgsnap.enqueue("email-queue", { to: "user@example.com", subject: "Hello" });
const job = await pgsnap.dequeue("email-queue");
if (job) {
  await sendEmail(job.payload);
  await pgsnap.completeJob(job.id);
}

await pgsnap.close();
```

---

## Bloom Filter

PGSnap includes a production-quality **Bloom Filter** implementation with two distinct use cases:

### 1. Internal Bloom Filter (Cache Optimization)

Enable an internal Bloom Filter to accelerate `getCache()` calls for keys that definitely don't exist:

```typescript
const pgsnap = await PGSnap(DATABASE_URL, {
  bloomFilter: true,
  bloom: {
    expectedItems: 100000,      // expected cache entries
    falsePositiveRate: 0.01,    // 1% false positive rate
    rebuildInterval: 15 * 60 * 1000 // rebuild every 15 minutes
  }
});

// Internally: checks Bloom Filter first, skips PostgreSQL for definite misses
const user = await pgsnap.getCache("user:999"); // Returns null without querying DB if key not in filter
```

**How it works:**

```
getCache(key)
    │
    ▼
Bloom Filter
    │
    ├──── "definitely not present" ──► return null (no PostgreSQL query)
    │
    └──── "possibly present" ────────► query PostgreSQL (source of truth)
```

**Guarantees:**
- **No false negatives**: If the Bloom Filter says "not present", the key is definitely not in the cache.
- **False positives possible**: If the Bloom Filter says "possibly present", PostgreSQL is always consulted.
- PostgreSQL remains the **source of truth** for expiration and actual data.

**Configuration:**
```typescript
interface BloomOptions {
  expectedItems?: number;       // default: 10000
  falsePositiveRate?: number;   // default: 0.01 (1%)
  rebuildInterval?: number | false; // default: 15 minutes; false = disable
}
```

**Behavior on write operations:**
- `setCache(key, value)` → adds key to Bloom Filter **after** successful DB write
- `deleteCache(key)` → safely removes key using Counting Bloom Filter (no false negatives)
- `clearCache()` → resets Bloom Filter
- `clearExpiredCache()` → expired keys may remain temporarily (harmless false positives)
- Automatic periodic rebuild keeps filter in sync

---

### 2. Public Bloom Filter (Independent)

Create independent Bloom Filters for your own use cases:

```typescript
const bloom = pgsnap.bloom({
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

**Key points:**
- The public Bloom Filter is **completely independent** from the internal cache Bloom Filter
- `pgsnap.bloom()` creates a new, separate instance
- Supports serialization via `toJSON()` / `fromJSON()`

---

## Cache API

```typescript
// Store a value (objects auto-serialized to JSON)
await pgsnap.setCache(key: string, value: unknown, expiry?: number | Date): Promise<unknown>;

// Retrieve a value (null if missing or expired)
await pgsnap.getCache<T>(key: string): Promise<T | null>;

// Delete a key
await pgsnap.deleteCache(key: string): Promise<void>;

// Clear all entries
await pgsnap.clearCache(): Promise<void>;

// Clear only expired entries
await pgsnap.clearExpiredCache(): Promise<number>;
```

**Supported value types:** strings, numbers, booleans, `null`, objects, arrays.

**Expiry:** Pass milliseconds from now (`number`) or an absolute `Date`.

---

## Pub/Sub API

```typescript
// Publish to a channel
await pgsnap.publish(channel: string, payload: unknown): Promise<void>;

// Subscribe to a channel
const unsubscribe = await pgsnap.subscribe(channel: string, handler: (channel, payload) => void): Promise<() => void>;
```

Uses PostgreSQL `LISTEN`/`NOTIFY` — no polling, minimal latency.

---

## Queue API

```typescript
// Enqueue a job
const job = await pgsnap.enqueue<T>(queueName: string, payload: T, options?: {
  priority?: number;         // higher = processed first (default: 0)
  maxAttempts?: number;      // default: 3
  visibilityTimeout?: number // ms before re-queue on failure (default: 30000)
}): Promise<QueueJob<T>>;

// Dequeue next available job (uses FOR UPDATE SKIP LOCKED)
const job = await pgsnap.dequeue<T>(queueName: string): Promise<QueueJob<T> | null>;

// Mark job complete
await pgsnap.completeJob(jobId: number): Promise<void>;

// Mark job failed (auto-retries if attempts remain)
await pgsnap.failJob(jobId: number, error: string): Promise<void>;

// Get queue statistics
const stats = await pgsnap.getQueueStats(queueName: string);

// Cleanup old completed/failed jobs
await pgsnap.cleanupJobs(queueName: string, olderThan?: Date): Promise<number>;
```

---

## Configuration

```typescript
interface PGSnapOptions {
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
}
```

---

## Module Formats

Both ESM and CommonJS are supported:

```typescript
// ESM
import PGSnap, { BloomFilter } from "pgsnap";

// CommonJS
const { default: PGSnap, BloomFilter } = require("pgsnap");
```

---

## Bloom Filter Internals

- **Counting Bloom Filter**: Uses `Uint16Array` counters for safe deletion
- **Double hashing**: FNV-1a + xorshift32 for k hash positions from 2 base hashes
- **No external dependencies**: Pure TypeScript implementation
- **Optimal sizing**: `m = -(n * ln(p)) / ln(2)²`, `k = (m/n) * ln(2)`

---

## License

MIT# pgsnap
