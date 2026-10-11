export interface AIAgentDoc {
  slug: string
  title: string
  category: 'overview' | 'setup' | 'guide' | 'architecture' | 'configuration' | 'api' | 'feature' | 'operations' | 'examples' | 'tool'
  description: string
  overview: string
  whyUse: string
  architecture: string
  apiSignature: string
  parametersAndReturns: string
  errorsAndFailure: string
  whenNotToUse: string
  exampleCode: string
  relatedSlugs: string[]
}

export const aiAgentDocs: Record<string, AIAgentDoc> = {
  overview: {
    slug: 'overview',
    title: 'Overview',
    category: 'overview',
    description: 'Project purpose, runtime model, and actual feature inventory.',
    overview: 'PGBloom is a PostgreSQL-first TypeScript infrastructure toolkit for cache, messaging, jobs, coordination, models, authentication, and local utilities.',
    whyUse: 'Use it when PostgreSQL is already your durable system of record and you want coordination primitives to share that operational boundary without provisioning separate Redis or RabbitMQ instances.',
    architecture: 'PostgreSQL serves as the durable source of truth. Client state connects through a pooled pg connection. Local state uses MemoryCache and SSDiskStore on disk; browser code calls the server over HTTP/RPC.',
    apiSignature: 'createPgbloom(connectionString: string, options?: PgbloomOptions): Promise<PgbloomClient>',
    parametersAndReturns: 'Accepts PostgreSQL connection URI string and optional PgbloomOptions. Returns a high-level PGBloomClient instance with full subsystem methods.',
    errorsAndFailure: 'Throws PGBloomValidationError if connection string is invalid; throws PGBloomDatabaseError if PostgreSQL connection fails.',
    whenNotToUse: 'Do not use as a browser database client or when sub-millisecond in-memory cache latency with millions of keys is an absolute requirement.',
    exampleCode: `import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!);
await client.setCache("status", "operational", 60_000);
const status = await client.getCache("status");
await client.close();`,
    relatedSlugs: ['architecture', 'installation', 'quickstart', 'api'],
  },

  installation: {
    slug: 'installation',
    title: 'Installation',
    category: 'setup',
    description: 'Package installation, PostgreSQL requirements, and runtime support.',
    overview: 'Install pgbloom from npm or @manojgowdain/pgbloom from JSR in a Node-compatible runtime with PostgreSQL 12+.',
    whyUse: 'Use npm for standard Node.js applications; use JSR for Deno or Bun TypeScript projects that maintain Node compatibility.',
    architecture: 'Publishes CommonJS and ESM builds along with isolated subpath exports for server and browser-safe modules.',
    apiSignature: 'npm install pgbloom\ndeno add jsr:@manojgowdain/pgbloom\nbun add jsr:@manojgowdain/pgbloom',
    parametersAndReturns: 'Requires Node.js 18 or newer and PostgreSQL 12+ (PostgreSQL 16 recommended).',
    errorsAndFailure: 'Pure Deno without Node polyfills is unsupported due to database socket requirements.',
    whenNotToUse: 'Do not install server-only exports into pure frontend browser bundlers.',
    exampleCode: `# Install via npm
npm install pgbloom

# Initialize in TypeScript
import { createPgbloom } from "pgbloom";
const client = await createPgbloom(process.env.DATABASE_URL!);`,
    relatedSlugs: ['overview', 'quickstart', 'configuration', 'deployment'],
  },

  quickstart: {
    slug: 'quickstart',
    title: 'Quickstart',
    category: 'guide',
    description: 'Minimal server setup and first operations.',
    overview: 'A complete quickstart demonstrating client connection, caching, job queueing, and graceful shutdown.',
    whyUse: 'Provides the smallest complete server-side integration pattern for validating connectivity.',
    architecture: 'Connects to PostgreSQL, checks/creates tables idempotently, runs queries, and shuts down pool timers.',
    apiSignature: 'createPgbloom(url, options) -> Promise<PgbloomClient>',
    parametersAndReturns: 'Returns PgbloomClient instance. Must call client.close() during application shutdown.',
    errorsAndFailure: 'Always place operations in try/finally blocks to ensure client.close() releases database connections.',
    whenNotToUse: 'Do not create new PGBloom clients per HTTP request; maintain a singleton client throughout server lifecycle.',
    exampleCode: `import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!, {
  bloomFilter: true
});

try {
  await client.setCache("user:42", { name: "Ada" }, 60_000);
  const user = await client.getCache<{ name: string }>("user:42");
  await client.enqueue("emails", { to: "ada@example.com" });
  await client.increment("page_views");
} finally {
  await client.close();
}`,
    relatedSlugs: ['installation', 'configuration', 'cache', 'queue'],
  },

  architecture: {
    slug: 'architecture',
    title: 'Architecture',
    category: 'architecture',
    description: 'Client, PostgreSQL, local storage, browser boundaries, and lifecycle.',
    overview: 'PGBloom organizes applications around PostgreSQL as the primary durable coordination bus without external queue or cache daemons.',
    whyUse: 'Keeps architecture simple, reliable, auditable, and cost-effective across development and production.',
    architecture: 'Application calls PGBloom client -> PostgreSQL connection pool. Optional local disk layer uses MemoryCache -> SSDiskStore -> disk. Browser uses pgbloom/browser.',
    apiSignature: 'Internal architecture contract: Pool management, advisory locks, LISTEN/NOTIFY, row claims.',
    parametersAndReturns: 'Client maintains connection pools, table schemas, and event listeners.',
    errorsAndFailure: 'Connection pool starvation occurs if connections are held open; configure maxConnections properly.',
    whenNotToUse: 'Do not bypass connection pooling when horizontal scaling creates hundreds of worker containers.',
    exampleCode: `// Architecture diagram representation
// Application Process
//    |
// PGBloom Client (Pool: max 10)
//    |---> pgsnap_cache (PostgreSQL)
//    |---> pgsnap_jobs  (PostgreSQL: SKIP LOCKED)
//    |---> pgsnap_locks (PostgreSQL: TTL rows)
//    +---> LISTEN/NOTIFY (PostgreSQL channels)`,
    relatedSlugs: ['overview', 'configuration', 'storage', 'browser'],
  },

  configuration: {
    slug: 'configuration',
    title: 'Configuration',
    category: 'configuration',
    description: 'PgbloomOptions and subsystem defaults.',
    overview: 'Fine-tune PostgreSQL connection pools, cache Bloom parameters, lock TTLs, scheduler identity, and auth secrets.',
    whyUse: 'Customize operational characteristics for high-load production environments or local testing.',
    architecture: 'Options are evaluated at client creation time and distributed to individual subsystem constructors.',
    apiSignature: 'interface PgbloomOptions { maxConnections?: number; idleTimeoutMillis?: number; lock?: { defaultTtl?: number }; bloomFilter?: boolean; ... }',
    parametersAndReturns: 'Configures client behavior across caching, queues, locks, and authentication.',
    errorsAndFailure: 'Invalid configuration values throw PGBloomConfigError.',
    whenNotToUse: 'Do not hardcode secrets or database URLs; always inject from environment variables.',
    exampleCode: `const client = await createPgbloom(process.env.DATABASE_URL!, {
  maxConnections: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  bloomFilter: true,
  lock: { defaultTtl: 45_000 }
});`,
    relatedSlugs: ['overview', 'installation', 'deployment'],
  },

  api: {
    slug: 'api',
    title: 'API Inventory',
    category: 'api',
    description: 'Public package exports and high-level client methods.',
    overview: 'Complete reference for all exported methods on PgbloomClient and standalone modules.',
    whyUse: 'Consult for exact method signatures, parameters, and return types.',
    architecture: 'Client aggregates methods from cache, pubsub, queue, lock, scheduler, rate-limit, event, counter, model, and auth subsystems.',
    apiSignature: 'PGBloomClient exposes setCache, getCache, enqueue, dequeue, publish, subscribe, tryLock, unlock, rateLimit, emit, increment, model, auth, bloom.',
    parametersAndReturns: 'Full TypeScript type definitions are bundled with the npm and JSR packages.',
    errorsAndFailure: 'All methods throw typed subclasses of PGBloomError on failure.',
    whenNotToUse: 'Do not invoke client methods after calling client.close().',
    exampleCode: `import { createPgbloom } from "pgbloom";
const client = await createPgbloom(process.env.DATABASE_URL!);
// High level client contains all subsystem methods
await client.setCache("k", "v");
await client.close();`,
    relatedSlugs: ['overview', 'cache', 'queue', 'locks'],
  },

  cache: {
    slug: 'cache',
    title: 'Cache Subsystem',
    category: 'feature',
    description: 'TTL cache operations and optional Bloom lookup optimization.',
    overview: 'Serialized PostgreSQL cache with TTL expiration and Bloom filter negative lookup acceleration.',
    whyUse: 'Store and retrieve shared, durable cache data in PostgreSQL with automatic TTL purging.',
    architecture: 'Values are serialized as JSON and stored with expiration timestamps. Optional in-memory Bloom filter skips negative reads.',
    apiSignature: 'setCache<T>(key, value, expiry?), getCache<T>(key), deleteCache(key), clearCache(), clearExpiredCache()',
    parametersAndReturns: 'Key: string (max 255 chars). Expiry: milliseconds from now or Date. Returns stored value or null on miss.',
    errorsAndFailure: 'Empty keys throw PGBloomValidationError. Expired items return null.',
    whenNotToUse: 'Do not use Bloom filter positive as proof that a key exists (false positives are possible).',
    exampleCode: `await client.setCache("user:42", { name: "Ada" }, 60_000);
const user = await client.getCache<{ name: string }>("user:42");
await client.deleteCache("user:42");`,
    relatedSlugs: ['bloom-filter', 'configuration', 'storage'],
  },

  pubsub: {
    slug: 'pubsub',
    title: 'Pub/Sub Messaging',
    category: 'feature',
    description: 'PostgreSQL LISTEN/NOTIFY channel messaging.',
    overview: 'Low-latency inter-process messaging using native PostgreSQL LISTEN and NOTIFY primitives.',
    whyUse: 'Broadcast events and notifications across multiple application instances without message brokers.',
    architecture: 'Uses dedicated listener connection in the background. Payload serialized as JSON.',
    apiSignature: 'publish(channel: string, payload: unknown): Promise<void>\nsubscribe(channel: string, handler: (channel, payload) => void): Promise<() => void>',
    parametersAndReturns: 'Channel: string. Handler receives channel and parsed payload. Returns async unsubscribe function.',
    errorsAndFailure: 'PostgreSQL NOTIFY payloads are limited to 8000 bytes. Larger payloads must send identifiers.',
    whenNotToUse: 'Do not use for durable queueing where offline delivery guarantees are required (use Queue instead).',
    exampleCode: `const unsubscribe = await client.subscribe("orders", (channel, payload) => {
  console.log("Order received:", payload);
});

await client.publish("orders", { id: "ord_100", amount: 49.99 });
await unsubscribe();`,
    relatedSlugs: ['events', 'queue', 'architecture'],
  },

  queue: {
    slug: 'queue',
    title: 'Priority Job Queue',
    category: 'feature',
    description: 'Priority jobs, visibility timeouts, retries, and claims.',
    overview: 'Persistent background job processing using row-level locks and FOR UPDATE SKIP LOCKED.',
    whyUse: 'Process retryable background jobs across multiple worker instances safely without BullMQ or RabbitMQ.',
    architecture: 'Jobs are claimed atomically by workers. Visibility timeouts prevent stuck jobs if workers crash.',
    apiSignature: 'enqueue<T>(queueName, payload, options?), dequeue<T>(queueName), completeJob(id), failJob(id, error), getQueueStats(queueName)',
    parametersAndReturns: 'Options: priority (number), maxAttempts (number), visibilityTimeout (ms). Returns QueueJob or null.',
    errorsAndFailure: 'Jobs that exceed maxAttempts are marked failed. Failed attempts trigger retries.',
    whenNotToUse: 'Do not use for ultra-high throughput streaming queues exceeding tens of thousands of messages per second.',
    exampleCode: `const job = await client.enqueue("emails", { to: "user@example.com" }, { priority: 1 });
const pending = await client.dequeue<{ to: string }>("emails");
if (pending) {
  try {
    await sendEmail(pending.payload.to);
    await client.completeJob(pending.id);
  } catch (err) {
    await client.failJob(pending.id, err.message);
  }
}`,
    relatedSlugs: ['locks', 'scheduler', 'events'],
  },

  locks: {
    slug: 'locks',
    title: 'Distributed Locks',
    category: 'feature',
    description: 'TTL distributed locks and leader election.',
    overview: 'Lease-based distributed locks with automatic TTL expiration and leader election in PostgreSQL.',
    whyUse: 'Coordinate concurrent microservice tasks, prevent race conditions, and elect singleton worker leaders.',
    architecture: 'Locks use PostgreSQL rows with owner identification and expiration checks. Leader election uses heartbeat renewals.',
    apiSignature: 'tryLock(key, ttl?), lock(key, ttl?, timeout?), unlock(key, holderId?), acquireLeadership(resource), releaseLeadership(resource)',
    parametersAndReturns: 'tryLock returns boolean. lock retries with exponential backoff until acquisition or timeout.',
    errorsAndFailure: 'Never hold a lock longer than its TTL without extending it.',
    whenNotToUse: 'Do not use as a substitute for ordinary database transactions.',
    exampleCode: `const acquired = await client.tryLock("sync_job", 30_000);
if (acquired) {
  try {
    await executeSync();
  } finally {
    await client.unlock("sync_job");
  }
}`,
    relatedSlugs: ['queue', 'scheduler', 'configuration'],
  },

  scheduler: {
    slug: 'scheduler',
    title: 'Job Scheduler',
    category: 'feature',
    description: 'Delayed and recurring jobs with worker claims.',
    overview: 'Persist delayed and recurring jobs in PostgreSQL and claim due work safely with row locking.',
    whyUse: 'Execute scheduled application tasks without operating separate cron daemons.',
    architecture: 'Stores schedule metadata and interval strings in PostgreSQL. Workers query and claim due jobs.',
    apiSignature: 'schedule(name, payload, delayMs), scheduleRecurring(name, payload, interval), cancelSchedule(id), listSchedules()',
    parametersAndReturns: 'Interval accepts strings like "5s", "10m", "1h", "1d". Returns schedule record.',
    errorsAndFailure: 'Does not start a background worker loop automatically; application must poll for due jobs.',
    whenNotToUse: 'Do not use for sub-second precision real-time scheduling.',
    exampleCode: `await client.schedule("reminder", { userId: 42 }, 15 * 60_000);
await client.scheduleRecurring("nightly_digest", {}, "1d");`,
    relatedSlugs: ['queue', 'locks'],
  },

  'rate-limit': {
    slug: 'rate-limit',
    title: 'Rate Limiting',
    category: 'feature',
    description: 'Fixed-window, sliding-window, and token-bucket limits.',
    overview: 'Distributed rate limiting supporting Fixed Window, Sliding Window, and Token Bucket algorithms on PostgreSQL.',
    whyUse: 'Protect APIs and shared resources across distributed application pods with shared counters.',
    architecture: 'Stores request timestamps and token counts in PostgreSQL tables with atomic upserts.',
    apiSignature: 'rateLimit(key, limit, windowMs), rateLimitTokenBucket(key, capacity, refillRate)',
    parametersAndReturns: 'Returns { allowed: boolean, limit: number, remaining: number, resetAt: number }.',
    errorsAndFailure: 'Does not block requests automatically; application routes must enforce the allowed property.',
    whenNotToUse: 'Do not rely on rate limiting alone for authorization or security protection.',
    exampleCode: `const res = await client.rateLimit("ip:192.168.1.1", 100, 60_000);
if (!res.allowed) {
  throw new Error("Rate limit exceeded");
}`,
    relatedSlugs: ['counters', 'configuration'],
  },

  events: {
    slug: 'events',
    title: 'Persistent Events',
    category: 'feature',
    description: 'Persistent events, notifications, history, and replay.',
    overview: 'Durable event log in PostgreSQL with real-time notification delivery via LISTEN/NOTIFY and replay capability.',
    whyUse: 'Record audit logs, domain events, and state mutations with queryable history and time-range replays.',
    architecture: 'Events are permanently written to tables while simultaneously broadcasting over LISTEN/NOTIFY.',
    apiSignature: 'emit(type, payload, metadata?), listen(type, handler), getEventHistory(options?), replayEvents(from, to, type, handler)',
    parametersAndReturns: 'History options support type filters, time bounds, limit, and cursor pagination.',
    errorsAndFailure: 'Replay executes sequentially; handle worker errors inside handler callbacks.',
    whenNotToUse: 'Do not use for transient, high-volume sensor telemetry where storage costs exceed value.',
    exampleCode: `await client.emit("user.signup", { id: "u_1", email: "ada@example.com" });
const history = await client.getEventHistory({ type: "user.signup", limit: 10 });`,
    relatedSlugs: ['pubsub', 'model'],
  },

  counters: {
    slug: 'counters',
    title: 'Atomic Counters',
    category: 'feature',
    description: 'Atomic counters and strong, local, or eventual reads.',
    overview: 'Distributed atomic numeric counters in PostgreSQL with strong, local, and eventual consistency options.',
    whyUse: 'Count metrics, page views, and inventory atomically without read-modify-write race conditions.',
    architecture: 'Updates use SQL ON CONFLICT DO UPDATE. Reads query PostgreSQL (strong) or local cache (local/eventual).',
    apiSignature: 'increment(key), decrement(key), add(key, amount), subtract(key, amount), getCounter(key, consistency?)',
    parametersAndReturns: 'Consistency options: "strong" (default), "local", or "eventual". Returns current number.',
    errorsAndFailure: 'Local misses return zero; eventual reads fall back to PostgreSQL on miss.',
    whenNotToUse: 'Do not use local or eventual consistency when absolute accuracy is required (e.g. financial balances).',
    exampleCode: `await client.increment("views:article_12");
await client.add("score:user_99", 50);
const score = await client.getCounter("score:user_99", "strong");`,
    relatedSlugs: ['rate-limit', 'storage'],
  },

  model: {
    slug: 'model',
    title: 'Model / CRUD',
    category: 'feature',
    description: 'Schema-driven PostgreSQL CRUD models.',
    overview: 'Type-safe schema-driven CRUD models with table generation, indexing, and MongoDB-style query filters.',
    whyUse: 'Build structured database tables without heavy ORM dependencies or raw SQL string concatenation.',
    architecture: 'Validates schemas in TypeScript, generates standard PostgreSQL tables and indexes, and runs parameterized SQL.',
    apiSignature: 'client.model(tableName, schema?, options?) -> Model',
    parametersAndReturns: 'Model exposes create, insertMany, find, findOne, findById, exists, countDocuments, updateOne, deleteOne, createTable, syncIndexes.',
    errorsAndFailure: 'Schema validation violations throw PGBloomValidationError.',
    whenNotToUse: 'Do not pass unsanitized user strings as table or column identifiers.',
    exampleCode: `const users = client.model("users", {
  email: { type: "string", required: true, unique: true },
  active: { type: "boolean", default: true }
});

await users.createTable();
await users.create({ email: "ada@example.com" });
const list = await users.find({ active: true }, { limit: 10 });`,
    relatedSlugs: ['auth', 'architecture'],
  },

  auth: {
    slug: 'auth',
    title: 'Authentication',
    category: 'feature',
    description: 'Passwords, JWTs, sessions, and OTP workflows.',
    overview: 'Full-stack authentication: Argon2id passwords, HS256 JWT access/refresh tokens, database sessions, and passwordless OTP.',
    whyUse: 'Implement authentication directly on PostgreSQL without external third-party identity providers.',
    architecture: 'Stores hashed credentials and refresh sessions in PostgreSQL. Access tokens are stateless JWTs.',
    apiSignature: 'client.auth(options?) -> Auth instance with signup, login, logout, refreshToken, verifyToken, me, OTP methods.',
    parametersAndReturns: 'Access token expires in 15 minutes by default; refresh session expires in 30 days. OTPs expire in 5 minutes.',
    errorsAndFailure: 'Invalid credentials throw PGBloomAuthError. Expired OTPs throw PGBloomOTPError.',
    whenNotToUse: 'Does not provide route middleware; enforce authorization in application route handlers.',
    exampleCode: `const auth = client.auth({ jwtSecret: process.env.JWT_SECRET! });
const result = await auth.signup({ email: "dev@example.com", password: "secure_password" });
const user = await auth.me(result.accessToken);`,
    relatedSlugs: ['model', 'deployment', 'troubleshooting'],
  },

  'bloom-filter': {
    slug: 'bloom-filter',
    title: 'Bloom Filter',
    category: 'feature',
    description: 'Runtime-independent counting Bloom filter and hash helpers.',
    overview: 'High-performance counting Bloom filter implemented in pure TypeScript with zero external dependencies.',
    whyUse: 'Perform fast probabilistic set membership checks to eliminate negative queries to database tables or disks.',
    architecture: 'Uses 4-bit counters, FNV-1a, and xorshift32 hashing. Supports serialization and JSON snapshots.',
    apiSignature: 'new BloomFilter(options), add(value), has(value), clear(), size, toJSON(), BloomFilter.fromJSON(snapshot)',
    parametersAndReturns: 'Options: expectedItems (number), falsePositiveRate (number between 0 and 1). Values: string, number, boolean, bigint, null.',
    errorsAndFailure: 'Invalid configurations throw BloomFilterConfigError.',
    whenNotToUse: 'Never use Bloom filter positive as proof of item existence or for security decisions (false positives are possible).',
    exampleCode: `import { BloomFilter } from "pgbloom/browser";

const filter = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
filter.add("user:42");
console.log(filter.has("user:42")); // true
console.log(filter.has("user:99")); // false (definitely absent)`,
    relatedSlugs: ['cache', 'browser'],
  },

  storage: {
    slug: 'storage',
    title: 'Local Storage',
    category: 'feature',
    description: 'SSDiskDB local persistence and in-memory LRU/TTL caching.',
    overview: 'Asynchronous server-local key-value storage backed by SSDiskDB paired with in-memory LRU/TTL caching.',
    whyUse: 'Persist server-local state or cache items on local disk without issuing network queries to PostgreSQL.',
    architecture: 'MemoryCache provides fast RAM access and evicts entries to disk via SSDiskStore.',
    apiSignature: 'createLocalStore(options?) -> LocalStore, new MemoryCache(store, options)',
    parametersAndReturns: 'LocalStore methods: get, set, delete, has, clear, close. Options specify data directory path.',
    errorsAndFailure: 'Server-only feature; cannot be imported or executed in browser bundles.',
    whenNotToUse: 'Do not use for shared state in multi-server horizontal deployments.',
    exampleCode: `import { createLocalStore, MemoryCache } from "pgbloom/server";

const disk = await createLocalStore({ path: "./.pgbloom" });
const cache = new MemoryCache(disk, { maxEntries: 1000, ttl: 60_000 });
await cache.set("key", { hello: "world" });
await cache.close();`,
    relatedSlugs: ['counters', 'architecture'],
  },

  browser: {
    slug: 'browser',
    title: 'Browser Entrypoint',
    category: 'feature',
    description: 'Browser-safe entrypoint and server boundary.',
    overview: 'Dependency-free browser-safe entrypoint exposing Bloom filters, serialization, and key validation.',
    whyUse: 'Import client-side utilities without pulling in PostgreSQL drivers, Node crypto, or filesystem modules.',
    architecture: 'Subpath export pgbloom/browser containing zero Node.js dependencies.',
    apiSignature: 'Exports BloomFilter, validateKey, MAX_KEY_LENGTH, serialize, deserialize, hashPair, fnv1a.',
    parametersAndReturns: 'Browser architecture: Browser app -> HTTP/RPC -> backend PGBloom -> PostgreSQL.',
    errorsAndFailure: 'Attempting to import database methods in browser code throws runtime bundler errors.',
    whenNotToUse: 'Cannot connect directly to PostgreSQL from the browser.',
    exampleCode: `import { BloomFilter, validateKey } from "pgbloom/browser";

validateKey("session_id");
const filter = new BloomFilter({ expectedItems: 50, falsePositiveRate: 0.05 });`,
    relatedSlugs: ['bloom-filter', 'architecture', 'installation'],
  },

  testing: {
    slug: 'testing',
    title: 'Testing Suite',
    category: 'operations',
    description: 'Unit, integration, package, persistence, and documentation checks.',
    overview: 'Comprehensive testing strategy including unit tests, Docker PostgreSQL integration, and persistence tests.',
    whyUse: 'Validate all infrastructure behaviors reliably in CI/CD and local development.',
    architecture: 'Vitest unit tests run without database; Docker runner spins up postgres:16 and tests direct integration.',
    apiSignature: 'npm test, npm run test:integration, npm run test:docker, npm run test:coverage',
    parametersAndReturns: 'Docker workflow builds package, runs unit suite, exercises direct integration, and tests restart persistence.',
    errorsAndFailure: 'Integration tests require DATABASE_URL or running Docker daemon.',
    whenNotToUse: 'Do not run test:docker without Docker Desktop or Docker Engine installed.',
    exampleCode: `# Run unit tests
npm test

# Run canonical Docker PostgreSQL test
npm run test:docker`,
    relatedSlugs: ['deployment', 'troubleshooting'],
  },

  deployment: {
    slug: 'deployment',
    title: 'Deployment Guide',
    category: 'operations',
    description: 'Production runtime, secrets, database, and Pages deployment.',
    overview: 'Best practices for deploying PGBloom in production Node.js backends and hosting documentation.',
    whyUse: 'Ensure optimal security, connection pooling, and uptime in production environments.',
    architecture: 'Run PGBloom in Node.js 18+ servers with managed PostgreSQL. Configure pool sizes based on container counts.',
    apiSignature: 'createPgbloom(process.env.DATABASE_URL, options)',
    parametersAndReturns: 'Ensure SSL is enabled in connection string (sslmode=require) and secrets are kept server-side.',
    errorsAndFailure: 'Keep database credentials out of client bundles; tune pool limits to avoid exhausting database connections.',
    whenNotToUse: 'Do not use development credentials or default JWT secrets in production.',
    exampleCode: `const client = await createPgbloom(process.env.DATABASE_URL!, {
  maxConnections: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});`,
    relatedSlugs: ['configuration', 'installation', 'testing'],
  },

  troubleshooting: {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    category: 'operations',
    description: 'Common startup, runtime, database, and feature failures.',
    overview: 'Diagnostic procedures for connection errors, lock contention, timeout expirations, and runtime boundary issues.',
    whyUse: 'Quickly resolve common setup and operational issues.',
    architecture: 'Covers error classification across PGBloomDatabaseError, PGBloomValidationError, and PGBloomAuthError.',
    apiSignature: 'inspect error.name, error.message, error.code',
    parametersAndReturns: 'All errors extend standard Error with subsystem-specific metadata.',
    errorsAndFailure: 'Common fixes: check PostgreSQL connection string, verify table creation permissions, increase lock TTL.',
    whenNotToUse: 'Do not silence errors without logging the underlying error message.',
    exampleCode: `try {
  await client.setCache("k", "v");
} catch (err) {
  if (err instanceof PGBloomDatabaseError) {
    console.error("Database connectivity error:", err.message);
  }
}`,
    relatedSlugs: ['api', 'configuration', 'testing'],
  },

  examples: {
    slug: 'examples',
    title: 'Code Examples',
    category: 'examples',
    description: 'Executable patterns using the actual exported API.',
    overview: 'Production-ready code recipes covering caching, background queues, distributed locking, and schema models.',
    whyUse: 'Copy and adapt working code patterns directly into your applications.',
    architecture: 'Demonstrates real API contracts across server and browser runtimes.',
    apiSignature: 'All examples use the public createPgbloom contract.',
    parametersAndReturns: 'Full TypeScript code snippets ready for immediate copy and paste.',
    errorsAndFailure: 'Ensure proper database environment variables are configured before running examples.',
    whenNotToUse: 'Do not copy examples without providing valid environment variables.',
    exampleCode: `import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!);

// 1. Cache API response
await client.setCache("weather:london", { temp: 18 }, 300_000);

// 2. Queue email
await client.enqueue("emails", { to: "user@example.com" });

// 3. Distributed lock
if (await client.tryLock("cron_job", 10_000)) {
  try { /* do task */ } finally { await client.unlock("cron_job"); }
}

await client.close();`,
    relatedSlugs: ['quickstart', 'api', 'cache', 'queue'],
  },

  playground: {
    slug: 'playground',
    title: 'Interactive Playground',
    category: 'tool',
    description: 'Controlled browser execution for browser-safe PGBloom APIs with measured traces.',
    overview: 'Interactive browser sandbox to test counting Bloom filters, key validation, and serialization in real time.',
    whyUse: 'Experiment with Bloom filter false-positive rates and hashing mechanics with zero setup or credentials.',
    architecture: 'Executes real browser-safe PGBloom TypeScript code directly in the browser with measured step traces.',
    apiSignature: 'Client UI tool at /playground',
    parametersAndReturns: 'Provides visual counter grids, trace logs, execution duration, and simulation modes.',
    errorsAndFailure: 'Server-only PostgreSQL methods are clearly labeled and blocked from direct execution.',
    whenNotToUse: 'Does not execute arbitrary raw SQL or connect to live PostgreSQL instances.',
    exampleCode: `// Try this directly in the interactive playground:
import { BloomFilter } from "pgbloom/browser";
const filter = new BloomFilter({ expectedItems: 32, falsePositiveRate: 0.01 });
filter.add("user:123");
console.log(filter.has("user:123"));`,
    relatedSlugs: ['bloom-filter', 'browser'],
  },
}
