import React from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Seo } from './seo/Seo'
import { aiAgentDocs } from '../data/aiAgentDocs'
import Footer from './Footer'
import './AIAgentDocs.css'

export const AIAgentDocs: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const location = useLocation()

  // Clean trailing slash if present for slug lookup
  const cleanSlug = slug ? slug.replace(/\/$/, '') : undefined

  if (!cleanSlug) {
    // Index Page
    const docList = Object.values(aiAgentDocs)
    const breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: 'AI Agent Documentation', url: '/aiagent' },
    ]

    return (
      <div className="agent-page-layout">
        <Seo
          title="AI Agent Documentation | PGBloom PostgreSQL Toolkit"
          description="Machine-readable AI agent documentation and architecture guides for the PGBloom PostgreSQL-first infrastructure toolkit."
          keywords="pgbloom ai docs, ai agent documentation, machine readable docs, llms.txt, index.json, postgresql toolkit"
          canonicalUrl="https://pgbloom.iotkit.in/aiagent"
          breadcrumbs={breadcrumbs}
          structuredData={{
            '@type': 'TechArticle',
            headline: 'PGBloom AI Agent Documentation Tree',
            url: 'https://pgbloom.iotkit.in/aiagent',
            about: {
              '@type': 'SoftwareApplication',
              name: 'PGBloom',
            },
          }}
        />

        <nav className="navbar">
          <Link to="/" className="nav-brand">
            <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
              <rect width="28" height="28" rx="6" fill="#6366f1" />
              <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            PGBloom
          </Link>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/aiagent">AI Index</Link>
            <Link to="/aiagent/api">API Reference</Link>
            <Link to="/playground">Playground</Link>
          </div>
        </nav>

        <main className="agent-shell">
          <nav className="agent-nav">
            <Link to="/aiagent">AI Index</Link>
            <Link to="/aiagent/api">API Inventory</Link>
            <Link to="/">Interactive Docs</Link>
            <Link to="/playground">Playground</Link>
          </nav>

          <p className="agent-meta">
            <strong>Canonical URL:</strong> <code>https://pgbloom.iotkit.in/aiagent</code> | <strong>Category:</strong> Index | <strong>Version:</strong> 1.7.0
          </p>

          <h1>PGBloom AI Agent Documentation</h1>
          <p>
            PGBloom is a PostgreSQL-first infrastructure toolkit for JavaScript and TypeScript. It combines cache, Pub/Sub, queues, distributed locks, leader election, scheduling, rate limiting, events, atomic counters, CRUD models, authentication, OTP, Bloom filters, and local storage into a single operational boundary without requiring Redis or a separate queue service.
          </p>

          <h2>Complete Documentation Tree ({docList.length} Sections)</h2>
          <div className="agent-document-grid">
            {docList.map((doc) => (
              <Link className="agent-document-card" key={doc.slug} to={`/aiagent/${doc.slug}`}>
                <strong>{doc.title}</strong>
                <span className="card-badge">{doc.category}</span>
                <span>{doc.description}</span>
              </Link>
            ))}
          </div>

          <h2>Machine-Readable Indexes for LLMs &amp; Crawlers</h2>
          <p className="machine-readable-links">
            <a href="/aiagent/index.json" target="_blank" rel="noopener noreferrer">index.json</a> ·{' '}
            <a href="/aiagent/llms.txt" target="_blank" rel="noopener noreferrer">llms.txt</a> ·{' '}
            <a href="/aiagent/llms-full.txt" target="_blank" rel="noopener noreferrer">llms-full.txt</a>
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  const doc = aiAgentDocs[cleanSlug]
  if (!doc) {
    return <Navigate replace to="/aiagent" />
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'AI Docs', url: '/aiagent' },
    { name: doc.title, url: `/aiagent/${doc.slug}` },
  ]

  const canonicalUrl = `https://pgbloom.iotkit.in/aiagent/${doc.slug}`

  return (
    <div className="agent-page-layout">
      <Seo
        title={`${doc.title} — AI Agent Documentation | PGBloom`}
        description={doc.description}
        keywords={`pgbloom ${doc.slug}, ${doc.title} postgresql, ${doc.category}, pgbloom architecture`}
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
        structuredData={{
          '@type': 'TechArticle',
          headline: `PGBloom ${doc.title}`,
          description: doc.description,
          url: canonicalUrl,
        }}
      />

      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <svg viewBox="0 0 28 28" fill="none" width="28" height="28">
            <rect width="28" height="28" rx="6" fill="#6366f1" />
            <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          PGBloom
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/aiagent">AI Index</Link>
          <Link to="/aiagent/api">API Inventory</Link>
          <Link to="/playground">Playground</Link>
        </div>
      </nav>

      <main className="agent-shell">
        <nav className="agent-nav">
          <Link to="/aiagent">← AI Index</Link>
          <Link to="/aiagent/api">API Inventory</Link>
          <Link to="/aiagent/quickstart">Quickstart</Link>
          <Link to="/playground">Playground</Link>
        </nav>

        <p className="agent-meta">
          <strong>Canonical URL:</strong> <code>{location.pathname}</code> | <strong>Category:</strong> {doc.category} | <strong>Version:</strong> 1.7.0
        </p>

        <h1>PGBloom {doc.title}</h1>
        <p className="doc-desc">{doc.description}</p>

        <h2>What It Is</h2>
        <p>{doc.overview}</p>

        <h2>Why It Exists and When to Use It</h2>
        <p>{doc.whyUse}</p>

        <h2>Architecture and Internal Implementation</h2>
        <p>{doc.architecture}</p>

        <h2>Public API &amp; Signatures</h2>
        <pre className="code-block"><code>{doc.apiSignature}</code></pre>

        <h2>Parameters and Returns</h2>
        <p>{doc.parametersAndReturns}</p>

        <h2>Errors, Concurrency, and Failure Scenarios</h2>
        <p>{doc.errorsAndFailure}</p>

        <h2>When Not to Use It</h2>
        <p>{doc.whenNotToUse}</p>

        <h2>Executable Code Example</h2>
        <pre className="code-block"><code>{doc.exampleCode}</code></pre>

        <h2>Related Documentation Sections</h2>
        <ul className="related-links-list">
          {doc.relatedSlugs.map((rel) => {
            const relDoc = aiAgentDocs[rel]
            if (!relDoc) return null
            return (
              <li key={rel}>
                <Link to={`/aiagent/${relDoc.slug}`}>{relDoc.title}</Link> — {relDoc.description}
              </li>
            )
          })}
        </ul>
      </main>

      <Footer />
    </div>
  )
}

export default AIAgentDocs