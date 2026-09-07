import { useState } from 'react'
import './Docs.css'

const sections = [
  { id: 'what-is-pgbloom', label: 'What is PGBloom' },
  { id: 'why-pgbloom', label: 'Why PGBloom' },
  { id: 'evolution', label: 'Evolution' },
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'postgresql', label: 'PostgreSQL' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'crud', label: 'CRUD' },
  { id: 'cache', label: 'Cache' },
  { id: 'ssdiskdb', label: 'SSDiskDB' },
  { id: 'bloom-filter', label: 'Bloom Filter' },
  { id: 'locks', label: 'Locks' },
  { id: 'queues', label: 'Queues' },
  { id: 'pubsub', label: 'Pub/Sub' },
  { id: 'events', label: 'Events' },
]

export default function Docs() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="docs-layout">
      <nav className="navbar" id="navbar">
        <a href="#" className="nav-brand">
          <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
            <rect width="28" height="28" rx="6" fill="#6366f1"/>
            <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          PGBloom
        </a>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
          <a href="#quick-start">Quick Start</a>
          <a href="#api">API</a>
          <a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener" className="btn-nav">JSR</a>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
      </nav>

      <div className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-label">Getting Started</div>
          {sections.slice(0, 5).map(s => (
            <a key={s.id} href={`#${s.id}`} data-nav onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Foundation</div>
          {sections.slice(5, 8).map(s => (
            <a key={s.id} href={`#${s.id}`} data-nav onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Data Layer</div>
          {sections.slice(8, 12).map(s => (
            <a key={s.id} href={`#${s.id}`} data-nav onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Infrastructure</div>
          {sections.slice(12).map(s => (
            <a key={s.id} href={`#${s.id}`} data-nav onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="content">
          <SectionHero />
          <SectionWhatIs />
          <SectionWhy />
          <SectionEvolution />
          <SectionInstall />
          <SectionQuickStart />
          <SectionPostgres />
          <SectionArchitecture />
          <SectionConfig />
          <SectionCRUD />
          <SectionCache />
          <SectionSSDiskDB />
          <SectionBloom />
          <SectionLocks />
          <SectionQueues />
          <SectionPubSub />
          <SectionEvents />
          <Footer />
        </div>
      </main>

      <button className="search-hint" onClick={() => setSearchOpen(!searchOpen)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        Search <kbd>Ctrl+K</kbd>
      </button>

      {searchOpen && (
        <div className="search-overlay visible" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <input type="text" className="search-input" placeholder="Search documentation..." autoFocus />
            <div className="search-results">
              {sections.map(s => (
                <div key={s.id} className="search-result" onClick={() => { setSearchOpen(false); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }) }}>
                  <div className="search-result-title">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHero() {
  return (
    <section className="section section-hero" id="features">
      <div className="hero-badge">
        <span className="dot" />
        v1.6.0 — Production Ready
      </div>
      <h1 className="hero-title">PGBloom</h1>
      <p className="hero-subtitle">
        PostgreSQL-first infrastructure toolkit for JavaScript & TypeScript. Caching, Pub/Sub, queues,
        distributed locks, leader election, scheduling, rate limiting, events, counters, Bloom filters,
        CRUD models, authentication, and OTP.
      </p>
      <div className="hero-actions">
        <a href="#quick-start" className="btn btn-primary">Quick Start</a>
        <a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener" className="btn btn-secondary">View on JSR</a>
      </div>
      <div className="hero-chips">
        <span className="chip">PostgreSQL</span>
        <span className="chip">TypeScript</span>
        <span className="chip">Node.js</span>
        <span className="chip">Edge Runtime</span>
      </div>
    </section>
  )
}

function SectionWhatIs() {
  return (
    <section className="section" id="what-is-pgbloom">
      <h2 className="section-title">What is PGBloom?</h2>
      <p className="section-subtitle">A developer-first infrastructure layer for PostgreSQL.</p>
      <p>PGBloom is a PostgreSQL-native infrastructure toolkit that provides everything you need to build robust backend services without relying on Redis, RabbitMQ, or other external systems. It uses PostgreSQL as the single source of truth for all your infrastructure needs.</p>
      <div className="card-grid">
        {[
          { icon: '🗄️', color: 'purple', title: 'CRUD Models', desc: 'Type-safe database operations with automatic schema management and query building.' },
          { icon: '⚡', color: 'green', title: 'Caching', desc: 'Intelligent caching layer with TTL, invalidation, and cache-aside patterns.' },
          { icon: '📨', color: 'amber', title: 'Pub/Sub', desc: 'Real-time publish/subscribe messaging using PostgreSQL LISTEN/NOTIFY.' },
          { icon: '🔄', color: 'cyan', title: 'Queues', desc: 'Reliable job queues with retries, dead-letter queues, and scheduled jobs.' },
          { icon: '🔒', color: 'rose', title: 'Distributed Locks', desc: 'Advisory lock-based distributed locking for coordination across processes.' },
          { icon: '👑', color: 'purple', title: 'Leader Election', desc: 'Election-based leader selection for high-availability systems.' },
          { icon: '📅', color: 'green', title: 'Scheduling', desc: 'Cron-like job scheduling powered by PostgreSQL.' },
          { icon: '🚦', color: 'amber', title: 'Rate Limiting', desc: 'Token bucket and sliding window rate limiters stored in PostgreSQL.' },
        ].map((f, i) => (
          <div key={i} className="card">
            <div className={`card-icon ${f.color}`}>{f.icon}</div>
            <div className="card-title">{f.title}</div>
            <div className="card-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionWhy() {
  return (
    <section className="section" id="why-pgbloom">
      <h2 className="section-title">Why PGBloom?</h2>
      <p className="section-subtitle">Simplify your stack by leveraging PostgreSQL for everything.</p>
      <div className="card-grid">
        {[
          { title: 'Single Dependency', desc: 'Replace Redis, RabbitMQ, BullMQ, and other tools with just PostgreSQL.' },
          { title: 'Type-Safe', desc: 'Full TypeScript support with generated types and compile-time checking.' },
          { title: 'Edge Compatible', desc: 'Works in edge runtimes (Cloudflare Workers, Vercel Edge, Deno).' },
          { title: 'Zero Infrastructure', desc: 'No separate servers to manage. Your database is your infrastructure.' },
          { title: 'Battle Tested', desc: 'Production-ready with comprehensive test coverage and integration tests.' },
          { title: 'Lightweight', desc: 'Minimal dependencies, small bundle size, fast startup time.' },
        ].map((f, i) => (
          <div key={i} className="card">
            <div className="card-icon green">✓</div>
            <div className="card-title">{f.title}</div>
            <div className="card-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionEvolution() {
  return (
    <section className="section" id="evolution">
      <h2 className="section-title">Evolution</h2>
      <p className="section-subtitle">The journey from pgbloom to PGBloom.</p>
      <div className="timeline">
        {[
          { title: '2024 — Initial Release', desc: 'First release of pgbloom with caching and Pub/Sub support.' },
          { title: '2025 — Expansion', desc: 'Added queues, locks, leader election, and scheduling.' },
          { title: '2026 — v1.6.0', desc: 'Full infrastructure toolkit: Bloom filters, rate limiting, OTP, CRUD models, and more.' },
        ].map((item, i) => (
          <div key={i} className="timeline-item">
            <div className="timeline-title">{item.title}</div>
            <div className="timeline-desc">{item.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionInstall() {
  return (
    <section className="section" id="installation">
      <h2 className="section-title">Installation</h2>
      <p className="section-subtitle">Get started in seconds with your preferred package manager.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText('npm install pgbloom')}>Copy</button>
        </div>
        <pre><code>npm install pgbloom</code></pre>
      </div>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText('bun install pgbloom')}>Copy</button>
        </div>
        <pre><code>bun install pgbloom</code></pre>
      </div>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText('pnpm add pgbloom')}>Copy</button>
        </div>
        <pre><code>pnpm add pgbloom</code></pre>
      </div>
      <p>Requires Node.js <code>&gt;=18</code> and PostgreSQL <code>&gt;=14</code>.</p>
    </section>
  )
}

function SectionQuickStart() {
  return (
    <section className="section" id="quick-start">
      <h2 className="section-title">Quick Start</h2>
      <p className="section-subtitle">Get up and running in under 5 minutes.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(quickStartCode)}>Copy</button>
        </div>
        <pre><code>{quickStartCode}</code></pre>
      </div>
    </section>
  )
}

function SectionPostgres() {
  return (
    <section className="section" id="postgresql">
      <h2 className="section-title">PostgreSQL Foundation</h2>
      <p className="section-subtitle">Built entirely on PostgreSQL — no external dependencies.</p>
      <p>PGBloom uses PostgreSQL as its backbone for all operations. Key PostgreSQL features leveraged include:</p>
      <div className="card-grid">
        {[
          { icon: '📡', color: 'purple', title: 'LISTEN/NOTIFY', desc: 'Real-time event notifications for Pub/Sub and event-driven architecture.' },
          { icon: '🔑', color: 'green', title: 'Advisory Locks', desc: 'Lightweight distributed locks using pg_advisory_lock functions.' },
          { icon: '📊', color: 'cyan', title: 'Tables & Indexes', desc: 'Optimized schema for caching, queues, rate limiting, and more.' },
          { icon: '⏱️', color: 'amber', title: 'pg_cron / pgAgent', desc: 'Job scheduling via PostgreSQL extensions or application-level timers.' },
        ].map((f, i) => (
          <div key={i} className="card">
            <div className={`card-icon ${f.color}`}>{f.icon}</div>
            <div className="card-title">{f.title}</div>
            <div className="card-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionArchitecture() {
  return (
    <section className="section" id="architecture">
      <h2 className="section-title">Architecture</h2>
      <p className="section-subtitle">How PGBloom layers on PostgreSQL.</p>
      <div className="arch-diagram">
        <svg viewBox="0 0 700 200" className="arch-svg">
          <rect x="10" y="60" width="130" height="80" rx="8" fill="#6366f1" opacity="0.2" stroke="#6366f1"/>
          <text x="75" y="95" textAnchor="middle" fill="#e8e8f0" fontSize="13" fontWeight="600">Your App</text>
          <text x="75" y="115" textAnchor="middle" fill="#a0a0b8" fontSize="11">TypeScript / JS</text>

          <text x="160" y="105" textAnchor="middle" fill="#a0a0b8" fontSize="18">→</text>

          <rect x="180" y="30" width="150" height="140" rx="8" fill="#22c55e" opacity="0.15" stroke="#22c55e"/>
          <text x="255" y="60" textAnchor="middle" fill="#22c55e" fontSize="13" fontWeight="600">PGBloom</text>
          <text x="255" y="82" textAnchor="middle" fill="#a0a0b8" fontSize="10">Cache</text>
          <text x="255" y="100" textAnchor="middle" fill="#a0a0b8" fontSize="10">Pub/Sub</text>
          <text x="255" y="118" textAnchor="middle" fill="#a0a0b8" fontSize="10">Queues / Locks</text>
          <text x="255" y="136" textAnchor="middle" fill="#a0a0b8" fontSize="10">Rate Limit / Auth</text>

          <text x="350" y="105" textAnchor="middle" fill="#a0a0b8" fontSize="18">→</text>

          <rect x="370" y="60" width="130" height="80" rx="8" fill="#06b6d4" opacity="0.2" stroke="#06b6d4"/>
          <text x="435" y="95" textAnchor="middle" fill="#e8e8f0" fontSize="13" fontWeight="600">PostgreSQL</text>
          <text x="435" y="115" textAnchor="middle" fill="#a0a0b8" fontSize="11">LISTEN/NOTIFY</text>
          <text x="435" y="130" textAnchor="middle" fill="#a0a0b8" fontSize="11">Advisory Locks</text>
        </svg>
      </div>
    </section>
  )
}

function SectionConfig() {
  return (
    <section className="section" id="configuration">
      <h2 className="section-title">Configuration</h2>
      <p className="section-subtitle">Connect PGBloom to your PostgreSQL database.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(configCode)}>Copy</button>
        </div>
        <pre><code>{configCode}</code></pre>
      </div>
    </section>
  )
}

function SectionCRUD() {
  return (
    <section className="section" id="crud">
      <h2 className="section-title">CRUD</h2>
      <p className="section-subtitle">Type-safe database operations with automatic schema management.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(crudCode)}>Copy</button>
        </div>
        <pre><code>{crudCode}</code></pre>
      </div>
    </section>
  )
}

function SectionCache() {
  return (
    <section className="section" id="cache">
      <h2 className="section-title">Cache</h2>
      <p className="section-subtitle">High-performance caching backed by PostgreSQL.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(cacheCode)}>Copy</button>
        </div>
        <pre><code>{cacheCode}</code></pre>
      </div>
    </section>
  )
}

function SectionSSDiskDB() {
  return (
    <section className="section" id="ssdiskdb">
      <h2 className="section-title">SSDiskDB</h2>
      <p className="section-subtitle">Persistent disk-based storage for large datasets.</p>
      <p>SSDiskDB provides a simple key-value store backed by SQLite-compatible on-disk storage, ideal for caching large datasets that don't fit in memory.</p>
      <div className="badge badge-green">Disk-backed</div>{' '}
      <div className="badge badge-purple">Persistent</div>{' '}
      <div className="badge badge-cyan">Fast Lookups</div>
    </section>
  )
}

function SectionBloom() {
  return (
    <section className="section" id="bloom-filter">
      <h2 className="section-title">Bloom Filter</h2>
      <p className="section-subtitle">Probabilistic data structures for membership testing.</p>
      <p>Bloom filters let you test whether an element is a member of a set with no false negatives and configurable false-positive rates — all stored in PostgreSQL.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(bloomCode)}>Copy</button>
        </div>
        <pre><code>{bloomCode}</code></pre>
      </div>
    </section>
  )
}

function SectionLocks() {
  return (
    <section className="section" id="locks">
      <h2 className="section-title">Distributed Locks</h2>
      <p className="section-subtitle">Coordinate access across processes using PostgreSQL advisory locks.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(lockCode)}>Copy</button>
        </div>
        <pre><code>{lockCode}</code></pre>
      </div>
    </section>
  )
}

function SectionQueues() {
  return (
    <section className="section" id="queues">
      <h2 className="section-title">Queues</h2>
      <p className="section-subtitle">Reliable job queues with retries, scheduling, and dead-letter handling.</p>
      <p>PGBloom queues use PostgreSQL tables for job storage, providing durability and visibility into queue state.</p>
      <div className="card-grid">
        {[
          { icon: '✅', color: 'green', title: 'At-least-once Delivery', desc: 'Jobs are reliably stored and retried until acknowledged.' },
          { icon: '⏰', color: 'amber', title: 'Delayed Jobs', desc: 'Schedule jobs to run after a delay or at a specific time.' },
          { icon: '💀', color: 'rose', title: 'Dead Letter Queue', desc: 'Failed jobs are moved to a DLQ for inspection and replay.' },
          { icon: '🔁', color: 'cyan', title: 'Auto Retry', desc: 'Configurable retry policies with exponential backoff.' },
        ].map((f, i) => (
          <div key={i} className="card">
            <div className={`card-icon ${f.color}`}>{f.icon}</div>
            <div className="card-title">{f.title}</div>
            <div className="card-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SectionPubSub() {
  return (
    <section className="section" id="pubsub">
      <h2 className="section-title">Pub/Sub</h2>
      <p className="section-subtitle">Real-time messaging using PostgreSQL LISTEN/NOTIFY.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(pubsubCode)}>Copy</button>
        </div>
        <pre><code>{pubsubCode}</code></pre>
      </div>
    </section>
  )
}

function SectionEvents() {
  return (
    <section className="section" id="events">
      <h2 className="section-title">Events</h2>
      <p className="section-subtitle">Event-driven architecture with type-safe event payloads.</p>
      <p>The events module provides a type-safe event emitter pattern backed by PostgreSQL. Emit events, subscribe to patterns, and build event-driven workflows.</p>
      <div className="badge badge-purple">Type-safe</div>{' '}
      <div className="badge badge-green">Persistent</div>{' '}
      <div className="badge badge-cyan">Pattern Matching</div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="https://github.com/manojgowdain/pgsnap" target="_blank" rel="noopener">GitHub</a>
        <a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener">JSR</a>
        <a href="https://github.com/manojgowdain/pgsnap/issues" target="_blank" rel="noopener">Issues</a>
      </div>
      <p>© 2026 PGBloom — MIT License</p>
    </footer>
  )
}

const quickStartCode = `import { PGBloom } from 'pgbloom';

const bloom = new PGBloom({
  connectionString: 'postgresql://user:pass@localhost:5432/mydb'
});

// Use caching
await bloom.cache.set('user:1', { name: 'Manoj' }, 3600);

// Publish/Subscribe
bloom.pubsub.subscribe('notifications', (msg) => {
  console.log('Received:', msg);
});
bloom.pubsub.publish('notifications', { text: 'Hello!' });

// Distributed lock
const lock = await bloom.locks.acquire('my-lock');
try {
  // Critical section
} finally {
  await lock.release();
}`

const configCode = `import { PGBloom } from 'pgbloom';

const bloom = new PGBloom({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgbloom',        // Custom schema (default: public)
  prefix: 'pgb_',           // Table prefix
  pool: {
    max: 20,
    idleTimeoutMillis: 30000,
  }
});`

const crudCode = `import { createModel } from 'pgbloom/crud';

const User = createModel({
  table: 'users',
  primaryKey: 'id',
  fields: {
    id: { type: 'uuid', default: 'gen_random_uuid()' },
    name: { type: 'text', required: true },
    email: { type: 'text', unique: true },
    createdAt: { type: 'timestamp', default: 'now()' },
  }
});

// Create
const user = await User.create({ name: 'Manoj', email: 'm@example.com' });

// Find
const found = await User.findById(user.id);
const all = await User.findMany({ where: { name: 'Manoj' } });

// Update
await User.update(user.id, { name: 'Manoj G' });

// Delete
await User.delete(user.id);`

const cacheCode = `import { cache } from 'pgbloom';

// Set with TTL (seconds)
await cache.set('key', value, 3600);

// Get
const cached = await cache.get('key');

// Get or compute
const result = await cache.getOrCompute('key', async () => {
  return await expensiveOperation();
}, 3600);

// Delete
await cache.delete('key');

// Check exists
const exists = await cache.has('key');`

const bloomCode = `import { bloom } from 'pgbloom';

// Add to filter
await bloom.add('email', 'user@example.com');

// Check membership (false positive possible, never false negative)
const exists = await bloom.has('email', 'user@example.com');

// Create a named filter
await bloom.createFilter('url-filter', { capacity: 10000, errorRate: 0.01 });
await bloom.addTo('url-filter', 'https://example.com');
const isVisited = await bloom.has('url-filter', 'https://example.com');`

const lockCode = `import { locks } from 'pgbloom';

// Acquire a lock
const lock = await locks.acquire('my-resource', {
  ttl: 30000,        // Auto-release after 30s
  retries: 3,        // Retry if locked
  retryDelay: 1000,  // ms between retries
});

try {
  // Critical section - only one process here at a time
  await doWork();
} finally {
  await lock.release();
}

// Non-blocking try-lock
const tryLock = await locks.tryAcquire('my-resource');
if (tryLock) {
  try {
    await doWork();
  } finally {
    await tryLock.release();
  }
}`

const pubsubCode = `import { pubsub } from 'pgbloom';

// Subscribe to a channel
const subscription = pubsub.subscribe('orders', (message) => {
  console.log('New order:', message.payload);
});

// Publish to a channel
await pubsub.publish('orders', {
  type: 'order.created',
  payload: { id: '123', total: 99.99 }
});

// Unsubscribe
subscription.unsubscribe();`

export {}
