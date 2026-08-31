# PGSnap Design Specification

**Date:** 2026-08-31  
**Project:** PGSnap - PostgreSQL-powered Cache, Pub/Sub, and Queue for Node.js  
**Status:** Approved for Implementation

---

## 1. Overview

PGSnap is a lightweight TypeScript/Node.js library that provides three core features using a single PostgreSQL connection:
- **Cache** - Fast temporary data storage with TTL expiry
- **Pub/Sub** - Real-time event broadcasting using PostgreSQL LISTEN/NOTIFY
- **Queue** - Durable background job processing with retries, concurrency, and crash recovery

**Philosophy:** Simple API outside, sophisticated internals. One PostgreSQL URL, zero external dependencies.

---

## 2. Public API

### 2.1 Initialization

```typescript
import PGSnap from "pgsnap";

const pgsnap = PGSnap("postgresql://user:pass@localhost:5432/db");
// or with options
const pgsnap = PGSnap(process.env.DATABASE_URL, {
    cleanupInterval: 5 * 60 * 1000,      // cache cleanup interval (ms), false to disable
    maxConnections: 10,                    // pool size
    idleTimeoutMillis: 30000,              // pool idle timeout
    connectionTimeoutMillis: 10000,        // pool connection timeout
    queueRetention: 24 * 60 * 60 * 1000,   // completed job retention (ms)
    queue: {
        visibilityTimeout: 5 * 60 * 1000   // job lock timeout (ms)
    }
});
```

### 2.2 Cache API

```typescript
// Set cache with expiry (ms from now, Date, or default 1 hour)
await pgsnap.setCache("user:123", { name: "Manoj" }, 3600000);
await pgsnap.setCache("session:abc", sessionData, new Date(Date.now() + 3600000));
await pgsnap.setCache("simple", "value"); // defaults to 1 hour

// Get cache with generic type
const user = await pgsnap.getCache<User>("user:123"); // Promise<User | null>
const value = await pgsnap.getCache("simple");        // Promise<string | null>

// Delete and clear
await pgsnap.deleteCache("user:123");
await pgsnap.clearCache();
await pgsnap.clearExpiredCache();
```

### 2.3 Pub/Sub API

```typescript
// Subscribe returns unsubscribe function
const unsubscribe = await pgsnap.subscribe<UserUpdated>("user.updated", async (msg) => {
    console.log("User updated:", msg);
});

// Publish (fire-and-forget, non-durable)
await pgsnap.publish("user.updated", { id: 123, name: "Manoj" });

// Unsubscribe
unsubscribe();
```

### 2.4 Queue API

```typescript
const emailQueue = pgsnap.queue<EmailJob>(
    "emails",
    async (job) => {
        await sendEmail(job.to, job.subject);
    },
    {
        concurrency: 5,        // parallel workers
        pollInterval: 1000,    // polling fallback (ms)
        retries: 3,            // max retry attempts
        retryDelay: 5000,      // base delay for exponential backoff (ms)
        visibilityTimeout: 5 * 60 * 1000 // job lock timeout (ms)
    }
);

// Add jobs
const jobId = await emailQueue.add({ to: "user@example.com", subject: "Welcome" });

// Graceful shutdown
await emailQueue.close();
```

### 2.5 Lifecycle

```typescript
await pgsnap.close(); // stops all timers, workers, connections
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PGSnap Client                          │
├─────────────────┬─────────────────────┬─────────────────────┤
│     Cache       │      Pub/Sub        │       Queue         │
├─────────────────┼─────────────────────┼─────────────────────┤
│ pgsnap_cache    │ pg_notify / LISTEN  │ pgsnap_queue        │
│ table           │ dedicated Client    │ table + workers     │
└────────┬────────┴──────────┬──────────┴──────────┬───────────┘
         │                   │                      │
         └───────────────────┼──────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │  pg.Pool        │
                    │  (shared)       │
                    └─────────────────┘
```

### 3.1 Components

| Component | Responsibility |
|-----------|----------------|
| `PGSnap` | Main factory/client, manages lifecycle, coordinates subsystems |
| `Cache` | Key-value operations with TTL, automatic cleanup |
| `PubSub` | LISTEN/NOTIFY with dedicated connection, reconnection, channel mapping |
| `Queue` | Job queue with workers, SKIP LOCKED, retries, crash recovery |
| `Pool` | Shared pg.Pool for normal queries |
| `ListenerClient` | Dedicated pg.Client for LISTEN subscriptions |
| `Initialization` | Automatic table creation with advisory locks |

---

## 4. Database Schema

### 4.1 Cache Table

```sql
CREATE TABLE IF NOT EXISTS pgsnap_cache (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pgsnap_cache_expires_at_idx
ON pgsnap_cache (expires_at);
```

### 4.2 Queue Table

```sql
CREATE TABLE IF NOT EXISTS pgsnap_queue (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS pgsnap_queue_pending_idx
ON pgsnap_queue (queue_name, status, available_at);

CREATE INDEX IF NOT EXISTS pgsnap_queue_locked_idx
ON pgsnap_queue (queue_name, locked_at)
WHERE status = 'processing';
```

---

## 5. Implementation Details

### 5.1 Cache

- **Serialization**: `JSON.stringify` for objects/arrays, pass-through for primitives
- **Expiry**: Milliseconds from now, Date objects, default 1 hour
- **Get**: Single query with `expires_at > NOW()` filter
- **Set**: `INSERT ... ON CONFLICT (key) DO UPDATE`
- **Cleanup**: Background `DELETE WHERE expires_at <= NOW()` every 5 min (configurable)

### 5.2 Pub/Sub

- **Channel Mapping**: User topic → `pgsnap_pub_<sha256(topic)>` (safe, no SQL injection)
- **Listener**: Single dedicated `pg.Client` with `LISTEN` for all subscribed channels
- **Reconnection**: Exponential backoff (1s, 2s, 4s, 8s, max 30s), restores all subscriptions
- **Publish**: `SELECT pg_notify($1, $2)` with parameterized channel and payload
- **Delivery**: At-most-once, non-durable (messages lost if no subscribers)

### 5.3 Queue

- **Job Claiming**: Transaction with `FOR UPDATE SKIP LOCKED` to atomically claim job
- **Handler Execution**: Outside transaction (no long-held locks)
- **Concurrency**: Internal semaphore/pool limiting parallel handlers
- **Retries**: Exponential backoff: `retryDelay * 2^(attempt-1)` (5s, 10s, 20s...)
- **Crash Recovery**: Jobs with `status='processing'` AND `locked_at < NOW() - visibilityTimeout` reset to pending
- **Notification**: `pg_notify` on `add()` to wake workers immediately, polling fallback
- **Cleanup**: Background delete completed/failed jobs older than `queueRetention`

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid connection string | Throw clear error on init |
| Invalid key (>255 chars) | Throw on operation |
| Invalid expiry | Throw on setCache |
| Serialization failure | Throw on set/publish/add |
| Deserialization failure | Return null (cache) / log error (pubsub/queue) |
| DB connection failure | Throw on operations, queue/pubsub reconnect |
| Handler throws (queue) | Retry with backoff, mark failed after max retries |
| Handler throws (pubsub) | Log error, don't crash, other subscriptions unaffected |
| Close called multiple times | Safe, idempotent |

---

## 7. TypeScript Types

```typescript
export interface PGSnapOptions {
    cleanupInterval?: number | false;
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    queueRetention?: number;
    queue?: {
        visibilityTimeout?: number;
    };
}

export interface QueueOptions {
    concurrency?: number;
    pollInterval?: number;
    retries?: number;
    retryDelay?: number;
    visibilityTimeout?: number;
}

export interface Queue<T> {
    add(data: T): Promise<number>;
    close(): Promise<void>;
}

export type CacheExpiry = number | Date;

export interface PGSnap {
    // Cache
    getCache<T>(key: string): Promise<T | null>;
    setCache<T>(key: string, value: T, expiry?: CacheExpiry): Promise<T>;
    deleteCache(key: string): Promise<void>;
    clearCache(): Promise<void>;
    clearExpiredCache(): Promise<void>;

    // Pub/Sub
    publish<T>(topic: string, message: T): Promise<void>;
    subscribe<T>(topic: string, handler: (message: T) => void | Promise<void>): Promise<() => void>;

    // Queue
    queue<T>(name: string, handler: (job: T) => void | Promise<void>, options?: QueueOptions): Queue<T>;

    // Lifecycle
    close(): Promise<void>;
}
```

---

## 8. Build Configuration

### 8.1 Package.json Exports

```json
{
  "name": "pgsnap",
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/esm/index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "npm run build:esm && npm run build:cjs",
    "build:esm": "tsc -p tsconfig.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

### 8.2 TypeScript Configs

- `tsconfig.json`: ESM output (`module: "NodeNext"`, `outDir: "dist/esm"`)
- `tsconfig.cjs.json`: CJS output (`module: "CommonJS"`, `outDir: "dist/cjs"`)

---

## 9. Testing Strategy

### 9.1 Test Requirements
- Real PostgreSQL database (integration tests)
- Test database via environment variable `PGSNAP_TEST_DB`
- Vitest for test runner
- Tests for: Cache, Pub/Sub, Queue, ESM import, CJS require

### 9.2 Test Coverage
| Feature | Tests |
|---------|-------|
| Cache | init, set, get, delete, clear, expiry, cleanup, types, upsert, invalid keys |
| Pub/Sub | publish, subscribe, receive, objects, multi-sub, multi-topic, unsubscribe, errors, reconnect |
| Queue | create, add, process, complete, fail, retry, concurrency, multi-worker, SKIP LOCKED, recovery, notification, cleanup, close |
| Build | ESM import, CJS require, TypeScript types |

---

## 10. Security

- **No SQL Injection**: All user values use parameterized queries (`$1`, `$2`)
- **Safe Channels**: Pub/sub topics mapped through SHA-256 hash → `pgsnap_pub_<hash>`
- **No Credential Logging**: Connection strings, passwords, payloads never logged
- **Input Validation**: Keys validated (non-empty, ≤255 chars), topics validated

---

## 11. File Structure

```
src/
├── index.ts
├── client/
│   └── PGSnap.ts
├── cache/
│   ├── getCache.ts
│   ├── setCache.ts
│   ├── deleteCache.ts
│   ├── clearCache.ts
│   └── clearExpiredCache.ts
├── pubsub/
│   ├── publish.ts
│   ├── subscribe.ts
│   ├── listener.ts
│   └── channel.ts
├── queue/
│   ├── Queue.ts
│   ├── QueueWorker.ts
│   └── queueQueries.ts
├── database/
│   ├── pool.ts
│   ├── initialize.ts
│   └── listenerClient.ts
├── utils/
│   ├── serialize.ts
│   ├── deserialize.ts
│   ├── expiry.ts
│   └── validation.ts
└── types/
    └── index.ts
```

---

## 12. Implementation Phases

1. **Foundation**: Types, utils, database pool, initialization
2. **Cache**: All cache operations + background cleanup
3. **Pub/Sub**: Listener connection, channel mapping, publish/subscribe, reconnection
4. **Queue**: Queue table, worker, job claiming, retries, crash recovery, notifications
5. **Integration**: Main PGSnap client, close(), dual module build
6. **Testing**: Integration tests, ESM/CJS verification
7. **Documentation**: README, API reference

---

## 13. Assumptions & Constraints

- PostgreSQL 14+ (for `pg_notify` and `FOR UPDATE SKIP LOCKED`)
- Single PostgreSQL instance (no clustering logic)
- Application handles idempotency for queue jobs
- Pub/Sub is non-durable by design (use Queue for durability)
- Maximum 255 char keys (VARCHAR limit)
- No horizontal scaling coordination beyond PostgreSQL locking

---

## 14. Approval

**Design Approved:** ✅  
**Next Step:** Invoke `writing-plans` skill to create implementation plan