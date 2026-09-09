import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import './AIAgentDocs.css'

type DocumentEntry = {
  slug: string
  title: string
  type: string
  description: string
}

const documents: DocumentEntry[] = [
  ['overview', 'Overview', 'overview', 'Project purpose, runtime model, and actual feature inventory.'],
  ['installation', 'Installation', 'setup', 'Package installation, PostgreSQL requirements, and runtime support.'],
  ['quickstart', 'Quickstart', 'guide', 'Minimal server setup and first operations.'],
  ['architecture', 'Architecture', 'architecture', 'Client, PostgreSQL, local storage, browser boundaries, and lifecycle.'],
  ['configuration', 'Configuration', 'configuration', 'PgbloomOptions and subsystem defaults.'],
  ['api', 'API Inventory', 'api', 'Public package exports and high-level client methods.'],
  ['cache', 'Cache', 'feature', 'TTL cache operations and optional Bloom lookup optimization.'],
  ['pubsub', 'Pub/Sub', 'feature', 'PostgreSQL LISTEN/NOTIFY channel messaging.'],
  ['queue', 'Queue', 'feature', 'Priority jobs, visibility timeouts, retries, and claims.'],
  ['locks', 'Locks', 'feature', 'TTL distributed locks and leader election.'],
  ['scheduler', 'Scheduler', 'feature', 'Delayed and recurring jobs with worker claims.'],
  ['rate-limit', 'Rate Limiting', 'feature', 'Fixed-window, sliding-window, and token-bucket limits.'],
  ['events', 'Events', 'feature', 'Persistent events, notifications, history, and replay.'],
  ['counters', 'Counters', 'feature', 'Atomic counters and strong, local, or eventual reads.'],
  ['model', 'Model / CRUD', 'feature', 'Schema-driven PostgreSQL CRUD models.'],
  ['auth', 'Authentication', 'feature', 'Passwords, JWTs, sessions, and OTP workflows.'],
  ['bloom-filter', 'Bloom Filter', 'feature', 'Runtime-independent counting Bloom filter and hash helpers.'],
  ['storage', 'Storage', 'feature', 'SSDiskDB local persistence and in-memory LRU/TTL caching.'],
  ['browser', 'Browser', 'feature', 'Browser-safe entrypoint and server boundary.'],
  ['testing', 'Testing', 'operations', 'Unit, integration, package, persistence, and documentation checks.'],
  ['deployment', 'Deployment', 'operations', 'Production runtime, secrets, database, and Pages deployment.'],
  ['troubleshooting', 'Troubleshooting', 'operations', 'Common startup, runtime, database, and feature failures.'],
  ['examples', 'Examples', 'examples', 'Executable patterns using the actual exported API.'],
  ['playground', 'Interactive Playground', 'tool', 'Controlled browser execution for browser-safe PGBloom APIs with measured traces.'],
].map(([slug, title, type, description]) => ({ slug, title, type, description }))

const details: Record<string, { overview: string; api: string; example: string }> = {
  overview: {
    overview: 'PGBloom is a PostgreSQL-first toolkit for cache, messaging, jobs, coordination, models, authentication, and local utilities. PostgreSQL is the source of truth for durable features.',
    api: 'createPgbloom(connectionString, options?) creates the server client. Package, server, browser, and JSR entrypoints define different runtime boundaries.',
    example: 'Application -> PGBloom client -> PostgreSQL',
  },
  installation: {
    overview: 'Install pgbloom from npm or @manojgowdain/pgbloom from JSR in Node.js 18+ or another Node-compatible runtime with PostgreSQL.',
    api: 'npm install pgbloom, then await createPgbloom(process.env.DATABASE_URL!). Pure browser and pure Deno server imports are unsupported.',
    example: 'import { createPgbloom } from "pgbloom";\nconst client = await createPgbloom(process.env.DATABASE_URL!);',
  },
  cache: {
    overview: 'Cache values are serialized into PostgreSQL with expiry timestamps. PostgreSQL remains authoritative; the optional Bloom filter only skips definite misses.',
    api: 'setCache<T>(key, value, expiry?), getCache<T>(key), deleteCache(key), clearCache(), clearExpiredCache().',
    example: 'await client.setCache("user:42", { name: "Ada" }, 60_000);\nconst user = await client.getCache("user:42");',
  },
  pubsub: {
    overview: 'Pub/Sub uses PostgreSQL LISTEN/NOTIFY for low-latency, non-durable channel messages.',
    api: 'publish(channel, payload) and subscribe(channel, handler) -> Promise<() => void>. Handler failures are ignored by the listener.',
    example: 'const unsubscribe = await client.subscribe("notifications", (channel, payload) => console.log(channel, payload));\nawait client.publish("notifications", { kind: "welcome" });\nawait unsubscribe();',
  },
  queue: {
    overview: 'Queues persist priority jobs in PostgreSQL and claim work with FOR UPDATE SKIP LOCKED, visibility timeouts, and retry limits.',
    api: 'enqueue, dequeue, completeJob, failJob, getQueueStats, and cleanupJobs. Options include priority, maxAttempts, and visibilityTimeout.',
    example: 'const job = await client.enqueue("emails", { to: "ada@example.com" });\nconst next = await client.dequeue("emails");\nif (next) await client.completeJob(next.id);',
  },
  locks: {
    overview: 'Locks use PostgreSQL rows with owners and TTLs. Leader election is implemented as a renewing lock on leader:<resource>.',
    api: 'tryLock, lock, unlock, acquireLeadership, releaseLeadership, isLeader, renewLeadership, getLockInfo, and extendLock.',
    example: 'const acquired = await client.tryLock("resource:42");\nif (acquired) { /* critical section */ }',
  },
  scheduler: {
    overview: 'The scheduler persists delayed and recurring jobs and claims due work with row locking. It does not start worker processes automatically.',
    api: 'schedule, scheduleRecurring, cancelSchedule, getSchedule, listSchedules, and standalone claim/complete/fail functions.',
    example: 'await client.schedule("send-report", { userId: 42 }, new Date(Date.now() + 60_000));',
  },
  'rate-limit': {
    overview: 'Rate limiting stores shared request state in PostgreSQL using fixed-window, sliding-window, and token-bucket algorithms.',
    api: 'rateLimit(key, limit, windowMs) and rateLimitTokenBucket(key, capacity, refillRate) return allowed, limit, remaining, and resetAt.',
    example: 'const result = await client.rateLimit("user:42", 100, 60_000);\nif (!result.allowed) throw new Error("rate limited");',
  },
  events: {
    overview: 'Events are persisted in PostgreSQL and delivered through LISTEN/NOTIFY, with history filters, cursors, and replay.',
    api: 'emit, listen, getEventHistory, replayEvents, and closeEvents.',
    example: 'const id = await client.emit("user.created", { userId: 42 });',
  },
  counters: {
    overview: 'Counters use atomic PostgreSQL updates and support strong, local, and eventual reads.',
    api: 'increment, decrement, add, subtract, getCounter, setCounter, removeCounter, listCounters, and clearAllCounters.',
    example: 'await client.increment("page_views");\nconst current = await client.getCounter("page_views", { consistency: "strong" });',
  },
  model: {
    overview: 'Models map declared schemas to PostgreSQL tables and provide validated CRUD, filtering, updates, deletes, indexes, and timestamps.',
    api: 'client.model(tableName, schema?, options?) returns Model with create, find, update, delete, createTable, and syncIndexes methods.',
    example: 'const users = client.model("app_users", { email: { type: "string", required: true } });\nawait users.create({ email: "ada@example.com" });',
  },
  auth: {
    overview: 'Authentication provides Argon2id passwords, HS256 access and refresh JWTs, sessions, logout, password reset, and OTP flows.',
    api: 'client.auth(options?) returns Auth with signup, login, logout, refreshToken, verifyToken, me, password-reset, OTP, and cleanup methods. Authorization middleware is not included.',
    example: 'const auth = client.auth({ jwtSecret: process.env.JWT_SECRET });\nconst result = await auth.login({ email, password });\nconst user = await auth.me(result.accessToken);',
  },
  'bloom-filter': {
    overview: 'BloomFilter is a runtime-independent counting Bloom filter. It never returns false negatives but may return false positives.',
    api: 'new BloomFilter(options), add, has, clear, size, toJSON, fromJSON, encodeValue, fnv1a, xorshift32, and hashPair.',
    example: 'const filter = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });\nfilter.add("user:42");\nfilter.has("user:42");',
  },
  storage: {
    overview: 'Storage provides SSDiskDB-backed local persistence and a MemoryCache LRU/TTL layer. It is separate from the PostgreSQL cache.',
    api: 'createLocalStore, SSDiskStore, and MemoryCache. LocalStore provides get, set, delete, has, clear, and close.',
    example: 'const store = await createLocalStore({ path: "./.pgbloom" });\nawait store.set("session:42", { active: true });',
  },
  browser: {
    overview: 'The pgbloom/browser entrypoint is dependency-free and exposes only Bloom, serialization, and validation utilities.',
    api: 'BloomFilter, serialize, deserialize, validateKey, MAX_KEY_LENGTH, and hash helpers. Database features require a backend over HTTP/RPC.',
    example: 'import { BloomFilter, serialize, deserialize } from "pgbloom/browser";',
  },
}

const fallbackDetail = (entry: DocumentEntry) => ({
  overview: `${entry.description} The source of truth is the TypeScript implementation in src/ and behavior is covered by test/.`,
  api: `See the ${entry.title} implementation and the API inventory for exported functions, parameters, return values, errors, and concurrency behavior.`,
  example: 'See the executable example on this page and the related documentation links below.',
})

function documentUrl(slug: string) {
  return `/aiagent/${slug === 'api' ? 'api/' : slug}`
}

function IndexPage() {
  return (
    <AgentShell title="AI Agent Documentation" category="index">
      <p>PGBloom is a PostgreSQL-first infrastructure toolkit for JavaScript and TypeScript.</p>
      <h2>Documentation tree</h2>
      <div className="agent-document-grid">
        {documents.map((document) => (
          <Link className="agent-document-card" key={document.slug} to={documentUrl(document.slug)}>
            <strong>{document.title}</strong>
            <span>{document.description}</span>
          </Link>
        ))}
      </div>
      <h2>Machine-readable indexes</h2>
      <p><a href="/aiagent/index.json">index.json</a> | <a href="/aiagent/llms.txt">llms.txt</a> | <a href="/aiagent/llms-full.txt">llms-full.txt</a></p>
    </AgentShell>
  )
}

function DocumentPage({ entry }: { entry: DocumentEntry }) {
  const detail = details[entry.slug] ?? fallbackDetail(entry)
  return (
    <AgentShell title={entry.title} category={entry.type}>
      <p>{entry.description}</p>
      <h2>What it is and why it exists</h2>
      <p>{detail.overview}</p>
      <h2>When to use it</h2>
      <p>Use this feature when its documented runtime, durability, concurrency, and failure model matches the application. PostgreSQL-backed features require a server runtime and an initialized PostgreSQL database.</p>
      <h2>When not to use it</h2>
      <p>Do not use it outside its runtime boundary, as a security decision, or as a replacement for a stronger external system when its documented delivery and durability model is insufficient.</p>
      <h2>Public API</h2>
      <p><code>{detail.api}</code></p>
      <h2>Errors, concurrency, and failure scenarios</h2>
      <p>Invalid inputs use the relevant PGBloom validation or configuration error. Database failures propagate as database errors. TTLs, transactions, row locks, listener connections, atomic updates, process termination, and database outages are part of the documented behavior.</p>
      <h2>Example</h2>
      <pre><code>{detail.example}</code></pre>
      <h2>Related documentation</h2>
      <ul>{documents.filter((related) => related.slug !== entry.slug).slice(0, 6).map((related) => <li key={related.slug}><Link to={documentUrl(related.slug)}>{related.title}</Link></li>)}</ul>
    </AgentShell>
  )
}

function AgentShell({ title, category, children }: { title: string; category: string; children: React.ReactNode }) {
  const location = useLocation()

  return (
    <main className="agent-shell">
      <nav className="agent-nav"><Link to="/aiagent/">AI index</Link><Link to="/aiagent/api/">API inventory</Link><Link to="/">Interactive docs</Link></nav>
      <p className="agent-meta"><strong>Canonical URL:</strong> {location.pathname} | <strong>Category:</strong> {category}</p>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export default function AIAgentDocs() {
  const { slug } = useParams()
  if (!slug) return <IndexPage />
  const entry = documents.find((document) => document.slug === slug)
  if (!entry) return <Navigate replace to="/aiagent/" />
  return <DocumentPage entry={entry} />
}