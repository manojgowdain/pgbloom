import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Seo } from '../components/seo/Seo'
import { landingPages } from '../data/seoPages'
import Footer from '../components/Footer'
import './ContentPage.css'

export const ContentPage: React.FC = () => {
  const { slug, section } = useParams<{ slug?: string; section?: string }>()
  
  // Resolve full slug path (e.g., 'features/postgresql-cache' or 'pgbloom-js')
  const fullSlug = section && slug ? `${section}/${slug}` : (slug || '')
  const page = landingPages[fullSlug]

  if (!page) {
    return (
      <div className="content-page-layout">
        <Seo
          title="Page Not Found | PGBloom"
          description="The requested documentation or guide page could not be found."
          noindex={true}
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
            <Link to="/aiagent">AI Docs</Link>
            <Link to="/playground">Playground</Link>
          </div>
        </nav>
        <main className="content-page-container not-found">
          <h1>404 — Page Not Found</h1>
          <p>We couldn't find the requested page: <code>{fullSlug}</code></p>
          <div className="actions">
            <Link to="/" className="btn btn-primary">Return to Homepage</Link>
            <Link to="/pgbloom-documentation" className="btn btn-secondary">Documentation Hub</Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: page.category.toUpperCase(), url: `/${page.category}` },
    { name: page.title, url: page.canonicalPath },
  ]

  const structuredData = {
    '@type': 'TechArticle',
    '@id': `https://pgbloom.iotkit.in${page.canonicalPath}#article`,
    headline: page.h1,
    description: page.metaDescription,
    url: `https://pgbloom.iotkit.in${page.canonicalPath}`,
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      name: 'Manoj Gowda',
      url: 'https://manojgowda.in',
    },
    publisher: {
      '@type': 'Person',
      name: 'Manoj Gowda',
      url: 'https://manojgowda.in',
    },
    about: {
      '@type': 'SoftwareApplication',
      name: 'PGBloom',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Cross-platform',
    },
  }

  return (
    <div className="content-page-layout">
      <Seo
        title={page.metaTitle}
        description={page.metaDescription}
        keywords={page.keywords}
        canonicalUrl={`https://pgbloom.iotkit.in${page.canonicalPath}`}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
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
          <Link to="/features/postgresql-cache">Features</Link>
          <Link to="/guides/postgresql-caching">Guides</Link>
          <Link to="/aiagent">AI Docs</Link>
          <Link to="/playground">Playground</Link>
          <a href="https://github.com/manojgowdain/pgbloom" target="_blank" rel="noopener noreferrer" className="btn-nav">GitHub</a>
        </div>
      </nav>

      <main className="content-page-container">
        {/* Breadcrumb Navigation */}
        <nav className="page-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span className="crumb-sep">/</span>
          <span className="crumb-cat">{page.category}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{page.title}</span>
        </nav>

        {/* Header */}
        <header className="page-header">
          <div className="page-category-tag">{page.category}</div>
          <h1 className="page-h1">{page.h1}</h1>
          <p className="page-intro">{page.intro}</p>
        </header>

        {/* Content Sections */}
        <div className="page-body">
          {page.sections.map((sec, idx) => (
            <section key={idx} className="page-section">
              <h2 className="section-h2">{sec.heading}</h2>
              <p className="section-text">{sec.content}</p>
              {sec.code && (
                <div className="code-block">
                  <div className="code-header">
                    <span className="code-lang">typescript</span>
                    <button
                      className="code-copy"
                      onClick={() => navigator.clipboard.writeText(sec.code || '')}
                    >
                      Copy
                    </button>
                  </div>
                  <pre><code>{sec.code}</code></pre>
                </div>
              )}
            </section>
          ))}

          {/* Pros and Cons / Trade-offs */}
          {(page.pros || page.cons) && (
            <div className="tradeoffs-grid">
              {page.pros && (
                <div className="tradeoff-card pros-card">
                  <h3>Advantages</h3>
                  <ul>
                    {page.pros.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {page.cons && (
                <div className="tradeoff-card cons-card">
                  <h3>Considerations &amp; Trade-offs</h3>
                  <ul>
                    {page.cons.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Call to Action */}
          <div className="page-cta-box">
            <h3>Ready to build on PostgreSQL?</h3>
            <p>Get started with PGBloom in your Node.js or TypeScript project in under two minutes.</p>
            <div className="cta-actions">
              <Link to="/pgbloom-installation" className="btn btn-primary">Installation Guide</Link>
              <Link to="/playground" className="btn btn-secondary">Try Interactive Playground</Link>
            </div>
          </div>

          {/* Related Articles & Internal Links */}
          {page.relatedSlugs.length > 0 && (
            <div className="related-pages-section">
              <h3 className="related-heading">Related Guides &amp; Subsystems</h3>
              <div className="related-cards-grid">
                {page.relatedSlugs.map((relSlug) => {
                  const relPage = landingPages[relSlug]
                  if (!relPage) return null
                  return (
                    <Link key={relSlug} to={relPage.canonicalPath} className="related-card">
                      <span className="related-cat">{relPage.category}</span>
                      <span className="related-title">{relPage.title}</span>
                      <p className="related-desc">{relPage.metaDescription}</p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
export default ContentPage
