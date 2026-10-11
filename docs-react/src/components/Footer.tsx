import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <svg viewBox="0 0 28 28" fill="none" width="24" height="24">
                <rect width="28" height="28" rx="6" fill="#6366f1" />
                <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>PGBloom</span>
            </div>
            <p className="footer-tagline">
              PostgreSQL-first infrastructure toolkit for Node.js, Deno, Bun and TypeScript. Cache, queues, locks, pub/sub, scheduler and rate limiting on durable Postgres.
            </p>
            <div className="footer-badge">
              <span>Powered by IOTKit</span>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Product &amp; Features</h3>
            <ul className="footer-links-list">
              <li><Link to="/">Overview</Link></li>
              <li><Link to="/features/postgresql-cache">PostgreSQL Cache</Link></li>
              <li><Link to="/features/cache-ttl">Cache TTL &amp; Expiry</Link></li>
              <li><Link to="/features/pubsub">Pub/Sub Messaging</Link></li>
              <li><Link to="/features/queue">Priority Job Queues</Link></li>
              <li><Link to="/features/distributed-locks">Distributed Locks</Link></li>
              <li><Link to="/features/rate-limiting">Rate Limiting</Link></li>
              <li><Link to="/features/scheduler">Job Scheduler</Link></li>
              <li><Link to="/features/events">Persistent Events</Link></li>
              <li><Link to="/features/counters">Atomic Counters</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Guides &amp; Architecture</h3>
            <ul className="footer-links-list">
              <li><Link to="/guides/postgresql-caching">PostgreSQL Caching Guide</Link></li>
              <li><Link to="/guides/postgresql-cache-nodejs">Node.js Postgres Cache</Link></li>
              <li><Link to="/guides/postgresql-cache-javascript">JavaScript Postgres Cache</Link></li>
              <li><Link to="/guides/cache-invalidation-guide">Cache Invalidation</Link></li>
              <li><Link to="/guides/postgresql-pubsub">PostgreSQL Pub/Sub Guide</Link></li>
              <li><Link to="/guides/postgresql-distributed-locking">Distributed Locking Guide</Link></li>
              <li><Link to="/comparisons/pgbloom-vs-redis">PGBloom vs Redis</Link></li>
              <li><Link to="/comparisons/postgresql-cache-vs-redis">Postgres Cache vs Redis</Link></li>
              <li><Link to="/use-cases/backend-caching">Backend Caching Patterns</Link></li>
              <li><Link to="/use-cases/nodejs-applications">Node.js Microservices</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Ecosystem &amp; Resources</h3>
            <ul className="footer-links-list">
              <li><Link to="/pgbloom-js">PGBloom JS</Link></li>
              <li><Link to="/pgbloom-npm">npm Package</Link></li>
              <li><Link to="/pgbloom-jsr">JSR Package</Link></li>
              <li><Link to="/pgbloom-iotkit">IOTKit Ecosystem</Link></li>
              <li><Link to="/pgbloom-installation">Installation Guide</Link></li>
              <li><Link to="/pgbloom-documentation">Documentation Hub</Link></li>
              <li><Link to="/playground">Interactive Playground</Link></li>
              <li><Link to="/aiagent">AI Agent Documentation</Link></li>
              <li><a href="https://github.com/manojgowdain/pgbloom" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              <li><a href="https://www.npmjs.com/package/pgbloom" target="_blank" rel="noopener noreferrer">npm Registry</a></li>
              <li><a href="https://jsr.io/@manojgowdain/pgbloom" target="_blank" rel="noopener noreferrer">JSR Registry</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-meta">
            <p>&copy; 2026 PGBloom · Created by <a href="https://manojgowda.in" target="_blank" rel="noopener noreferrer">Manoj Gowda</a> · Licensed under MIT</p>
            <p className="footer-subtext">
              Part of the IOTKit open-source ecosystem. Related tools: <a href="http://toonkit.js.org/" target="_blank" rel="noopener noreferrer">ToonKit</a>, <a href="https://ssdiskdb.js.org/" target="_blank" rel="noopener noreferrer">SSDiskDB</a>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
export default Footer
