import { useState } from 'react'
import './Docs.css'

const sections = [
  { id: 'what-is-pgbloom', label: 'What is PGBloom' },
  { id: 'installation', label: 'Installation' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'browser-api', label: 'Browser API' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'cache', label: 'Cache' },
  { id: 'crud', label: 'CRUD Models' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'pubsub', label: 'Pub/Sub' },
  { id: 'queue', label: 'Queue' },
  { id: 'locks', label: 'Locks' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'rate-limiting', label: 'Rate Limiting' },
  { id: 'events', label: 'Events' },
  { id: 'counters', label: 'Counters' },
  { id: 'bloom-filter', label: 'Bloom Filter' },
  { id: 'local-storage', label: 'Local Storage' },
  { id: 'errors', label: 'Errors & Security' },
  { id: 'runtimes', label: 'Runtimes' },
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
          <a href="#quick-start">Quick Start</a>
          <a href="#features">Features</a>
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
          {sections.slice(0, 4).map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Configuration</div>
          {sections.slice(4, 5).map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">APIs</div>
          {sections.slice(5, 14).map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Advanced</div>
          {sections.slice(14).map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setMobileOpen(false)}>{s.label}</a>
          ))}
        </div>
      </aside>

      <main className="main">
        <div className="content">
          <SectionHero />
          <SectionWhatIs />
          <SectionInstallNpm />
          <SectionInstallJsr />
          <SectionInstallGit />
          <SectionQuickStart />
          <SectionBrowserApi />
          <SectionConfiguration />
          <SectionCache />
          <SectionCrud />
          <SectionAuthentication />
          <SectionPubSub />
          <SectionQueue />
          <SectionLocks />
          <SectionScheduler />
          <SectionRateLimit />
          <SectionEvents />
          <SectionCounters />
          <SectionBloomFilter />
          <SectionLocalStorage />
          <SectionErrors />
          <SectionRuntimes />
          <SectionPublishing />
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
        A lightweight PostgreSQL-backed Cache, Pub/Sub, Queue, Locks, Scheduler, Rate Limiting, Events, and Counters library for Node.js with built-in Bloom Filter optimization.
      </p>
      <div className="hero-actions">
        <a href="#quick-start" className="btn btn-primary">Quick Start</a>
        <a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener" className="btn btn-secondary">View on JSR</a>
      </div>
      <div className="hero-chips">
        <span className="chip">PostgreSQL</span>
        <span className="chip">TypeScript</span>
        <span className="chip">Node.js</span>
        <span className="chip">Bloom Filter</span>
      </div>
    </section>
  )
}

function SectionWhatIs() {
  return (
    <section className="section" id="what-is-pgbloom">
      <h2 className="section-title">What is PGBloom?</h2>
      <p className="section-subtitle">PostgreSQL-native infrastructure for modern applications.</p>
      <p>PGBloom is a PostgreSQL-first infrastructure toolkit that provides caching, Pub/Sub, queues, distributed locks, leader election, scheduling, rate limiting, events, counters, Bloom filters, CRUD models, authentication, and OTP — all backed by PostgreSQL. No Redis, no RabbitMQ, no external infrastructure needed.</p>
      <div className="card-grid">
        {[
          { icon: '⚡', color: 'green', title: 'Cache', desc: 'High-performance caching with TTL, invalidation, and Bloom filter optimization.' },
          { icon: '📨', color: 'purple', title: 'Pub/Sub', desc: 'Real-time messaging using PostgreSQL LISTEN/NOTIFY.' },
          { icon: '🔄', color: 'amber', title: 'Queue', desc: 'Reliable job queues with retries, DLQ, and FOR UPDATE SKIP LOCKED.' },
          { icon: '🔒', color: 'rose', title: 'Locks', desc: 'Advisory lock-based distributed locking and leader election.' },
          { icon: '📅', color: 'cyan', title: 'Scheduler', desc: 'Cron-like job scheduling with delayed and recurring jobs.' },
          { icon: '🚦', color: 'green', title: 'Rate Limiting', desc: 'Fixed window, sliding window, and token bucket algorithms.' },
          { icon: '📡', color: 'purple', title: 'Events', desc: 'Persistent event storage with real-time delivery and replay.' },
          { icon: '🔢', color: 'amber', title: 'Counters', desc: 'Atomic increment/decrement with strong, local, and eventual consistency.' },
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

function SectionInstallNpm() {
  return (
    <section className="section" id="installation">
      <h2 className="section-title">Installation</h2>
      <p className="section-subtitle">Requires Node.js &ge; 18 and a running PostgreSQL instance.</p>

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>npm</h3>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText('npm install pgbloom')}>Copy</button>
        </div>
        <pre><code>npm install pgbloom</code></pre>
      </div>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText('import { createPgbloom } from "pgbloom";\n\nconst client = await createPgbloom(process.env.DATABASE_URL!);')}>Copy</button>
        </div>
        <pre><code>{`import { createPgbloom } from "pgbloom";

      const client = await createPgbloom(process.env.DATABASE_URL!);`}</code></pre>
      </div>

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>JSR</h3>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(jsrInstall)}>Copy</button>
        </div>
        <pre><code>{jsrInstall}</code></pre>
      </div>
      <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <strong>JSR runtime note:</strong> PGBloom depends on <code>pg</code> and <code>ssdiskdb</code>, both targeting Node.js. JSR consumers must run in a Node.js-compatible runtime (Node 18+, Bun, or Deno with <code>--unstable-bare-node-builtins --node-modules-dir</code>). Pure-Deno JSR usage is not supported.
      </p>

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>Git (unreleased / dev)</h3>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(gitInstall)}>Copy</button>
        </div>
        <pre><code>{gitInstall}</code></pre>
      </div>
      <p style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        The package auto-builds via the <code>prepare</code> lifecycle script on install.
      </p>
    </section>
  )
}

function SectionInstallJsr() { return null }
function SectionInstallGit() { return null }

function SectionQuickStart() {
  return (
    <section className="section" id="quick-start">
      <h2 className="section-title">Quick Start</h2>
      <p className="section-subtitle">Get up and running with all major features.</p>
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

function SectionBrowserApi() {
  return (
    <section className="section" id="browser-api">
      <h2 className="section-title">Browser-Safe API</h2>
      <p className="section-subtitle">Use PGBloom in the browser with <code>pgbloom/browser</code>.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(browserCode)}>Copy</button>
        </div>
        <pre><code>{browserCode}</code></pre>
      </div>
      <p style={{ marginTop: 16 }}>The browser bundle is tree-shakable and contains no Node.js dependencies (<code>pg</code>, <code>ssdiskdb</code>, <code>fs</code>, <code>net</code>, <code>tls</code>, etc.).</p>
      <div className="arch-diagram" style={{ marginTop: 24 }}>
        <svg viewBox="0 0 500 100" className="arch-svg">
          <rect x="10" y="20" width="120" height="60" rx="6" fill="#6366f1" opacity="0.2" stroke="#6366f1"/>
          <text x="70" y="45" textAnchor="middle" fill="#e8e8f0" fontSize="12" fontWeight="600">Browser App</text>
          <text x="70" y="62" textAnchor="middle" fill="#a0a0b8" fontSize="10">pgbloom/browser</text>
          <text x="160" y="55" textAnchor="middle" fill="#a0a0b8" fontSize="16">→</text>
          <rect x="190" y="10" width="140" height="80" rx="6" fill="#22c55e" opacity="0.15" stroke="#22c55e"/>
          <text x="260" y="40" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="600">Backend Server</text>
          <text x="260" y="58" textAnchor="middle" fill="#a0a0b8" fontSize="10">PGBloom → PostgreSQL</text>
          <text x="360" y="55" textAnchor="middle" fill="#a0a0b8" fontSize="16">→</text>
          <rect x="390" y="20" width="100" height="60" rx="6" fill="#06b6d4" opacity="0.2" stroke="#06b6d4"/>
          <text x="440" y="45" textAnchor="middle" fill="#e8e8f0" fontSize="12" fontWeight="600">PostgreSQL</text>
          <text x="440" y="62" textAnchor="middle" fill="#a0a0b8" fontSize="10">Source of Truth</text>
        </svg>
      </div>
    </section>
  )
}

function SectionConfiguration() {
  return (
    <section className="section" id="configuration">
      <h2 className="section-title">Configuration</h2>
      <p className="section-subtitle">PGBloom options interface for fine-tuning behavior.</p>
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

function SectionCache() {
  return (
    <section className="section" id="cache">
      <h2 className="section-title">Cache API</h2>
      <p className="section-subtitle">Store and retrieve values with TTL-based expiration.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(cacheCode)}>Copy</button>
        </div>
        <pre><code>{cacheCode}</code></pre>
      </div>
      <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Supported value types: strings, numbers, booleans, <code>null</code>, objects, arrays. Pass milliseconds or an absolute <code>Date</code> for expiry.
      </p>

      <h3 style={{ marginTop: 32, marginBottom: 12 }}>Internal Bloom Filter (Cache Optimization)</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Enable an internal Bloom Filter to accelerate <code>getCache()</code> for keys that definitely don't exist:
      </p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(cacheBloomCode)}>Copy</button>
        </div>
        <pre><code>{cacheBloomCode}</code></pre>
      </div>
    </section>
  )
}

function SectionPubSub() {
  return (
    <section className="section" id="pubsub">
      <h2 className="section-title">Pub/Sub API</h2>
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

function SectionQueue() {
  return (
    <section className="section" id="queue">
      <h2 className="section-title">Queue API</h2>
      <p className="section-subtitle">Reliable job queues with retries and dead-letter handling.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(queueCode)}>Copy</button>
        </div>
        <pre><code>{queueCode}</code></pre>
      </div>
    </section>
  )
}

function SectionLocks() {
  return (
    <section className="section" id="locks">
      <h2 className="section-title">Locks API</h2>
      <p className="section-subtitle">Distributed coordination using PostgreSQL advisory locks.</p>
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

function SectionScheduler() {
  return (
    <section className="section" id="scheduler">
      <h2 className="section-title">Scheduler API</h2>
      <p className="section-subtitle">Cron-like job scheduling with delayed and recurring jobs.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(schedulerCode)}>Copy</button>
        </div>
        <pre><code>{schedulerCode}</code></pre>
      </div>
    </section>
  )
}

function SectionRateLimit() {
  return (
    <section className="section" id="rate-limiting">
      <h2 className="section-title">Rate Limiting API</h2>
      <p className="section-subtitle">Token bucket, sliding window, and fixed window rate limiters.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(rateLimitCode)}>Copy</button>
        </div>
        <pre><code>{rateLimitCode}</code></pre>
      </div>
    </section>
  )
}

function SectionEvents() {
  return (
    <section className="section" id="events">
      <h2 className="section-title">Events API</h2>
      <p className="section-subtitle">Event-driven architecture with persistent storage and replay.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(eventsCode)}>Copy</button>
        </div>
        <pre><code>{eventsCode}</code></pre>
      </div>
    </section>
  )
}

function SectionCounters() {
  return (
    <section className="section" id="counters">
      <h2 className="section-title">Counters API</h2>
      <p className="section-subtitle">Atomic increment/decrement with multiple consistency levels.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(countersCode)}>Copy</button>
        </div>
        <pre><code>{countersCode}</code></pre>
      </div>
    </section>
  )
}

function SectionBloomFilter() {
  return (
    <section className="section" id="bloom-filter">
      <h2 className="section-title">Bloom Filter</h2>
      <p className="section-subtitle">Probabilistic membership testing with configurable false-positive rates.</p>
      <p>PGBloom includes a production-quality Bloom Filter with two use cases: internal cache optimization (see Cache section) and public standalone filters.</p>
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

function SectionLocalStorage() {
  return (
    <section className="section" id="local-storage">
      <h2 className="section-title">Local Storage</h2>
      <p className="section-subtitle">Persistent local cache using ssdiskdb to reduce PostgreSQL calls.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">typescript</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(localCacheCode)}>Copy</button>
        </div>
        <pre><code>{localCacheCode}</code></pre>
      </div>
      <div className="arch-diagram" style={{ marginTop: 24 }}>
        <svg viewBox="0 0 400 130" className="arch-svg">
          <text x="70" y="25" textAnchor="middle" fill="#e8e8f0" fontSize="12" fontWeight="600">Application</text>
          <text x="70" y="80" textAnchor="middle" fill="#e8e8f0" fontSize="12" fontWeight="600">PGBloom</text>
          <text x="70" y="115" textAnchor="middle" fill="#a0a0b8" fontSize="10">PostgreSQL</text>
          <text x="200" y="115" textAnchor="middle" fill="#a0a0b8" fontSize="10">Source of Truth</text>
          <text x="330" y="80" textAnchor="middle" fill="#a0a0b8" fontSize="10">L2 - ssdiskdb</text>
          <text x="330" y="25" textAnchor="middle" fill="#a0a0b8" fontSize="10">L1 - Memory</text>
          <path d="M70 30 L70 70 M330 70 L330 85 M70 85 L70 110 M200 110 L200 85" stroke="#6366f1" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)"/>
          <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#6366f1"/></marker></defs>
        </svg>
      </div>
      <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Cache coherency uses Pub/Sub for invalidation across processes.
      </p>
    </section>
  )
}

function SectionCrud() {
  return (
    <section className="section" id="crud">
      <h2 className="section-title">CRUD Models</h2>
      <p className="section-subtitle">Schema-driven PostgreSQL models with typed filters and updates.</p>
      <div className="code-block">
        <div className="code-header"><span className="code-lang">typescript</span><button className="code-copy" onClick={() => navigator.clipboard.writeText(crudCode)}>Copy</button></div>
        <pre><code>{crudCode}</code></pre>
      </div>
      <p>Models provide <code>create</code>, <code>insertMany</code>, <code>find</code>, <code>findOne</code>, <code>findById</code>, <code>exists</code>, <code>countDocuments</code>, <code>distinct</code>, update methods, delete methods, <code>createTable</code>, and <code>syncIndexes</code>. Filters support <code>$eq</code>, <code>$ne</code>, comparison, membership, existence, and regex operators. Updates support <code>$set</code>, <code>$inc</code>, <code>$unset</code>, <code>$push</code>, and <code>$pull</code>.</p>
    </section>
  )
}

function SectionAuthentication() {
  return (
    <section className="section" id="authentication">
      <h2 className="section-title">Authentication</h2>
      <p className="section-subtitle">Argon2id passwords, HS256 JWTs, refresh sessions, and OTP workflows.</p>
      <div className="code-block">
        <div className="code-header"><span className="code-lang">typescript</span><button className="code-copy" onClick={() => navigator.clipboard.writeText(authCode)}>Copy</button></div>
        <pre><code>{authCode}</code></pre>
      </div>
      <p><code>Auth</code> also supports logout, token refresh, token verification, password reset, email verification, passwordless login, and cleanup. PGBloom does not provide route middleware, roles, permissions, or authorization guards; implement those in the application layer after verifying the token. OTP delivery is not connected to an email provider.</p>
    </section>
  )
}

function SectionErrors() {
  return (
    <section className="section" id="errors">
      <h2 className="section-title">Errors &amp; Security</h2>
      <p className="section-subtitle">Handle package errors explicitly and keep server-only secrets on the server.</p>
      <p>Use <code>PGBloomError</code>, <code>PGBloomDatabaseError</code>, <code>PGBloomValidationError</code>, <code>PGBloomAuthError</code>, <code>PGBloomOTPError</code>, <code>PGBloomConfigError</code>, <code>BloomFilterError</code>, and <code>BloomFilterConfigError</code> with <code>instanceof</code>. Legacy <code>PGSnap*</code> aliases remain available. Bloom positives are not proof of existence, and browser code must never receive database credentials or JWT secrets.</p>
      <div className="code-block"><pre><code>{errorCode}</code></pre></div>
    </section>
  )
}

function SectionRuntimes() {
  const rows = [
    ['Node.js ≥ 18 (npm)', '✅', '✅', 'Primary target. Full feature set.'],
    ['Node.js ≥ 18 (Git)', '✅', '✅', '`prepare` script builds on install.'],
    ['JSR (Deno node compat)', '✅', '✅', 'Requires `--unstable-bare-node-builtins --node-modules-dir`.'],
    ['JSR (Bun)', '✅', '✅', 'Native Node.js compatibility.'],
    ['Browser', '✅', '❌', 'Use `pgbloom/browser` entry point.'],
    ['Pure Deno', '❌', '❌', '`pg` and `ssdiskdb` need `node:*` modules.'],
    ['Cloudflare Workers', '✅*', '❌', 'Core APIs only via `pgbloom/browser`.'],
    ['Deno Deploy', '✅*', '❌', 'Core APIs only via `pgbloom/browser`.'],
    ['Vercel Edge', '✅*', '❌', 'Core APIs only via `pgbloom/browser`.'],
    ['Netlify Edge', '✅*', '❌', 'Core APIs only via `pgbloom/browser`.'],
  ]

  return (
    <section className="section" id="runtimes">
      <h2 className="section-title">Runtime Support</h2>
      <p className="section-subtitle">Browser/Edge runtimes can use <code>pgbloom/browser</code> for Bloom Filter, serialization, and validation. PostgreSQL features require a server runtime.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="doc-table">
          <thead>
            <tr><th>Runtime</th><th>Core</th><th>PostgreSQL</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {rows.map(([runtime, core, pg, notes]) => (
              <tr key={runtime}>
                <td>{runtime}</td>
                <td>{core}</td>
                <td>{pg}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SectionPublishing() {
  return (
    <section className="section" id="publishing">
      <h2 className="section-title">Publishing</h2>
      <p className="section-subtitle">Maintainer guide for npm and JSR releases.</p>
      <div className="code-block">
        <div className="code-header">
          <span className="code-lang">bash</span>
          <button className="code-copy" onClick={() => navigator.clipboard.writeText(publishCode)}>Copy</button>
        </div>
        <pre><code>{publishCode}</code></pre>
      </div>
      <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        npm and JSR versions are kept in sync. Publishing happens automatically on version tags via CI/CD with OIDC trusted publishing — no long-lived tokens.
      </p>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="https://github.com/manojgowdain/pgbloom" target="_blank" rel="noopener">GitHub</a>
        <a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener">JSR</a>
        <a href="https://github.com/manojgowdain/pgbloom/issues" target="_blank" rel="noopener">Issues</a>
      </div>
      <p>&copy; 2026 PGBloom — MIT License</p>
    </footer>
  )
}

const jsrInstall = `# Deno
deno add @manojgowdain/pgbloom

# npm (with the JSR CLI)
npx jsr add @manojgowdain/pgbloom

# pnpm / yarn / bun
pnpm add jsr:@manojgowdain/pgbloom
yarn add jsr:@manojgowdain/pgbloom
bun add jsr:@manojgowdain/pgbloom`

const gitInstall = `# npm
npm install git+https://github.com/manojgowdain/pgbloom.git

# Pin to a tag, branch, or commit
npm install git+https://github.com/manojgowdain/pgbloom.git#v1.3.0
npm install git+https://github.com/manojgowdain/pgbloom.git#main
npm install git+https://github.com/manojgowdain/pgbloom.git#<commit-sha>

# pnpm
pnpm add git+https://github.com/manojgowdain/pgbloom.git

# Bun
bun add git+https://github.com/manojgowdain/pgbloom.git`

const quickStartCode = `import { createPgbloom } from "pgbloom";

const client = await createPgbloom(process.env.DATABASE_URL!);

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

await client.close();`

const browserCode = `import { BloomFilter, serialize, deserialize, validateKey } from "pgbloom/browser";

// Bloom Filter - works entirely in the browser
const bloom = new BloomFilter({ expectedItems: 10000, falsePositiveRate: 0.01 });
bloom.add("user:123");
console.log(bloom.has("user:123")); // true
console.log(bloom.has("user:999")); // false (definitely not present)

// Serialization utilities
const serialized = serialize({ name: "test", value: 123 });
const deserialized = deserialize(serialized);

// Validation
validateKey("valid-key"); // passes
validateKey(""); // throws PGSnapKeyError`

const configCode = `interface PgbloomOptions {
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
}`

const cacheCode = `// Store a value (objects auto-serialized to JSON)
await client.setCache(key: string, value: unknown, expiry?: number | Date);

// Retrieve a value (null if missing or expired)
await client.getCache<T>(key: string): Promise<T | null>;

// Delete a key
await client.deleteCache(key: string): Promise<void>;

// Clear all entries
await client.clearCache(): Promise<void>;

// Clear only expired entries
await client.clearExpiredCache(): Promise<number>;`

const cacheBloomCode = `const client = await pgbloom(DATABASE_URL, {
  bloomFilter: true,
  bloom: {
    expectedItems: 100000,
    falsePositiveRate: 0.01,
    rebuildInterval: 15 * 60 * 1000
  }
});`

const pubsubCode = `// Publish to a channel
await client.publish(channel: string, payload: unknown): Promise<void>;

// Subscribe to a channel
const unsubscribe = await client.subscribe(
  channel: string,
  handler: (channel, payload) => void
): Promise<() => void>;`

const queueCode = `// Enqueue a job
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
await client.cleanupJobs(queueName: string, olderThan?: Date): Promise<number>;`

const lockCode = `// Try to acquire a lock (non-blocking)
const acquired = await client.tryLock(key: string, options?: { ttl?: number }): Promise<boolean>;

// Acquire a lock (blocking with timeout)
await client.lock(key: string, options?: { ttl?: number; timeout?: number }): Promise<void>;

// Release a lock
await client.unlock(key: string, holderId: string): Promise<void>;

// Leader Election
const holderId = await client.acquireLeadership(resource: string, options?: { ttl?: number; onLost?: () => void }): Promise<string | null>;
await client.releaseLeadership(resource: string, holderId: string): Promise<void>;
const isLeader = await client.isLeader(resource: string, holderId: string): Promise<boolean>;`

const schedulerCode = `// Schedule a one-time job
await client.schedule(name: string, payload: unknown, runAt: Date, options?: {
  priority?: number;
  maxAttempts?: number;
  interval?: string; // for recurring
}): Promise<{ id: number }>;

// Schedule a recurring job (5s, 10m, 1h, 1d)
await client.scheduleRecurring(name: string, payload: unknown, interval: string, options?: {
  priority?: number;
  maxAttempts?: number;
}): Promise<{ id: number }>;

// Cancel a scheduled job
await client.cancelSchedule(jobId: number): Promise<void>;

// Get job details
const job = await client.getSchedule(jobId: number);

// List schedules
const jobs = await client.listSchedules({ status?: string; name?: string });`

const rateLimitCode = `// Fixed Window Rate Limiting
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
pgbloom.generateKey(prefix: string, identifier: string): string;`

const eventsCode = `// Emit an event (stored in DB + real-time NOTIFY)
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
await client.replayEvents(from: Date, to: Date | undefined, type: string | undefined, handler: (event) => void): Promise<{ replayed: number }>;`

const countersCode = `// Increment counter (default delta=1)
await client.increment(key: string, delta?: number): Promise<{ value: number }>;

// Decrement counter (default delta=1)
await client.decrement(key: string, delta?: number): Promise<{ value: number }>;

// Add/subtract arbitrary amount
await client.add(key: string, delta: number): Promise<{ value: number }>;
await client.subtract(key: string, delta: number): Promise<{ value: number }>;

// Get counter value with consistency options
await client.getCounter(key: string, options?: { consistency?: 'strong' | 'local' | 'eventual' }): Promise<{ value: number }>;

// Set counter to specific value
await client.setCounter(key: string, value: number): Promise<{ value: number }>;

// Remove counter
await client.removeCounter(key: string): Promise<boolean>;

// Consistency levels:
//   strong  - always reads from PostgreSQL (default)
//   local   - reads from local cache only (fast, may be stale)
//   eventual - local cache, falls back to PostgreSQL on miss`

const bloomCode = `// Create a named filter
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

// API
interface BloomFilter {
  add(value: string | number | boolean | bigint | null): void;
  has(value: string | number | boolean | bigint | null): boolean;
  clear(): void;
  size(): number;
  toJSON(): BloomFilterJSON;
  static fromJSON(json: BloomFilterJSON): BloomFilter;
}`

const localCacheCode = `import { createLocalStore, MemoryCache } from "pgbloom/server";

const disk = await createLocalStore({ path: "./.pgbloom" });
const cache = new MemoryCache(disk, { maxEntries: 1000, ttl: 60000 });

await cache.set("session:42", { active: true });
const value = await cache.get("session:42");
await cache.close();`

const crudCode = `const users = client.model("app_users", {
  email: { type: "string", required: true, unique: true },
  active: { type: "boolean", default: true },
}, { timestamps: true });

await users.createTable();
await users.create({ email: "ada@example.com" });
const active = await users.find(
  { active: true },
  { sort: { email: 1 }, limit: 20 },
);
await users.updateOne(
  { email: "ada@example.com" },
  { $set: { active: false } },
);`

const authCode = `const auth = client.auth({
  jwtSecret: process.env.JWT_SECRET,
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d",
});

const result = await auth.signup({
  email: "ada@example.com",
  password: "correct horse battery staple",
});
const currentUser = await auth.me(result.accessToken);
const refreshed = await auth.refreshToken(result.refreshToken);
await auth.logout(refreshed.refreshToken);`

const errorCode = `try {
  await client.setCache("", "value");
} catch (error) {
  if (error instanceof PGSnapKeyError) {
    console.error("Invalid cache key", error.message);
  }
  throw error;
}`

const publishCode = `# 1. Update version in package.json AND jsr.json (keep in sync)
# 2. Run tests
npm run typecheck
npm run build

# 3. Validate npm package contents
npm pack --dry-run

# 4. Validate JSR package
npx jsr publish --dry-run

# 5. Publish (uses GitHub Actions trusted publishing)
# 6. Tag the release
git tag v1.3.0
git push origin v1.3.0`

