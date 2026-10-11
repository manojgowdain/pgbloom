import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

// Lazy loaded page components for optimal bundle splitting and performance
const Docs = lazy(() => import('./components/Docs'))
const AIAgentDocs = lazy(() => import('./components/AIAgentDocs'))
const Playground = lazy(() => import('./components/Playground'))
const ContentPage = lazy(() => import('./pages/ContentPage'))

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#a0a0b8',
      fontFamily: 'system-ui, sans-serif'
    }}>
      Loading PGBloom...
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Core Pages */}
        <Route path="/" element={<Docs />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/aiagent/playground" element={<Playground />} />

        {/* AI-Agent Pages (in-app React router) */}
        <Route path="/aiagent" element={<AIAgentDocs />} />
        <Route path="/aiagent/:slug" element={<AIAgentDocs />} />

        {/* Dynamic SEO Landing Pages (Guides, Features, Comparisons, Use Cases, Brand) */}
        <Route path="/features/:slug" element={<ContentPage />} />
        <Route path="/guides/:slug" element={<ContentPage />} />
        <Route path="/comparisons/:slug" element={<ContentPage />} />
        <Route path="/use-cases/:slug" element={<ContentPage />} />

        {/* Brand & Distribution Pages */}
        <Route path="/pgbloom-js" element={<ContentPage />} />
        <Route path="/pgbloom-npm" element={<ContentPage />} />
        <Route path="/pgbloom-jsr" element={<ContentPage />} />
        <Route path="/pgbloom-iotkit" element={<ContentPage />} />
        <Route path="/pgbloom-installation" element={<ContentPage />} />
        <Route path="/pgbloom-documentation" element={<ContentPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  )
}

export default App
