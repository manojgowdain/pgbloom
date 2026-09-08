# pgbloom

PGBloom is a PostgreSQL-first infrastructure toolkit for Node.js and TypeScript. It combines cache, Pub/Sub, queues, distributed locks, leader election, scheduling, rate limiting, events, atomic counters, CRUD models, authentication, OTP, Bloom filters, and local storage without requiring Redis or a separate queue service.

## Why PGBloom?

PostgreSQL is often already the durable system of record. PGBloom keeps coordination and application infrastructure close to that database: queue claims and counters are atomic, events and Pub/Sub use PostgreSQL primitives, and cache data remains queryable and operationally simple.

## Features

- PostgreSQL-backed cache with TTL and optional Bloom-filter lookup optimization
- LISTEN/NOTIFY Pub/Sub and persistent events with history and replay
- Priority queues with visibility timeouts, retries, and concurrent workers
- TTL locks, lock extension, and automatic leader-election heartbeats
- One-time and recurring scheduled jobs
- Fixed-window, sliding-window, and token-bucket rate limiting
- Atomic counters with strong, local, and eventual reads
- Schema-driven CRUD models with filters, sorting, pagination, updates, and deletes
- Argon2id passwords, HS256 access/refresh JWTs, sessions, and OTP workflows
- Persistent `ssdiskdb` storage plus an in-memory TTL/LRU cache layer
- Runtime-independent Bloom filters, serialization, and validation utilities
- ESM, CommonJS, npm, JSR, server, and browser-safe entrypoints

## Architecture

```text
Application
    |
    v
PGBloom client
    |-- cache / models / auth / counters
    |-- queues / locks / scheduler / rate limits
    |-- Pub/Sub / events
    v
PostgreSQL (source of truth)

Optional local path: MemoryCache -> SSDiskStore -> local disk
Browser path: Browser app -> HTTP/RPC -> server PGBloom -> PostgreSQL
```

## Installation

### Recommended: JSR

Use JSR for Deno, Bun, and JSR-oriented TypeScript projects:

```bash
# Deno
deno add jsr:@manojgowdain/pgbloom

# Bun
bun add jsr:@manojgowdain/pgbloom
```

```ts
import { createPgbloom } from "jsr:@manojgowdain/pgbloom";
```

### npm

Use npm for standard Node.js applications:

```bash
npm install pgbloom
```

The package requires Node.js 18 or newer and PostgreSQL. Git installs build through the `prepare` script:

```bash
npm install git+https://github.com/manojgowdain/pgsnap.git
```

JSR consumers must use a Node-compatible runtime. Pure Deno without Node compatibility is not supported because PostgreSQL and local-storage dependencies use Node APIs. For npm-oriented workflows, install `pgbloom` from npm instead.

## Quick start

```ts
import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!, {
  bloomFilter: true,
  lock: { defaultTtl: 30_000 },
});

await client.setCache("user:42", { name: "Ada" }, 60_000);
const user = await client.getCache<{ name: string }>("user:42");

await client.enqueue("emails", { to: "ada@example.com" });
await client.increment("page_views");

await client.close();
```

`createPgbloom()` validates the PostgreSQL URL, tests the connection, initializes package tables, and returns the high-level client. The complete client contract is documented in [docs/API.md](docs/API.md).

## Core API overview

| Area | Client methods |
| --- | --- |
| Cache | `setCache`, `getCache`, `deleteCache`, `clearCache`, `clearExpiredCache` |
| Pub/Sub | `publish`, `subscribe` |
| Queue | `enqueue`, `dequeue`, `completeJob`, `failJob`, `getQueueStats`, `cleanupJobs` |
| Locks | `tryLock`, `lock`, `unlock`, leadership methods |
| Scheduler | `schedule`, `scheduleRecurring`, `cancelSchedule`, `getSchedule`, `listSchedules` |
| Rate limiting | `rateLimit`, `rateLimitTokenBucket` |
| Events | `emit`, `listen`, `getEventHistory`, `replayEvents` |
| Counters | `increment`, `decrement`, `add`, `subtract`, `getCounter`, `setCounter`, `removeCounter` |
| CRUD | `model()` returning a schema-driven `Model` |
| Authentication | `auth()` returning `Auth` |
| Bloom | `bloom()` returning a `BloomFilter` |

## CRUD models

```ts
const users = client.model("app_users", {
  email: { type: "string", required: true, unique: true },
  active: { type: "boolean", default: true },
});

await users.createTable();
await users.create({ email: "ada@example.com" });
const active = await users.find({ active: true }, { limit: 20 });
```

Models provide create, bulk insert, find, find-one, find-by-id, existence, count, distinct, update, delete, table creation, and index synchronization. Filters support equality and `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, and `$regex`; updates support `$set`, `$inc`, `$unset`, `$push`, and `$pull`.

## Authentication and authorization

```ts
const auth = client.auth({ jwtSecret: process.env.JWT_SECRET });
const result = await auth.signup({ email, password, name: "Ada" });
const currentUser = await auth.me(result.accessToken);
```

Authentication includes Argon2id password hashing, HS256 access and refresh tokens, database-backed refresh sessions, logout/revocation, password reset, email verification, passwordless login OTPs, and cleanup. It does **not** ship Express/Fastify middleware, roles, permissions, or authorization guards. Add authorization in the application route layer after verifying the token. See [docs/API.md](docs/API.md#authentication-and-otp).

## Locks, queues, cache, and storage

Locks use PostgreSQL rows with TTL ownership checks; lock acquisition retries with exponential backoff when using the blocking API. Queue claims use `FOR UPDATE SKIP LOCKED`, visibility timeouts, priorities, and retry counts. Cache values are serialized with PostgreSQL as the source of truth; its optional Bloom filter only avoids reads for definitely absent keys.

For a persistent local key-value layer, use `createLocalStore()` and optionally wrap it with `MemoryCache` for TTL and LRU behavior. These are separate from the PostgreSQL cache and are server-only abstractions.

## Browser and React

Browser code may import only the dependency-free entrypoint:

```ts
import { BloomFilter, serialize, deserialize, validateKey } from "pgbloom/browser";
```

Browser applications must call a backend over HTTP/RPC for PostgreSQL-backed features. PGBloom does not export React providers, hooks, components, stores, or authentication middleware. The React project in `docs-react/` is the documentation site. Its setup and deployment instructions are in [docs-react/README.md](docs-react/README.md).

## Runtime support

- Node.js 18+: full API through `pgbloom` or `pgbloom/server`
- Bun: full API when Node-compatible dependencies are available
- Deno: server API with Node compatibility and npm modules; JSR package is `@manojgowdain/pgbloom`
- Browser and edge runtimes: `pgbloom/browser` only
- CommonJS and ESM: both are published for the npm package

## Errors and security

Current errors include `PGBloomError`, `PGBloomDatabaseError`, `PGBloomValidationError`, `PGBloomAuthError`, `PGBloomOTPError`, `PGBloomConfigError`, `BloomFilterError`, `BloomFilterConfigError`, `CacheKeyNotFoundError`, and legacy `PGSnap*` aliases. Invalid keys and connection strings are rejected before database work.

Keep database credentials and JWT secrets server-side, use TLS and least-privilege database roles, never treat a Bloom-filter positive as proof of existence, and implement authorization around protected routes. OTP delivery is not integrated with an email/SMS provider; outside production the generated code is logged for development.

## Documentation

- [Complete API reference](docs/API.md)
- [React documentation site setup](docs-react/README.md)
- [Interactive React documentation source](docs-react/src/components/Docs.tsx)

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## PostgreSQL testing

The canonical integration workflow uses the official PostgreSQL 16 Docker image. The Compose health check waits for `pg_isready`; the runner then builds PGBloom, runs unit tests, runs direct PostgreSQL integration tests, exercises persistence across a PostgreSQL stop/start, and removes the container, volume, and network even when a test fails.

Prerequisites are Docker Desktop or Docker Engine with Compose, Node.js 18+, and npm:

```bash
npm run test:docker
```

Useful focused commands:

```bash
npm test                         # unit tests; database suites skip without DATABASE_URL
npm run test:integration         # direct PostgreSQL suite; requires DATABASE_URL
npm run test:persistence         # stop/start persistence smoke test; requires Docker and DATABASE_URL
npm run test:integration:legacy  # older HTTP/multi-server harness
npm run test:coverage            # V8 statement/branch/function/line report
```

The Docker test database is available at `postgresql://pgbloom:pgbloom@127.0.0.1:55432/pgbloom_test` while Compose is running. Override `DATABASE_URL` or `PGBLOOM_TEST_PORT` when needed. The direct suite isolates data with run-specific table names and keys and covers cache, queue retries, counters, CRUD, transactions, authentication, local storage, Bloom filters, locks, Pub/Sub, events, rate limiting, and concurrent operations.

CI runs the same `npm run test:docker` workflow on Node.js and runs coverage plus the package build. The repository currently validates PostgreSQL 16; no broader PostgreSQL compatibility claim is made until additional versions are exercised.

For the documentation site:

```bash
cd docs-react
npm install
npm run dev
```

## License

MIT
