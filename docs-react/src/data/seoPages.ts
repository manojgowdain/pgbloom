export interface PageMetadata {
  slug: string
  title: string
  category: 'feature' | 'guide' | 'comparison' | 'use-case' | 'brand' | 'docs'
  h1: string
  metaTitle: string
  metaDescription: string
  keywords: string
  canonicalPath: string
  intro: string
  sections: {
    heading: string
    content: string
    code?: string
  }[]
  pros?: string[]
  cons?: string[]
  relatedSlugs: string[]
}

export const landingPages: Record<string, PageMetadata> = {
  // Brand & Distribution Pages
  'pgbloom-js': {
    slug: 'pgbloom-js',
    title: 'PGBloom JS — Modern JavaScript & TypeScript Toolkit',
    category: 'brand',
    h1: 'PGBloom JS: Modern PostgreSQL Infrastructure for JavaScript',
    metaTitle: 'PGBloom JS — PostgreSQL Infrastructure Toolkit for JavaScript & Node.js',
    metaDescription: 'PGBloom JS provides a unified JavaScript client for PostgreSQL caching, job queues, Pub/Sub, distributed locks, rate limiting, and bloom filters.',
    keywords: 'PGBloom JS, PGBloom JavaScript, PostgreSQL JavaScript cache, Node.js postgres toolkit, PGBloom client',
    canonicalPath: '/pgbloom-js',
    intro: 'PGBloom JS is the primary JavaScript and TypeScript distribution of the PGBloom infrastructure toolkit. Engineered for Node.js 18+, Bun, and Deno, PGBloom JS consolidates essential backend coordination primitives directly onto your existing PostgreSQL database instance without requiring auxiliary daemons.',
    sections: [
      {
        heading: 'Why Choose PGBloom JS for Modern Backend Architectures?',
        content: 'When architecting modern Node.js backends, developers frequently introduce separate services like Redis, RabbitMQ, and Memcached for caching, queues, and locks. While fast, this multi-tier architecture introduces operational sprawl, distributed failure points, complex synchronization logic, and independent backup obligations. PGBloom JS simplifies this model by utilizing PostgreSQL primitives—such as table TTLs, FOR UPDATE SKIP LOCKED, and LISTEN/NOTIFY—to deliver resilient, single-store infrastructure.',
      },
      {
        heading: 'Universal JavaScript Runtime Support',
        content: 'PGBloom JS provides native ESM and CommonJS builds for Node.js, first-class JSR packaging for Deno and Bun, and an isolated browser-safe entrypoint (`pgbloom/browser`) for client-side hashing, serialization, and Bloom filter verification.',
        code: `import { createPgbloom } from "pgbloom";

// Initialize the high-level PGBloom JS client
const client = await createPgbloom(process.env.DATABASE_URL!, {
  bloomFilter: true,
  lock: { defaultTtl: 30000 }
});

// Cache high-throughput payloads with millisecond TTL
await client.setCache("session:token_984", { userId: "user_42" }, 60_000);
const session = await client.getCache("session:token_984");`,
      },
      {
        heading: 'Zero External Extension Dependencies',
        content: 'Unlike specialized PostgreSQL extensions that demand root access, customized database containers, or cloud provider approval, PGBloom JS works entirely with standard SQL tables, built-in row-level locking, and native PostgreSQL features. It runs seamlessly on AWS RDS, Supabase, Neon, Azure Database for PostgreSQL, GCP Cloud SQL, and self-hosted instances.',
      },
    ],
    pros: [
      'Eliminates Redis/RabbitMQ infrastructure overhead and dual-write synchronizations',
      'Leverages ACID durability, ACID rollbacks, and proven PostgreSQL point-in-time recovery',
      'Supports ESM, CJS, Deno, Bun, and browser-safe modules out of the box',
    ],
    cons: [
      'PostgreSQL is disk-backed and transactional; extreme microsecond in-memory demands still favor Redis',
      'Requires appropriate database connection pooling (PgBouncer or built-in pool) under high connection counts',
    ],
    relatedSlugs: ['pgbloom-npm', 'pgbloom-installation', 'features/postgresql-cache', 'comparisons/pgbloom-vs-redis'],
  },

  'pgbloom-npm': {
    slug: 'pgbloom-npm',
    title: 'PGBloom npm Package — Installation & Node.js Integration',
    category: 'brand',
    h1: 'PGBloom npm Package for Node.js & TypeScript',
    metaTitle: 'PGBloom npm — Official Node.js Package for PostgreSQL Infrastructure',
    metaDescription: 'Download and install the official pgbloom npm package. PostgreSQL caching, job queue, locks, pubsub, and rate limiting for Node.js.',
    keywords: 'PGBloom npm, pgbloom npm package, npm install pgbloom, Node.js postgres cache package, Node.js postgres queue',
    canonicalPath: '/pgbloom-npm',
    intro: 'The official `pgbloom` npm package provides standard Node.js applications with enterprise-grade caching, job queues, distributed locks, rate limiting, and Pub/Sub over PostgreSQL.',
    sections: [
      {
        heading: 'Installation via npm, pnpm, and yarn',
        content: 'The package requires Node.js 18 or higher and a PostgreSQL instance. It is published with full TypeScript declarations and dual CJS/ESM exports.',
        code: `# Using npm
npm install pgbloom

# Using pnpm
pnpm add pgbloom

# Using yarn
yarn add pgbloom`,
      },
      {
        heading: 'Package Architecture and Sub-path Exports',
        content: 'The npm package exposes three distinct entrypoints to keep bundles light and prevent server-only code from leaking into frontend builds: `pgbloom` (default full client), `pgbloom/server` (server-only storage and utilities), and `pgbloom/browser` (isomorphic Bloom filter and key validators).',
      },
      {
        heading: 'Automatic Schema Migration and Table Bootstrapping',
        content: 'Calling `createPgbloom(connectionString)` automatically verifies database connectivity, tests pooling limits, and executes idempotent `CREATE TABLE IF NOT EXISTS` migrations for internal cache, queue, lock, rate limiting, and audit tables.',
      },
    ],
    relatedSlugs: ['pgbloom-js', 'pgbloom-installation', 'pgbloom-jsr', 'features/queue'],
  },

  'pgbloom-jsr': {
    slug: 'pgbloom-jsr',
    title: 'PGBloom on JSR — Modern TypeScript Registry for Deno & Bun',
    category: 'brand',
    h1: 'PGBloom on JSR (@manojgowdain/pgbloom)',
    metaTitle: 'PGBloom JSR Package — @manojgowdain/pgbloom for Deno, Bun & Modern TS',
    metaDescription: 'Install PGBloom from the JSR registry (@manojgowdain/pgbloom). Native TypeScript support, documentation generation, and zero build step for Deno and Bun.',
    keywords: 'PGBloom JSR, @manojgowdain/pgbloom, JSR registry, Deno postgres cache, Bun postgres queue, TypeScript registry',
    canonicalPath: '/pgbloom-jsr',
    intro: 'PGBloom is officially published to the JavaScript Registry (JSR) under the namespace `@manojgowdain/pgbloom`. JSR provides first-class TypeScript source distribution, automated API docs, and cross-runtime compatibility.',
    sections: [
      {
        heading: 'Installing from JSR',
        content: 'JSR natively integrates with Deno and modern package managers, downloading source TypeScript and verifying type contracts directly.',
        code: `# Deno
deno add jsr:@manojgowdain/pgbloom

# Bun
bun add jsr:@manojgowdain/pgbloom

# npm (using JSR CLI)
npx jsr add @manojgowdain/pgbloom`,
      },
      {
        heading: 'Runtime Requirements for JSR Consumers',
        content: 'Because PGBloom communicates with PostgreSQL via socket connections and manages disk stores, JSR consumers must run in a Node-compatible runtime (Node.js 18+, Bun, or Deno with Node compatibility enabled). Pure Deno environments without Node polyfills cannot instantiate database drivers.',
      },
    ],
    relatedSlugs: ['pgbloom-js', 'pgbloom-npm', 'pgbloom-installation'],
  },

  'pgbloom-iotkit': {
    slug: 'pgbloom-iotkit',
    title: 'PGBloom Powered by IOTKit — Ecosystem Overview',
    category: 'brand',
    h1: 'PGBloom & The IOTKit Open Source Ecosystem',
    metaTitle: 'PGBloom by IOTKit — Open Source Data Layer & Backend Utilities',
    metaDescription: 'Discover PGBloom powered by IOTKit. How PGBloom integrates with the broader IOTKit suite including ToonKit and SSDiskDB for modern full-stack development.',
    keywords: 'PGBloom IOTKit, powered by IOTKit, IOTKit ecosystem, ToonKit, SSDiskDB, Manoj Gowda, open source developer tools',
    canonicalPath: '/pgbloom-iotkit',
    intro: 'PGBloom is part of the IOTKit open-source software ecosystem engineered by Manoj Gowda. Designed to provide modular, resilient, and developer-friendly developer tooling, IOTKit projects prioritize simplicity, transparent data storage, and low operational friction.',
    sections: [
      {
        heading: 'The IOTKit Engineering Philosophy',
        content: 'Many modern software projects suffer from dependency bloat and complex distributed cloud microservices. The IOTKit ecosystem emphasizes "PostgreSQL-first" and "local-first" patterns: keeping data in predictable, standard formats like PostgreSQL and local disk storage rather than proprietary cloud silos.',
      },
      {
        heading: 'Related Projects in the Ecosystem',
        content: 'Key companion libraries in the IOTKit portfolio include SSDiskDB (a persistent, ultra-fast disk-backed key-value store used inside PGBloom for local caching layers) and ToonKit (a utility toolkit for animation and UI state coordination).',
      },
    ],
    relatedSlugs: ['pgbloom-js', 'features/storage', 'pgbloom-documentation'],
  },

  'pgbloom-installation': {
    slug: 'pgbloom-installation',
    title: 'PGBloom Installation Guide — Node.js, Deno, Bun & Docker',
    category: 'docs',
    h1: 'Installing and Configuring PGBloom',
    metaTitle: 'PGBloom Installation Guide — Setup for Node.js, Bun, Deno & Postgres',
    metaDescription: 'Step-by-step installation instructions for PGBloom. Connect to PostgreSQL, configure connection pools, configure Docker, and run first commands.',
    keywords: 'PGBloom installation, install pgbloom, setup postgresql cache, docker postgres testing, pgbloom connection string',
    canonicalPath: '/pgbloom-installation',
    intro: 'Setting up PGBloom takes less than two minutes. This guide covers package installation across npm, pnpm, bun, and deno, followed by PostgreSQL connection string configuration and containerized testing setups.',
    sections: [
      {
        heading: 'Step 1: Install the Package',
        content: 'Select the package manager appropriate for your stack. Standard Node.js applications should use npm or pnpm.',
        code: `npm install pgbloom`,
      },
      {
        heading: 'Step 2: Database Prerequisites',
        content: 'PGBloom works with any PostgreSQL 12+ database (PostgreSQL 16 recommended). It connects using standard connection URLs in the format `postgres://username:password@hostname:5432/databasename?sslmode=require`.',
      },
      {
        heading: 'Step 3: Initializing the Client',
        content: 'Create your initial client instance in your application lifecycle startup file.',
        code: `import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!, {
  maxConnections: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  bloomFilter: true
});

console.log("PGBloom connected and tables verified!");`,
      },
    ],
    relatedSlugs: ['pgbloom-js', 'pgbloom-npm', 'features/postgresql-cache', 'guides/postgresql-cache-nodejs'],
  },

  'pgbloom-documentation': {
    slug: 'pgbloom-documentation',
    title: 'PGBloom Documentation — API Reference & Architecture Guides',
    category: 'docs',
    h1: 'PGBloom Documentation & Engineering Reference',
    metaTitle: 'PGBloom Documentation — Architecture, APIs & Practical Guides',
    metaDescription: 'Complete documentation for PGBloom. Explore API references for cache, pubsub, queues, locks, rate limits, schema models, and bloom filters.',
    keywords: 'PGBloom documentation, PGBloom API reference, postgresql infrastructure docs, pgbloom guides',
    canonicalPath: '/pgbloom-documentation',
    intro: 'Welcome to the complete PGBloom documentation portal. Here you will find architectural overviews, detailed API contracts, parameter descriptions, error definitions, and interactive code examples.',
    sections: [
      {
        heading: 'Core Subsystems Overview',
        content: 'PGBloom is structured into cohesive subsystems: Caching with optional Bloom filters, LISTEN/NOTIFY Pub/Sub, Priority Job Queues, Distributed Locks & Leader Election, Job Schedulers, Rate Limiters, Atomic Counters, Schema Models (CRUD), and Authentication with OTP.',
      },
      {
        heading: 'AI-Agent and Machine-Readable Docs',
        content: 'For automated agents and LLM tooling, PGBloom provides structured documentation in `/aiagent/index.json`, `/aiagent/llms.txt`, and interactive routes right inside this application.',
      },
    ],
    relatedSlugs: ['pgbloom-installation', 'features/postgresql-cache', 'guides/postgresql-caching'],
  },

  // Technical Feature Pages
  'features/postgresql-cache': {
    slug: 'features/postgresql-cache',
    title: 'PostgreSQL Cache with TTL & Bloom Filter Optimization',
    category: 'feature',
    h1: 'PostgreSQL Cache: High-Performance Database-Backed Caching',
    metaTitle: 'PostgreSQL Cache with TTL & Bloom Filter | PGBloom Feature',
    metaDescription: 'PostgreSQL-backed cache for Node.js and TypeScript. Automatic TTL expiration, JSON serialization, and counting Bloom filter lookup optimization.',
    keywords: 'PostgreSQL cache, postgres cache library, postgresql caching nodejs, TTL cache postgresql, bloom filter cache',
    canonicalPath: '/features/postgresql-cache',
    intro: 'PGBloom delivers an ACID-backed caching layer built entirely on PostgreSQL. Store structured objects, buffers, or primitives with millisecond-precision TTL expiration and optional in-memory Bloom filter verification.',
    sections: [
      {
        heading: 'How PGBloom PostgreSQL Caching Works',
        content: 'Cache entries are persisted to the `pgsnap_cache` table containing the cache key, serialized JSON payload, created timestamp, and expiration timestamp. When querying via `getCache()`, PGBloom executes an indexed lookup. If an optional Bloom filter is enabled, negative lookups are skipped entirely in memory before querying the database, eliminating unnecessary I/O.',
        code: `// Store a key with a 5-minute TTL (300,000 ms)
await client.setCache("product:sku_9011", {
  title: "Industrial Sensor A1",
  inventory: 142,
  price: 89.50
}, 300_000);

// Retrieve the cached item
const item = await client.getCache<{ title: string; price: number }>("product:sku_9011");
if (item) {
  console.log("Found in cache:", item.title);
}`,
      },
      {
        heading: 'Bloom Filter Acceleration',
        content: 'By maintaining an in-process counting Bloom filter, PGBloom checks whether a cache key definitely does NOT exist before issuing a SQL query. If the Bloom filter returns false, PGBloom immediately returns `null` without consuming database pool connections.',
      },
      {
        heading: 'Automatic Background Expiration & Cleanup',
        content: 'Expired cache entries are safely ignored at read time via `WHERE expires_at > NOW()`. A configurable background timer periodically executes batch deletions to purge stale rows without locking the table.',
      },
    ],
    pros: [
      'Eliminates separate caching servers for small-to-medium datasets',
      'Cache items can be inspected, joined, or audited using ordinary SQL',
      'Survives application restarts and crashes without cache cold-starts',
    ],
    cons: [
      'Network roundtrips to PostgreSQL are slower than local in-memory RAM caches',
      'Requires indexed database table space for high-volume cache keys',
    ],
    relatedSlugs: ['features/cache-ttl', 'features/cache-invalidation', 'guides/postgresql-caching', 'comparisons/pgbloom-vs-redis'],
  },

  'features/cache-ttl': {
    slug: 'features/cache-ttl',
    title: 'Cache TTL & Expiration Handling in PostgreSQL',
    category: 'feature',
    h1: 'Cache TTL & Automated Expiration in PostgreSQL',
    metaTitle: 'PostgreSQL Cache TTL & Expiration Management | PGBloom',
    metaDescription: 'Manage millisecond-precision cache TTL in PostgreSQL. Configure default expiration times, manual sweeps, and background cleanup timers.',
    keywords: 'cache TTL postgresql, postgres cache expiration, TTL caching nodejs, clearExpiredCache, pgbloom ttl',
    canonicalPath: '/features/cache-ttl',
    intro: 'Time-To-Live (TTL) is fundamental to cache validity. PGBloom implements robust, millisecond-accurate expiration timestamps directly in PostgreSQL.',
    sections: [
      {
        heading: 'Configuring TTL Defaults and Overrides',
        content: 'When initializing PGBloom, you can set a global `defaultTtl` (defaulting to 1 hour). Individual `setCache()` calls can override this value using milliseconds or a specific future `Date` object.',
        code: `// Custom 10-second TTL
await client.setCache("temp_otp:user_99", { code: "884129" }, 10_000);

// Custom absolute date expiration
const midnight = new Date();
midnight.setHours(23, 59, 59, 999);
await client.setCache("daily_report:2026-10-11", { computed: true }, midnight);`,
      },
      {
        heading: 'Batch Purging Stale Rows with clearExpiredCache()',
        content: 'To keep storage footprints compact, call `client.clearExpiredCache()` on demand or let the built-in periodic task clean up expired keys automatically.',
      },
    ],
    relatedSlugs: ['features/postgresql-cache', 'features/cache-invalidation', 'guides/cache-invalidation-guide'],
  },

  'features/cache-invalidation': {
    slug: 'features/cache-invalidation',
    title: 'PostgreSQL Cache Invalidation Strategies',
    category: 'feature',
    h1: 'Cache Invalidation Strategies with PGBloom & PostgreSQL',
    metaTitle: 'Cache Invalidation Strategies in PostgreSQL | PGBloom',
    metaDescription: 'Comprehensive guide to cache invalidation in PostgreSQL. Key-based deletion, namespace flushing, event-driven cache invalidation, and Bloom sync.',
    keywords: 'cache invalidation postgresql, postgres cache purge, invalidating cache nodejs, cache consistency, pgbloom deleteCache',
    canonicalPath: '/features/cache-invalidation',
    intro: 'Phil Karlton famously observed that cache invalidation is one of computer science\'s hardest problems. PGBloom provides explicit tools and patterns to keep cache state perfectly in sync with your source of truth.',
    sections: [
      {
        heading: 'Direct Key Invalidation',
        content: 'When a database mutation occurs (such as an order update or user profile change), directly delete the related cache key.',
        code: `// Perform user update in database
await usersModel.updateOne({ id: userId }, { $set: { email: newEmail } });

// Invalidate cached user profile immediately
await client.deleteCache(\`user:profile:\${userId}\`);`,
      },
      {
        heading: 'Event-Driven Invalidation using Pub/Sub',
        content: 'In distributed microservice environments with multiple Node.js instances, emit a Pub/Sub notification to trigger cache invalidation across all active application pods simultaneously.',
      },
    ],
    relatedSlugs: ['features/postgresql-cache', 'guides/cache-invalidation-guide', 'features/pubsub'],
  },

  'features/pubsub': {
    slug: 'features/pubsub',
    title: 'PostgreSQL LISTEN/NOTIFY Pub/Sub Messaging',
    category: 'feature',
    h1: 'PostgreSQL Pub/Sub: Real-Time Messaging with LISTEN & NOTIFY',
    metaTitle: 'PostgreSQL Pub/Sub Messaging for Node.js | PGBloom Feature',
    metaDescription: 'Lightweight Pub/Sub messaging using PostgreSQL LISTEN and NOTIFY. Connect Node.js instances for low-latency notifications and live event distribution.',
    keywords: 'PostgreSQL PubSub, postgres LISTEN NOTIFY, nodejs postgres pubsub, realtime messaging postgres, pgbloom publish subscribe',
    canonicalPath: '/features/pubsub',
    intro: 'PostgreSQL features an exceptionally low-overhead inter-process messaging system through `LISTEN` and `NOTIFY`. PGBloom wraps this functionality into clean, asynchronous `publish` and `subscribe` JavaScript APIs.',
    sections: [
      {
        heading: 'Low-Latency Cross-Process Broadcasts',
        content: 'PostgreSQL handles message fan-out natively. Any connected PGBloom client subscribing to a channel receives incoming notifications almost instantaneously without polling.',
        code: `// Subscribe to channel notifications
const unsubscribe = await client.subscribe("orders:created", (channel, payload) => {
  console.log(\`Received on \${channel}:\`, payload);
});

// Publish a JSON-serializable message
await client.publish("orders:created", {
  orderId: "ord_10829",
  amount: 450.00,
  timestamp: Date.now()
});

// Clean up listener when shutting down
await unsubscribe();`,
      },
      {
        heading: 'Pub/Sub vs Persistent Queues',
        content: 'PostgreSQL Pub/Sub is ephemeral: if a subscriber is offline when a notification is broadcast, that message is not retained. For guaranteed at-least-once delivery, use PGBloom Job Queues or Events instead.',
      },
    ],
    pros: [
      'Zero extra messaging infrastructure—built into core PostgreSQL',
      'Sub-millisecond broadcast latency across all connected workers',
      'JSON payload encoding and decoding handled automatically',
    ],
    cons: [
      'Ephemeral delivery—messages sent while a worker is offline are lost',
      'PostgreSQL NOTIFY payloads are limited to 8,000 bytes (use IDs for large payloads)',
    ],
    relatedSlugs: ['features/queue', 'features/events', 'guides/postgresql-pubsub'],
  },

  'features/queue': {
    slug: 'features/queue',
    title: 'PostgreSQL Priority Job Queue with Visibility Timeouts',
    category: 'feature',
    h1: 'PostgreSQL Job Queue: Concurrency-Safe Background Processing',
    metaTitle: 'PostgreSQL Priority Job Queue for Node.js | PGBloom Feature',
    metaDescription: 'Reliable background job queue using PostgreSQL row locks and FOR UPDATE SKIP LOCKED. Priority queuing, visibility timeouts, retries, and statistics.',
    keywords: 'PostgreSQL job queue, postgres queue nodejs, FOR UPDATE SKIP LOCKED, background jobs postgres, pgbloom enqueue dequeue',
    canonicalPath: '/features/queue',
    intro: 'Execute robust background jobs without BullMQ or RabbitMQ. PGBloom queues use PostgreSQL row-level locks and `FOR UPDATE SKIP LOCKED` to deliver non-blocking, concurrency-safe worker claims.',
    sections: [
      {
        heading: 'Atomic Job Claims with SKIP LOCKED',
        content: 'When multiple workers call `dequeue()`, PostgreSQL locks only the claimed row and skips rows locked by peer workers. This guarantees that no two workers process the same job concurrently, eliminating lock contention.',
        code: `// Producer: Enqueue background email task
const job = await client.enqueue("email_delivery", {
  to: "dev@example.com",
  subject: "Report Ready",
  template: "monthly_summary"
}, { priority: 10, maxAttempts: 5, visibilityTimeout: 45_000 });

// Consumer: Worker loop
const pending = await client.dequeue<{ to: string }>("email_delivery");
if (pending) {
  try {
    await sendEmail(pending.payload.to);
    await client.completeJob(pending.id);
  } catch (err) {
    await client.failJob(pending.id, err.message);
  }
}`,
      },
      {
        heading: 'Visibility Timeouts & Dead-Letter Handling',
        content: 'If a worker crashes while processing a job, its visibility timeout expires, making the job automatically available to another worker. Once `maxAttempts` is exceeded, the job is marked permanently failed for investigation.',
      },
    ],
    pros: [
      'Zero message loss: all jobs are durable in PostgreSQL tables',
      'Transaction-safe: enqueue jobs inside standard database transactions',
      'Detailed stats: monitor pending, processing, completed, and failed counts',
    ],
    cons: [
      'High throughput (50,000+ jobs/sec) will increase PostgreSQL write volume',
      'Requires periodic table vacuuming or pruning of completed jobs',
    ],
    relatedSlugs: ['features/scheduler', 'features/distributed-locks', 'use-cases/backend-caching'],
  },

  'features/distributed-locks': {
    slug: 'features/distributed-locks',
    title: 'PostgreSQL Distributed Locks & Leader Election',
    category: 'feature',
    h1: 'Distributed Locks & Leader Election in PostgreSQL',
    metaTitle: 'PostgreSQL Distributed Locks & Leader Election | PGBloom',
    metaDescription: 'Coordinate distributed Node.js services with PostgreSQL row locks. Automatic TTL expiration, ownership tokens, backoff retries, and leader election.',
    keywords: 'PostgreSQL distributed lock, postgres lock nodejs, leader election postgresql, tryLock unlock, distributed coordination',
    canonicalPath: '/features/distributed-locks',
    intro: 'Avoid race conditions and duplicate operations across horizontally scaled microservices. PGBloom implements lease-based distributed locks with automatic TTL expiration in PostgreSQL.',
    sections: [
      {
        heading: 'Non-Blocking tryLock and Blocking lock',
        content: 'Safely acquire mutual exclusion for critical sections using owner-verified tokens. If a worker node abruptly crashes, the lock automatically clears when its TTL elapses.',
        code: `// Non-blocking lock attempt
const acquired = await client.tryLock("sync:stripe_charges", 20_000);
if (acquired) {
  try {
    await syncStripeCharges();
  } finally {
    await client.unlock("sync:stripe_charges");
  }
}`,
      },
      {
        heading: 'Leader Election for Cluster Nodes',
        content: 'Elect a single active leader among multiple replica pods for background tasks. Leaders renew their leases periodically; if a leader fails, a new node assumes leadership smoothly.',
      },
    ],
    relatedSlugs: ['features/queue', 'features/scheduler', 'guides/postgresql-distributed-locking'],
  },

  'features/rate-limiting': {
    slug: 'features/rate-limiting',
    title: 'PostgreSQL Rate Limiting: Fixed Window, Sliding & Token Bucket',
    category: 'feature',
    h1: 'Distributed Rate Limiting with PostgreSQL',
    metaTitle: 'PostgreSQL Rate Limiting (Token Bucket & Sliding Window) | PGBloom',
    metaDescription: 'Protect APIs and shared resources with PostgreSQL-backed rate limiters. Supports Fixed Window, Sliding Window, and Token Bucket algorithms.',
    keywords: 'PostgreSQL rate limiting, postgres rate limiter, token bucket postgresql, api rate limit nodejs, pgbloom rateLimit',
    canonicalPath: '/features/rate-limiting',
    intro: 'Enforce API rate limits across all application pods using PostgreSQL as the central counter and timestamp store.',
    sections: [
      {
        heading: 'Multiple Rate Limiting Algorithms',
        content: 'Choose the algorithm suited to your workload: Fixed Window for simple counters, Sliding Window for burst smoothing, or Token Bucket for sustained throughput.',
        code: `// Fixed Window: 100 requests per minute per IP
const res = await client.rateLimit(\`ip:\${clientIp}\`, 100, 60_000);
if (!res.allowed) {
  throw new Error(\`Rate limit exceeded. Reset at \${new Date(res.resetAt)}\`);
}

// Token Bucket: capacity 50, refills 5 tokens/second
const bucket = await client.rateLimitTokenBucket(\`user:\${userId}\`, 50, 5);`,
      },
    ],
    relatedSlugs: ['features/counters', 'features/postgresql-cache', 'use-cases/nodejs-applications'],
  },

  'features/scheduler': {
    slug: 'features/scheduler',
    title: 'PostgreSQL Job Scheduler & Recurring Cron Tasks',
    category: 'feature',
    h1: 'PostgreSQL Job Scheduler & Recurring Tasks',
    metaTitle: 'PostgreSQL Job Scheduler for Node.js & TypeScript | PGBloom',
    metaDescription: 'Schedule one-off and recurring jobs directly in PostgreSQL. Human-readable interval strings, atomic job claims, and persistent cron schedules.',
    keywords: 'PostgreSQL scheduler, postgres cron, scheduled jobs postgresql, nodejs job schedule, recurring tasks postgres',
    canonicalPath: '/features/scheduler',
    intro: 'Eliminate external cron daemons. Schedule delayed executions and recurring interval jobs backed by durable PostgreSQL rows.',
    sections: [
      {
        heading: 'Scheduling One-Time and Recurring Tasks',
        content: 'Define jobs with string intervals such as `10s`, `15m`, `1h`, or `1d`. Workers claim due tasks safely using row locks.',
        code: `// Schedule delayed job for 30 minutes in the future
await client.schedule("send_reminder", { orderId: 8812 }, 30 * 60_000);

// Schedule recurring maintenance every 6 hours
await client.scheduleRecurring("cleanup_sessions", {}, "6h");`,
      },
    ],
    relatedSlugs: ['features/queue', 'features/distributed-locks'],
  },

  'features/events': {
    slug: 'features/events',
    title: 'Persistent PostgreSQL Events with History & Replay',
    category: 'feature',
    h1: 'Persistent PostgreSQL Events: Audit Logs & Replay',
    metaTitle: 'PostgreSQL Persistent Events & Replay | PGBloom Feature',
    metaDescription: 'Durable event log on PostgreSQL. Real-time notification via LISTEN/NOTIFY coupled with persistent history, cursor pagination, and replay.',
    keywords: 'PostgreSQL events, event sourcing postgresql, postgres audit log, event replay nodejs, pgbloom emit replayEvents',
    canonicalPath: '/features/events',
    intro: 'Combine the speed of real-time event distribution with durable storage. PGBloom records events permanently while broadcasting immediate notifications.',
    sections: [
      {
        heading: 'Emitting and Replaying Historical Events',
        content: 'When auditing or rebuilding state, query event history or replay events over a designated time range.',
        code: `// Emit an event
await client.emit("user.registered", { id: "u_1", plan: "pro" });

// Query historical events with filters
const history = await client.getEventHistory({ type: "user.registered", limit: 50 });

// Replay events to a handler function
const { replayed } = await client.replayEvents(
  new Date("2026-10-01"),
  new Date("2026-10-11"),
  "user.registered",
  async (event) => console.log("Replaying:", event)
);`,
      },
    ],
    relatedSlugs: ['features/pubsub', 'features/queue', 'features/model'],
  },

  'features/counters': {
    slug: 'features/counters',
    title: 'Atomic Distributed Counters in PostgreSQL',
    category: 'feature',
    h1: 'Atomic Distributed Counters in PostgreSQL',
    metaTitle: 'Atomic Distributed Counters with PostgreSQL | PGBloom',
    metaDescription: 'Perform atomic increments and decrements in PostgreSQL. Configurable consistency models: strong, local, and eventual.',
    keywords: 'PostgreSQL atomic counter, postgres increment counter, distributed counter nodejs, atomic operations postgres',
    canonicalPath: '/features/counters',
    intro: 'Count page views, likes, metrics, and inventory atomically in PostgreSQL without read-modify-write race conditions.',
    sections: [
      {
        heading: 'Atomic In-Database Increments',
        content: 'PGBloom uses SQL `ON CONFLICT DO UPDATE SET value = value + $1` to guarantee mathematical atomicity under high concurrency.',
        code: `// Atomic increment
await client.increment("page_views:home");

// Add bulk quantity
await client.add("cart_total:session_441", 3);

// Read counter with consistency guarantees
const views = await client.getCounter("page_views:home", "strong");`,
      },
    ],
    relatedSlugs: ['features/rate-limiting', 'features/postgresql-cache'],
  },

  'features/bloom-filter': {
    slug: 'features/bloom-filter',
    title: 'Counting Bloom Filters in JavaScript & TypeScript',
    category: 'feature',
    h1: 'Counting Bloom Filters in JavaScript & Node.js',
    metaTitle: 'Counting Bloom Filter in JavaScript & TypeScript | PGBloom',
    metaDescription: 'Zero-dependency counting Bloom filter for Node.js, Deno, Bun, and browser. Fast probabilistic membership testing with configurable false-positive rates.',
    keywords: 'bloom filter javascript, counting bloom filter typescript, probabilistic data structure nodejs, pgbloom bloom filter',
    canonicalPath: '/features/bloom-filter',
    intro: 'PGBloom includes a runtime-independent counting Bloom filter implemented from scratch in TypeScript with zero external dependencies.',
    sections: [
      {
        heading: 'How the Bloom Filter Accelerates Lookups',
        content: 'A Bloom filter provides probabilistic set membership: it can definitively tell you if an item is NOT present (zero false negatives), eliminating unnecessary disk or network queries.',
        code: `import { BloomFilter } from "pgbloom/browser";

const filter = new BloomFilter({
  expectedItems: 10_000,
  falsePositiveRate: 0.01 // 1%
});

filter.add("sku_4981");
console.log(filter.has("sku_4981")); // true
console.log(filter.has("nonexistent")); // false (definitely absent)`,
      },
    ],
    relatedSlugs: ['features/postgresql-cache', 'features/browser', 'playground'],
  },

  'features/storage': {
    slug: 'features/storage',
    title: 'Local Disk Storage with SSDiskDB & MemoryCache',
    category: 'feature',
    h1: 'Persistent Local Disk Storage & In-Memory LRU Cache',
    metaTitle: 'Local Disk Storage (SSDiskDB) & MemoryCache | PGBloom',
    metaDescription: 'Persistent server-local key-value storage using SSDiskDB paired with in-memory LRU and TTL caching layers for rapid local reads.',
    keywords: 'local storage nodejs, ssdiskdb, memory cache lru, persistent key value store, pgbloom createLocalStore',
    canonicalPath: '/features/storage',
    intro: 'For scenarios where data should persist on the local server disk without querying PostgreSQL over the network, PGBloom integrates SSDiskDB with an in-memory LRU cache layer.',
    sections: [
      {
        heading: 'Two-Tier Local Caching Architecture',
        content: 'MemoryCache holds frequently accessed keys in RAM. If an item is evicted due to LRU constraints, it is retrieved from the local SSDiskStore on disk.',
        code: `import { createLocalStore, MemoryCache } from "pgbloom/server";

const disk = await createLocalStore({ path: "./.pgbloom_data" });
const localCache = new MemoryCache(disk, { maxEntries: 1000, ttl: 60_000 });

await localCache.set("app_config", { debug: false, region: "us-east-1" });
const config = await localCache.get("app_config");
await localCache.close();`,
      },
    ],
    relatedSlugs: ['features/postgresql-cache', 'pgbloom-iotkit'],
  },

  'features/browser': {
    slug: 'features/browser',
    title: 'Browser-Safe PGBloom API Entrypoint',
    category: 'feature',
    h1: 'Browser-Safe PGBloom Utilities for Frontend Apps',
    metaTitle: 'Browser-Safe PGBloom Utilities (pgbloom/browser) | PGBloom',
    metaDescription: 'Client-side utilities from pgbloom/browser: counting bloom filter, key validation, and safe serialization with zero Node.js dependencies.',
    keywords: 'pgbloom browser, client side bloom filter, frontend serialization, validateKey, browser safe utilities',
    canonicalPath: '/features/browser',
    intro: 'While PostgreSQL client connections must remain strictly on the backend, PGBloom exposes `pgbloom/browser` for frontend and edge runtimes.',
    sections: [
      {
        heading: 'Safe Frontend Import Isolation',
        content: 'Importing `pgbloom/browser` never pulls in `pg`, `crypto`, or Node filesystem modules, keeping client bundles lightweight and secure.',
        code: `import { BloomFilter, validateKey, serialize, deserialize } from "pgbloom/browser";

validateKey("cache:key:valid"); // passes
const filter = new BloomFilter({ expectedItems: 50, falsePositiveRate: 0.05 });`,
      },
    ],
    relatedSlugs: ['features/bloom-filter', 'playground'],
  },

  'features/model': {
    slug: 'features/model',
    title: 'Schema-Driven PostgreSQL CRUD Models',
    category: 'feature',
    h1: 'Schema-Driven CRUD Models in PostgreSQL',
    metaTitle: 'PostgreSQL CRUD Models with Schema Validation | PGBloom',
    metaDescription: 'Type-safe schema-driven CRUD models in PostgreSQL. Automatic table creation, index synchronization, MongoDB-style query filters, and atomic updates.',
    keywords: 'PostgreSQL CRUD model, schema driven postgres, orm alternative nodejs, pgbloom model createTable',
    canonicalPath: '/features/model',
    intro: 'Enjoy high-productivity CRUD modeling without bulky ORMs. PGBloom models feature schema validation, MongoDB-style filter operators, and index synchronization.',
    sections: [
      {
        heading: 'Defining and Querying Models',
        content: 'Declare fields, types, and constraints. PGBloom automatically generates tables and indexes while supporting `$in`, `$gt`, `$set`, and `$inc` operators.',
        code: `const users = client.model("app_users", {
  email: { type: "string", required: true, unique: true },
  plan: { type: "string", default: "free" },
  credits: { type: "number", default: 10 }
});

await users.createTable();
await users.create({ email: "user@example.com", plan: "pro" });

// Query with expressive operators
const proUsers = await users.find({
  plan: "pro",
  credits: { $gt: 5 }
}, { limit: 25, sort: { email: 1 } });`,
      },
    ],
    relatedSlugs: ['features/events', 'features/postgresql-cache'],
  },

  'features/auth': {
    slug: 'features/auth',
    title: 'PostgreSQL Authentication, JWTs & OTP Workflows',
    category: 'feature',
    h1: 'Authentication, Passwordless OTP & JWTs in PostgreSQL',
    metaTitle: 'PostgreSQL Authentication & OTP Sessions | PGBloom',
    metaDescription: 'Secure authentication in PostgreSQL: Argon2id password hashing, HS256 access and refresh tokens, session revocation, and passwordless OTPs.',
    keywords: 'PostgreSQL authentication, argon2id nodejs, jwt session postgres, passwordless otp postgres, pgbloom auth',
    canonicalPath: '/features/auth',
    intro: 'Implement complete authentication workflows directly on PostgreSQL. Argon2id hashing, access and refresh token rotation, and 5-minute expiry OTPs.',
    sections: [
      {
        heading: 'Complete User Signup and Verification',
        content: 'Handle password hashing, token issuance, refresh rotation, and logout without integrating third-party identity providers.',
        code: `const auth = client.auth({
  jwtSecret: process.env.JWT_SECRET!,
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d"
});

const { user, accessToken, refreshToken } = await auth.signup({
  email: "dev@example.com",
  password: "secure_passphrase_here"
});

const verifiedUser = await auth.me(accessToken);`,
      },
    ],
    relatedSlugs: ['features/model', 'features/rate-limiting'],
  },

  // Educational Guides
  'guides/postgresql-caching': {
    slug: 'guides/postgresql-caching',
    title: 'Complete Guide to PostgreSQL Caching Patterns',
    category: 'guide',
    h1: 'The Complete Architectural Guide to PostgreSQL Caching',
    metaTitle: 'PostgreSQL Caching Patterns & Best Practices Guide | PGBloom',
    metaDescription: 'Learn how to implement reliable, production-ready caching in PostgreSQL. Indexing patterns, unlogged tables, TTL sweeps, and cache invalidation.',
    keywords: 'postgresql caching guide, caching with postgresql, postgres caching architecture, postgresql performance caching',
    canonicalPath: '/guides/postgresql-caching',
    intro: 'Many teams introduce Redis early in application lifecycles out of habit. This comprehensive guide details how to leverage PostgreSQL\'s robust engine for high-performance caching while eliminating unnecessary infrastructure dependencies.',
    sections: [
      {
        heading: 'When Does PostgreSQL Caching Excel?',
        content: 'PostgreSQL caching is ideal for read-heavy workloads where cache items number in the thousands or millions, data consistency matters, and your database server already possesses ample RAM for the PostgreSQL buffer pool (`shared_buffers`).',
      },
      {
        heading: 'Table Design and Storage Efficiency',
        content: 'A robust caching table requires a unique primary key index on `key`, an index on `expires_at` for rapid vacuuming, and serialized byte/JSON storage. PGBloom encapsulates this table structure automatically.',
      },
      {
        heading: 'Unlogged Tables for Ephemeral Performance',
        content: 'For purely ephemeral cache data that does not require WAL logging or crash recovery, unlogged tables bypass disk writes, offering performance competitive with dedicated in-memory stores.',
      },
    ],
    relatedSlugs: ['guides/postgresql-cache-nodejs', 'features/postgresql-cache', 'comparisons/pgbloom-vs-redis'],
  },

  'guides/postgresql-cache-nodejs': {
    slug: 'guides/postgresql-cache-nodejs',
    title: 'Building a PostgreSQL Cache in Node.js Applications',
    category: 'guide',
    h1: 'How to Implement PostgreSQL Caching in Node.js Applications',
    metaTitle: 'PostgreSQL Cache for Node.js Tutorial | PGBloom Guide',
    metaDescription: 'Step-by-step tutorial on integrating PostgreSQL caching into Node.js Express, Fastify, and NestJS backends using PGBloom.',
    keywords: 'postgresql cache nodejs, node.js postgres caching tutorial, express postgres cache, fastify postgres cache',
    canonicalPath: '/guides/postgresql-cache-nodejs',
    intro: 'Learn how to integrate PGBloom into your Node.js web frameworks (Express, Fastify, or Koa) to cache database queries and third-party API responses.',
    sections: [
      {
        heading: 'Middleware Caching Pattern in Express',
        content: 'Inspect cache keys on incoming GET requests; if found, respond immediately. If missed, execute the route handler and cache the response asynchronously.',
        code: `import express from "express";
import { createPgbloom } from "pgbloom";

const app = express();
const client = await createPgbloom(process.env.DATABASE_URL!);

app.get("/api/products/:id", async (req, res) => {
  const cacheKey = \`product:\${req.params.id}\`;
  
  // Check cache first
  const cached = await client.getCache(cacheKey);
  if (cached) return res.json(cached);

  // Fetch from database on cache miss
  const product = await fetchProductFromDB(req.params.id);
  await client.setCache(cacheKey, product, 60_000); // 1 min TTL
  
  res.json(product);
});`,
      },
    ],
    relatedSlugs: ['guides/postgresql-caching', 'features/postgresql-cache', 'use-cases/nodejs-applications'],
  },

  'guides/postgresql-cache-javascript': {
    slug: 'guides/postgresql-cache-javascript',
    title: 'JavaScript PostgreSQL Caching: Best Practices',
    category: 'guide',
    h1: 'JavaScript PostgreSQL Caching: Architectural Best Practices',
    metaTitle: 'JavaScript PostgreSQL Caching Best Practices | PGBloom',
    metaDescription: 'Best practices for JavaScript and TypeScript caching on PostgreSQL: serialization performance, connection pooling, and memory optimization.',
    keywords: 'javascript postgresql cache, typescript postgres cache, js caching best practices, pgbloom cache tips',
    canonicalPath: '/guides/postgresql-cache-javascript',
    intro: 'Architectural tips for getting maximum throughput from JavaScript PostgreSQL caching: connection pool tuning, serialization overhead management, and memory efficiency.',
    sections: [
      {
        heading: 'Optimizing JSON Serialization',
        content: 'JSON stringification is CPU-bound in JavaScript runtimes. PGBloom handles JSON serialization efficiently, and using flat object structures minimizes V8 garbage collection pauses.',
      },
      {
        heading: 'Sizing Connection Pools Correctly',
        content: 'Configure your `maxConnections` parameter to balance concurrency against PostgreSQL memory limits. A pool of 10 to 20 connections per Node.js worker process provides optimal throughput.',
      },
    ],
    relatedSlugs: ['guides/postgresql-caching', 'guides/postgresql-cache-nodejs'],
  },

  'guides/cache-invalidation-guide': {
    slug: 'guides/cache-invalidation-guide',
    title: 'Mastering Cache Invalidation in PostgreSQL',
    category: 'guide',
    h1: 'Mastering Cache Invalidation in Distributed PostgreSQL Apps',
    metaTitle: 'PostgreSQL Cache Invalidation Guide | PGBloom Architecture',
    metaDescription: 'Master cache invalidation patterns: write-through, cache-aside, write-behind, and event-driven invalidation using PostgreSQL notifications.',
    keywords: 'cache invalidation guide, cache aside pattern postgresql, write through cache, cache synchronization',
    canonicalPath: '/guides/cache-invalidation-guide',
    intro: 'Stale cache data causes subtle bugs and poor user experiences. This guide explains how to design bulletproof invalidation strategies using Cache-Aside and Event-Driven Pub/Sub patterns.',
    sections: [
      {
        heading: 'The Cache-Aside Pattern with Atomic Database Updates',
        content: 'Always execute database mutations first within a transaction. After the transaction commits successfully, invalidate the cache key. If the database update fails, the cache remains untouched.',
      },
      {
        heading: 'Handling Cascading Invalidation with Wildcard Keys',
        content: 'When updating entities with multiple relationship dependencies, group keys under common namespace prefixes or maintain an entity-to-cache-key registry for clean bulk purges.',
      },
    ],
    relatedSlugs: ['features/cache-invalidation', 'features/postgresql-cache', 'guides/postgresql-caching'],
  },

  'guides/postgresql-pubsub': {
    slug: 'guides/postgresql-pubsub',
    title: 'Building Real-Time Microservices with PostgreSQL Pub/Sub',
    category: 'guide',
    h1: 'Building Real-Time Microservices with PostgreSQL Pub/Sub',
    metaTitle: 'PostgreSQL Pub/Sub Microservices Guide | PGBloom Tutorial',
    metaDescription: 'Connect distributed Node.js microservices with PostgreSQL LISTEN and NOTIFY. Real-time event broadcasting and coordination without message brokers.',
    keywords: 'postgresql pubsub tutorial, postgres listen notify nodejs, realtime microservices postgres, pgbloom subscribe',
    canonicalPath: '/guides/postgresql-pubsub',
    intro: 'Implement real-time microservice coordination without running Kafka or RabbitMQ. PostgreSQL LISTEN/NOTIFY provides instant message passing across separate process boundaries.',
    sections: [
      {
        heading: 'Architecting Notification Hubs',
        content: 'Dedicate a persistent background client for channel listening. Fan out incoming database notifications to WebSockets, Server-Sent Events, or internal service events.',
      },
    ],
    relatedSlugs: ['features/pubsub', 'features/events'],
  },

  'guides/postgresql-distributed-locking': {
    slug: 'guides/postgresql-distributed-locking',
    title: 'Distributed Locking Patterns in PostgreSQL',
    category: 'guide',
    h1: 'Distributed Locking Patterns & Concurrency Control in PostgreSQL',
    metaTitle: 'PostgreSQL Distributed Locking Patterns | PGBloom Guide',
    metaDescription: 'Prevent race conditions with PostgreSQL distributed locks. Learn lease timeouts, token verification, fencing tokens, and deadlock avoidance.',
    keywords: 'distributed locking guide postgres, postgres advisory locks vs table locks, lease timeouts, fencing tokens',
    canonicalPath: '/guides/postgresql-distributed-locking',
    intro: 'When multiple microservice containers execute background tasks simultaneously, distributed locking ensures only one container runs the critical task at any given time.',
    sections: [
      {
        heading: 'Why Lease Timeouts are Essential',
        content: 'Never create locks without automatic TTL expiration. If a process experiences an unhandled exception or server restart while holding a lock, a lease timeout ensures peer workers can recover gracefully.',
      },
    ],
    relatedSlugs: ['features/distributed-locks', 'features/queue'],
  },

  // Comparison Pages
  'comparisons/pgbloom-vs-redis': {
    slug: 'comparisons/pgbloom-vs-redis',
    title: 'PGBloom vs Redis: Architecture & Trade-Offs',
    category: 'comparison',
    h1: 'PGBloom vs Redis: Honest Architectural Comparison & Trade-Offs',
    metaTitle: 'PGBloom vs Redis: Feature Comparison & Trade-Offs | PGBloom',
    metaDescription: 'Comprehensive comparison between PGBloom and Redis. Explore latency, durability, operational complexity, hosting costs, and ideal use cases.',
    keywords: 'pgbloom vs redis, redis alternative postgresql, postgres vs redis caching, redis replacement nodejs',
    canonicalPath: '/comparisons/pgbloom-vs-redis',
    intro: 'Redis is an outstanding in-memory data store, but introducing it adds operational complexity, extra servers, backup orchestration, and multi-system synchronization. PGBloom provides a PostgreSQL-first alternative for teams wanting infrastructure simplicity without sacrificing core capabilities.',
    sections: [
      {
        heading: 'Feature & Operational Matrix',
        content: 'Redis provides pure in-memory execution with sub-millisecond latencies, making it ideal for millions of operations per second. PGBloom uses your existing PostgreSQL database, providing ACID durability, zero extra hosting bills, standard SQL queryability, and automatic transactional rollbacks.',
      },
      {
        heading: 'Latency vs Operational Simplicity',
        content: 'Redis operations typically execute in 0.2ms - 1.0ms. PGBloom PostgreSQL operations typically execute in 1.0ms - 5.0ms over indexed tables with connection pooling. For the vast majority of web applications handling under 10,000 requests per second, the few milliseconds difference is imperceptible, whereas eliminating Redis saves considerable maintenance overhead.',
      },
    ],
    pros: [
      'PGBloom eliminates separate cloud servers, reducing hosting costs by $50 - $500+/month',
      'No cache desynchronization: database rollbacks cleanly undo related operations',
      'Unified backup: database snapshots capture both business data and infrastructure state',
    ],
    cons: [
      'Redis delivers higher raw throughput (100,000+ ops/sec per single instance) due to pure RAM storage',
      'Extreme microsecond latency demands still justify dedicated in-memory clusters',
    ],
    relatedSlugs: ['comparisons/postgresql-cache-vs-redis', 'features/postgresql-cache', 'use-cases/backend-caching'],
  },

  'comparisons/postgresql-cache-vs-redis': {
    slug: 'comparisons/postgresql-cache-vs-redis',
    title: 'PostgreSQL Cache vs Redis: Choosing the Right Data Store',
    category: 'comparison',
    h1: 'PostgreSQL Cache vs Redis: Detailed Engineering Evaluation',
    metaTitle: 'PostgreSQL Cache vs Redis: Performance & Cost Analysis | PGBloom',
    metaDescription: 'Detailed evaluation of PostgreSQL caching vs Redis. When to keep caching in PostgreSQL and when a dedicated Redis cluster is warranted.',
    keywords: 'postgresql cache vs redis, should i use redis or postgres, postgres as cache, redis cost vs postgres',
    canonicalPath: '/comparisons/postgresql-cache-vs-redis',
    intro: 'Choosing between caching in PostgreSQL versus deploying a Redis cluster is an architectural decision with significant long-term implications. This guide analyzes performance, maintenance, and reliability trade-offs.',
    sections: [
      {
        heading: 'When to Use PostgreSQL Caching (PGBloom)',
        content: 'Choose PostgreSQL caching if: you already run PostgreSQL in production; your dataset fits comfortably in database memory; you want transactions spanning data and queues; you want to reduce DevOps maintenance; or you want to query cache state using SQL.',
      },
      {
        heading: 'When to Deploy a Dedicated Redis Cluster',
        content: 'Choose Redis if: your application requires hundreds of thousands of operations per second; cache eviction must happen entirely in RAM with no disk write amplification; or your application requires specialized Redis data types like Geospatial indexes or HyperLogLog.',
      },
    ],
    relatedSlugs: ['comparisons/pgbloom-vs-redis', 'features/postgresql-cache', 'guides/postgresql-caching'],
  },

  // Use Case Pages
  'use-cases/backend-caching': {
    slug: 'use-cases/backend-caching',
    title: 'Backend Caching Patterns with PostgreSQL & PGBloom',
    category: 'use-case',
    h1: 'Backend Caching Patterns with PostgreSQL & PGBloom',
    metaTitle: 'Backend Caching Patterns & Architectures | PGBloom',
    metaDescription: 'Explore real-world backend caching patterns: third-party API response caching, expensive query aggregation caching, and session storage in PostgreSQL.',
    keywords: 'backend caching patterns, postgresql session storage, api response caching, database query cache',
    canonicalPath: '/use-cases/backend-caching',
    intro: 'Explore production-proven backend caching patterns implemented in PGBloom: query result memoization, external API throttling mitigation, and resilient user session stores.',
    sections: [
      {
        heading: 'Pattern 1: Caching Expensive Aggregation Queries',
        content: 'Analytics queries and dashboard statistics often execute multi-table joins. Cache calculated metrics for 5 to 15 minutes to dramatically reduce CPU load on database primary replicas.',
      },
      {
        heading: 'Pattern 2: Third-Party Rate Limit Buffering',
        content: 'When consuming rate-limited third-party APIs (such as payment gateways, weather services, or geocoding services), cache results by parameter hash to ensure your application stays well within upstream quotas.',
      },
    ],
    relatedSlugs: ['use-cases/nodejs-applications', 'features/postgresql-cache', 'guides/postgresql-caching'],
  },

  'use-cases/nodejs-applications': {
    slug: 'use-cases/nodejs-applications',
    title: 'PostgreSQL Infrastructure for Node.js Applications',
    category: 'use-case',
    h1: 'Full-Stack Node.js Application Architecture with PGBloom',
    metaTitle: 'PostgreSQL Infrastructure for Node.js Applications | PGBloom',
    metaDescription: 'How modern Node.js applications use PGBloom to power background queues, caching, rate limiting, and distributed locking on PostgreSQL.',
    keywords: 'nodejs postgresql infrastructure, microservices postgresql, node.js backend architecture, pgbloom use cases',
    canonicalPath: '/use-cases/nodejs-applications',
    intro: 'Modern Node.js applications require background tasks, rate limiting, and caching. Learn how PGBloom unifies all these requirements under a single operational roof.',
    sections: [
      {
        heading: 'Unified Operational Boundary',
        content: 'By consolidating caching, queues, locks, and Pub/Sub into PostgreSQL, developers need only monitor, secure, and back up a single PostgreSQL cluster. CI/CD test pipelines can spin up a single `postgres:16` Docker container to test all infrastructure components faithfully.',
      },
    ],
    relatedSlugs: ['use-cases/backend-caching', 'guides/postgresql-cache-nodejs', 'pgbloom-npm'],
  },
}
