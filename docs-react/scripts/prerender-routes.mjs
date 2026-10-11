import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(root, 'dist')
const indexHtmlPath = join(distDir, 'index.html')
const errorHtmlPath = join(distDir, '404.html')

// All routes that should have an explicit pre-rendered static HTML directory for GitHub Pages / Googlebot
const routes = [
  'playground',
  'aiagent',
  'aiagent/overview',
  'aiagent/installation',
  'aiagent/quickstart',
  'aiagent/architecture',
  'aiagent/configuration',
  'aiagent/api',
  'aiagent/cache',
  'aiagent/pubsub',
  'aiagent/queue',
  'aiagent/locks',
  'aiagent/scheduler',
  'aiagent/rate-limit',
  'aiagent/events',
  'aiagent/counters',
  'aiagent/model',
  'aiagent/auth',
  'aiagent/bloom-filter',
  'aiagent/storage',
  'aiagent/browser',
  'aiagent/testing',
  'aiagent/deployment',
  'aiagent/troubleshooting',
  'aiagent/examples',
  'aiagent/playground',
  // SEO Landing Pages
  'pgbloom-js',
  'pgbloom-npm',
  'pgbloom-jsr',
  'pgbloom-iotkit',
  'pgbloom-installation',
  'pgbloom-documentation',
  'features/postgresql-cache',
  'features/cache-ttl',
  'features/cache-invalidation',
  'features/pubsub',
  'features/queue',
  'features/distributed-locks',
  'features/rate-limiting',
  'features/scheduler',
  'features/events',
  'features/counters',
  'features/bloom-filter',
  'features/storage',
  'features/browser',
  'features/model',
  'features/auth',
  'guides/postgresql-caching',
  'guides/postgresql-cache-nodejs',
  'guides/postgresql-cache-javascript',
  'guides/cache-invalidation-guide',
  'guides/postgresql-pubsub',
  'guides/postgresql-distributed-locking',
  'comparisons/pgbloom-vs-redis',
  'comparisons/postgresql-cache-vs-redis',
  'use-cases/backend-caching',
  'use-cases/nodejs-applications',
]

async function prerender() {
  const indexHtml = await readFile(indexHtmlPath, 'utf8')

  // 1. Create 404.html for GitHub Pages fallback
  await copyFile(indexHtmlPath, errorHtmlPath)
  console.log('✓ Generated dist/404.html (GitHub Pages SPA fallback)')

  // 2. Pre-generate static route HTML entries (so Googlebot gets HTTP 200 on direct GET)
  for (const route of routes) {
    const routeDir = join(distDir, route)
    await mkdir(routeDir, { recursive: true })
    
    // Customize canonical link in pre-rendered shell for Googlebot
    const routeHtml = indexHtml.replace(
      /<link rel="canonical" href="https:\/\/pgbloom\.iotkit\.in\/?" \/>/,
      `<link rel="canonical" href="https://pgbloom.iotkit.in/${route}" />`
    )

    await writeFile(join(routeDir, 'index.html'), routeHtml)
  }
  console.log(`✓ Pre-generated static entrypoints for ${routes.length} routes.`)
}

prerender().catch((err) => {
  console.error('Prerender error:', err)
  process.exit(1)
})
