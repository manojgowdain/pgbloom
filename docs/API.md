# PGBloom API Reference

This reference is derived from the TypeScript source and package entrypoints. The package is a server-side PostgreSQL toolkit; the React project in `docs-react/` is the documentation website, not a React integration package.

For a crawlable documentation graph, start at [AI Agent Documentation](https://pgbloom.iotkit.in/aiagent/). It links the runtime, feature, API, testing, deployment, and troubleshooting documents.

## Entry points

```ts
import { createPgbloom,
  BloomFilter,
  createModel,
  hashPassword,
} from "pgbloom";

import { BloomFilter, serialize, deserialize, validateKey } from "pgbloom/browser";
import createPgbloom from "pgbloom/server";
```

- `pgbloom` exposes the default `createPgbloom` factory and the complete public API.
- `pgbloom/server` exposes the PostgreSQL-backed API and the default factory. Use it only in Node.js, Bun, or Deno with Node compatibility.
- `pgbloom/browser` exposes only runtime-independent Bloom, validation, and serialization utilities. It does not expose a database client.

## `createPgbloom()`

Creates a PostgreSQL connection pool, verifies the connection, creates the package tables if needed, and returns a client containing the high-level APIs.

```ts
const client = await createPgbloom(process.env.DATABASE_URL!, {
  maxConnections: 20,
  bloomFilter: true,
});

try {
  await client.setCache("user:42", { name: "Ada" }, 60_000);
} finally {
  await client.close();
}
```

The connection string must begin with `postgres://` or `postgresql://`. The client initializes tables named `pgsnap_cache`, `pgsnap_queue`, `pgbloom_locks`, `pgbloom_schedules`, `pgbloom_rate_limits`, `pgbloom_events`, `pgbloom_counters`, `pgbloom_users`, `pgbloom_sessions`, and `pgbloom_otp_codes`.

Calling a client method after `close()` throws an `Error`. `tryLock`, `lock`, `unlock`, leadership methods, and other optional subsystems throw when their required client option was not enabled.

### `PgbloomOptions`

| Option | Type | Default | Notes |
| --- | --- | --- | --- |
| `cleanupInterval` | `number \| false` | `300000` | Expired cache cleanup interval. `false` disables it. |
| `bloomFilter` | `boolean` | `false` | Enables the cache lookup Bloom filter. |
| `bloom.expectedItems` | `number` | `10000` | Filter sizing estimate. |
| `bloom.falsePositiveRate` | `number` | `0.01` | Must be between 0 and 1. |
| `bloom.rebuildInterval` | `number \| false` | `900000` | Rebuilds cache keys; `false` disables rebuilding. |
| `maxConnections` | `number` | `10` | PostgreSQL pool maximum. |
| `idleTimeoutMillis` | `number` | `30000` | Pool idle connection timeout. |
| `connectionTimeoutMillis` | `number` | `2000` | Pool connection acquisition timeout. |
| `queue.visibilityTimeout` | `number` | `30000` | Default queue job visibility timeout. |
| `queue.maxAttempts` | `number` | `3` | Default queue retry limit. |
| `lock.defaultTtl` | `number` | `30000` | Default lock lifetime. |
| `scheduler.workerId` | `string` | random UUID | Worker identifier used for claims. |
| `scheduler.pollingInterval` | `number` | `1000` | Declared scheduler option; workers should use their own polling loop. |
| `rateLimit.defaultAlgorithm` | algorithm | `fixed_window` | Configuration metadata for rate-limit consumers. |
| `events.maxListenersPerType` | `number` | `100` | Declared event listener limit. |
| `counter.defaultConsistency` | consistency | `strong` | Declared default counter consistency. |
| `model.autoCreateTables` | `boolean` | `false` | Model configuration metadata. |
| `model.cache` | `boolean` | `false` | Model configuration metadata. |
| `auth.enabled` | `boolean` | `false` | Configuration metadata; call `client.auth()` to create auth. |
| `auth.accessTokenExpiry` | `string` | `15m` | JWT lifetime, for example `15m` or `1h`. |
| `auth.refreshTokenExpiry` | `string` | `30d` | Refresh JWT lifetime. |
| `auth.jwtSecret` | `string` | environment | Prefer `JWT_SECRET` or `PGBLOOM_JWT_SECRET`. |
| `auth.passwordHashAlgorithm` | `argon2id \| bcrypt` | `argon2id` | Current password implementation uses Argon2id. |
| `auth.argon2Options` | object | see below | `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`. |

## Client APIs

### Cache

```ts
await client.setCache<T>(key, value, expiry?); // returns value
await client.getCache<T>(key);                  // T | null
await client.deleteCache(key);
await client.clearCache();
await client.clearExpiredCache();               // deleted row count
```

`expiry` is milliseconds from now or an absolute `Date`. The default expiry is one hour. Keys must be non-empty strings of at most 255 characters. Values are serialized before storage, and a stored `null` is distinct from a missing key. PostgreSQL is the source of truth. The optional Bloom filter can skip database reads only when a key is definitely absent; false positives still query PostgreSQL.

### Pub/Sub

```ts
const unsubscribe = await client.subscribe("notifications", async (channel, payload) => {
  console.log(channel, payload);
});
await client.publish("notifications", { kind: "welcome" });
await unsubscribe();
```

Pub/Sub uses PostgreSQL `LISTEN`/`NOTIFY` and holds one listening connection per client state. JSON payloads are parsed; non-JSON payloads are delivered as strings. Handler failures are intentionally ignored by the listener. Always call the returned unsubscribe function and `client.close()`.

### Queue

```ts
const job = await client.enqueue("emails", { to: "ada@example.com" }, {
  priority: 10,
  maxAttempts: 3,
  visibilityTimeout: 30_000,
});

const next = await client.dequeue<typeof job.payload>("emails");
if (next) {
  try {
    await sendEmail(next.payload);
    await client.completeJob(next.id);
  } catch (error) {
    await client.failJob(next.id, String(error));
  }
}
```

`dequeue` atomically claims the highest-priority pending job using `FOR UPDATE SKIP LOCKED`. A claimed job is hidden for its visibility timeout. `failJob` requeues while `attempts < maxAttempts`; otherwise it marks the job failed. `getQueueStats` returns `pending`, `processing`, `completed`, and `failed`. `cleanupJobs` removes completed or failed jobs older than 24 hours by default.

### Locks and leadership

Enable locks when creating the client:

```ts
const client = await createPgbloom(url, { lock: { defaultTtl: 30_000 } });
const state = createLockState(client.pool);
const result = await tryLock(state, "resource:42");
```

The client convenience methods return only a boolean for `tryLock` and `lock`, so use the standalone lock API when the holder ID is needed:

```ts
const state = createLockState(client.pool);
const acquired = await tryLock(state, "resource:42", { ttl: 10_000 });
if (acquired.acquired) {
  try {
    // critical section
  } finally {
    await unlock(state, "resource:42", acquired.holderId!);
  }
}
```

`lock` retries with exponential backoff until its timeout (5 seconds by default). `unlock` verifies ownership. `extendLock` and `getLockInfo` expose the standalone ownership and expiry operations. Leadership is implemented as a lock on `leader:<resource>` and renews automatically while held; `releaseLeadership` stops renewal.

### Scheduler

The standalone scheduler API accepts an options object:

```ts
const state = createSchedulerState(client.pool, null, "worker-1");
const { job } = await schedule(state, {
  name: "send-report",
  payload: { userId: 42 },
  runAt: new Date(Date.now() + 60_000),
});

const due = await getAndClaimDueJobs(state, 10);
await completeScheduledJob(state, due[0].id);
```

Use `scheduleRecurring` with an interval string such as `5s`, `10m`, `1h`, or `1d`. `claimScheduledJob`, `completeScheduledJob`, and `failScheduledJob` support worker loops. Due-job claiming uses `FOR UPDATE SKIP LOCKED`. The client convenience methods are `schedule`, `scheduleRecurring`, `cancelSchedule`, `getSchedule`, and `listSchedules`.

### Rate limiting

```ts
const result = await client.rateLimit("user:42", 100, 60_000);
const burst = await client.rateLimitTokenBucket("api:42", 20, 2);
```

The result contains `allowed`, `limit`, `remaining`, and `resetAt`. Standalone APIs also expose `checkRateLimit`, `checkSlidingRateLimit`, `checkTokenBucketRateLimit`, and `cleanup`. Key helpers are `generateKey`, `generateUserKey`, and `generateIpKey`. Operations are backed by PostgreSQL rows and are intended for concurrent processes.

### Events

```ts
const unsubscribe = await client.listen("user.created", (type, payload, metadata) => {
  console.log(type, payload, metadata);
});
const eventId = await client.emit("user.created", { userId: 42 }, { source: "api" });
const history = await client.getEventHistory({ type: "user.created", limit: 50 });
await client.replayEvents(new Date("2025-01-01"), undefined, "user.created", event => {
  console.log(event);
});
await unsubscribe();
```

Events are persisted in PostgreSQL and delivered through `LISTEN`/`NOTIFY`. History supports type/time filters, limits, and cursors. Replay invokes the supplied handler and reports `{ replayed }`.

### Counters

```ts
await client.increment("page_views");
await client.add("bytes", 512);
const current = await client.getCounter("page_views", { consistency: "strong" });
await client.setCounter("quota", 1000);
await client.removeCounter("quota");
```

`strong` reads PostgreSQL, `local` reads the optional local store and returns zero on a miss, and `eventual` reads local storage before falling back to PostgreSQL. Writes use atomic database updates. Standalone exports additionally include `listCounters` and `clearAllCounters`.

## CRUD models

Create a model with an explicit schema. Field names are camelCase in TypeScript and are mapped to snake_case columns in PostgreSQL.

```ts
const users = client.model("app_users", {
  email: { type: "string", required: true, unique: true, index: true },
  age: { type: "number", default: 0 },
  active: { type: "boolean", default: true },
}, { timestamps: true });

await users.createTable();
const user = await users.create({ email: "ada@example.com" });
const rows = await users.find({ active: true }, { sort: { age: -1 }, limit: 20 });
await users.updateOne({ email: "ada@example.com" }, { $inc: { age: 1 } });
```

`Model` exposes `create`, `insertMany`, `find`, `findOne`, `findById`, `exists`, `countDocuments`, `distinct`, `updateOne`, `updateMany`, `findOneAndUpdate`, `findByIdAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `findByIdAndDelete`, `createTable`, `syncIndexes`, `getTableName`, and `getSchema`.

Supported filter operators are `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, and `$regex`. Find options support `select`, `sort`, `limit`, and `skip`. Update operators are `$set`, `$inc`, `$unset`, `$push`, and `$pull`. Creates apply schema defaults and, when timestamps are enabled, set `createdAt` and `updatedAt`. Validation failures throw `PGBloomValidationError`; required fields are enforced on create, not partial updates.

Schema field types are `string`, `number`, `boolean`, `date`, `json`, and `buffer`. `ModelOptions` are `cache`, `cacheTtl` (default 60 seconds), `timestamps` (default true), and `autoCreateTable` (default false). Table and column identifiers come from application code and should not be user-controlled.

## Authentication and OTP

```ts
const auth = client.auth({
  jwtSecret: process.env.JWT_SECRET,
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d",
});

const created = await auth.signup({ email, password, name: "Ada" });
const loggedIn = await auth.login({ email, password });
const user = await auth.me(loggedIn.accessToken);
const refreshed = await auth.refreshToken(loggedIn.refreshToken);
await auth.logout(refreshed.refreshToken);
```

`Auth` provides `signup`, `login`, `logout`, `refreshToken`, `verifyToken`, `me`, `forgotPassword`, `resetPassword`, `sendVerificationOTP`, `verifyEmail`, `sendLoginOTP`, `verifyLoginOTP`, and `cleanup`. `auth.users` exposes the underlying user model, which deliberately disables caching because it contains password hashes.

Passwords use Argon2id through `@node-rs/argon2`. Access and refresh tokens are HS256 JWTs. Refresh tokens are hashed before being stored in `pgbloom_sessions`; logout revokes the matching session. `verifyToken` returns `null` for expired or invalid-signature tokens. Authentication does not provide Express/Fastify middleware, roles, permissions, or authorization guards; applications must implement those route-layer concerns.

OTP records are hashed, expire after 5 minutes, allow 5 attempts, and have a 60-second resend cooldown by default. Supported purposes are `signup`, `login`, `forgot-password`, `email-verification`, and `phone-verification`. `sendOTP` currently does not integrate with an email/SMS provider: outside production it logs the code for development, while production requires an application delivery integration.

## Storage

`LocalStore` is a separate asynchronous key-value abstraction with `get`, `set`, `delete`, `has`, `clear`, and `close`.

```ts
const disk = await createLocalStore({ path: "./.pgbloom" });
const memory = new MemoryCache(disk, { maxEntries: 1000, ttl: 60_000 });
await memory.set("session:42", { active: true });
const value = await memory.get("session:42");
await memory.close();
```

`SSDiskStore` persists JSON values through `ssdiskdb` and connects lazily. `MemoryCache` adds an in-memory L1 cache with TTL and LRU eviction over a backing `LocalStore`. Storage is server-side and should not be imported into browser bundles.

## Bloom filters and utilities

```ts
const bloom = new BloomFilter({ expectedItems: 10_000, falsePositiveRate: 0.01 });
bloom.add("user:42");
if (bloom.has("user:42")) {
  // true means possibly present; false means definitely absent
}
const snapshot = bloom.toJSON();
const restored = BloomFilter.fromJSON(snapshot);
```

The counting Bloom filter supports `add`, `has`, `clear`, `size`, `toJSON`, and `BloomFilter.fromJSON`. It accepts strings, numbers, booleans, bigints, and `null`. It never returns false negatives but can return false positives. `encodeValue`, `fnv1a`, `xorshift32`, and `hashPair` are non-cryptographic hash helpers and must not be used for security decisions.

Browser-safe utilities also include `serialize`, `deserialize`, `validateKey`, and `MAX_KEY_LENGTH`. Serialization is JSON-based and can throw the package serialization/deserialization errors for invalid values.

## Errors and validation

The main error hierarchy is `PGBloomError`, `PGBloomDatabaseError`, `PGBloomValidationError`, `PGBloomAuthError`, `PGBloomOTPError`, and `PGBloomConfigError`. `BloomFilterError` and `BloomFilterConfigError` cover Bloom configuration. `CacheKeyNotFoundError` is used by the low-level cache query API; high-level `getCache` returns `null` instead.

Legacy aliases remain exported: `PGSnapError`, `PGSnapConnectionError`, `PGSnapKeyError`, `PGSnapExpiryError`, `PGSnapSerializationError`, and `PGSnapDeserializationError`. Use `instanceof` with the current PGBloom names in new code. Validate connection strings before startup and never expose database or JWT secrets to browser code.

## Runtime support

| Environment | Import | Support |
| --- | --- | --- |
| Node.js 18+ | `pgbloom` or `pgbloom/server` | Full server API |
| Bun | `pgbloom` or `pgbloom/server` | Full API when Node dependencies work |
| Deno with Node compatibility | `pgbloom` or JSR package | PostgreSQL API with Node compatibility and npm modules |
| Browser/edge | `pgbloom/browser` | Bloom, validation, serialization only |
| Pure Deno without Node compatibility | any server entry | Unsupported |
| React | `pgbloom/browser` in client code | No React provider/hooks are shipped; call a backend over HTTP/RPC |

## Performance and security notes

PostgreSQL remains the source of truth. Queue and scheduler claims use row locking with `SKIP LOCKED`; counters use atomic updates; Pub/Sub and events use `LISTEN`/`NOTIFY`. Bloom filters are optimizations, not authorization or correctness mechanisms. Tune pool size, queue visibility, token lifetimes, Argon2 cost, cache TTLs, and rate limits for the deployment rather than copying defaults blindly.

Use TLS and least-privilege database credentials in production, keep `JWT_SECRET` outside source control, hash passwords and refresh tokens as provided, validate user-controlled model identifiers before constructing models, and add application-level authorization around every protected route.

## Development and publishing

```bash
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

The package publishes ESM and CommonJS builds from `src/`, plus the JSR entrypoint in `mod.ts`. The interactive React documentation site is in `docs-react/`; run its `npm run build` from that directory. See this file for the API reference and `docs-react/README.md` for site development.
