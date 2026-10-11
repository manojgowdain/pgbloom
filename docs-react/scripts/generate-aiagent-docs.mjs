import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "..", "public", "aiagent");
const publicRoot = join(root, "..", "public");
const version = "1.7.0";
const site = "https://pgbloom.iotkit.in";

const documents = [
  ["overview", "Overview", "overview", "Project purpose, runtime model, and actual feature inventory."],
  ["installation", "Installation", "setup", "Package installation, PostgreSQL requirements, and runtime support."],
  ["quickstart", "Quickstart", "guide", "Minimal server setup and first operations."],
  ["architecture", "Architecture", "architecture", "Client, PostgreSQL, local storage, browser boundaries, and lifecycle."],
  ["configuration", "Configuration", "configuration", "PgbloomOptions and subsystem defaults."],
  ["api", "API Inventory", "api", "Public package exports and high-level client methods."],
  ["cache", "Cache", "feature", "TTL cache operations and optional Bloom lookup optimization."],
  ["pubsub", "Pub/Sub", "feature", "PostgreSQL LISTEN/NOTIFY channel messaging."],
  ["queue", "Queue", "feature", "Priority jobs, visibility timeouts, retries, and claims."],
  ["locks", "Locks", "feature", "TTL distributed locks and leader election."],
  ["scheduler", "Scheduler", "feature", "Delayed and recurring jobs with worker claims."],
  ["rate-limit", "Rate Limiting", "feature", "Fixed-window, sliding-window, and token-bucket limits."],
  ["events", "Events", "feature", "Persistent events, notifications, history, and replay."],
  ["counters", "Counters", "feature", "Atomic counters and strong, local, or eventual reads."],
  ["model", "Model / CRUD", "feature", "Schema-driven PostgreSQL CRUD models."],
  ["auth", "Authentication", "feature", "Passwords, JWTs, sessions, and OTP workflows."],
  ["bloom-filter", "Bloom Filter", "feature", "Runtime-independent counting Bloom filter and hash helpers."],
  ["storage", "Storage", "feature", "SSDiskDB local persistence and in-memory LRU/TTL caching."],
  ["browser", "Browser", "feature", "Browser-safe entrypoint and server boundary."],
  ["testing", "Testing", "operations", "Unit, integration, package, persistence, and documentation checks."],
  ["deployment", "Deployment", "operations", "Production runtime, secrets, database, and Pages deployment."],
  ["troubleshooting", "Troubleshooting", "operations", "Common startup, runtime, database, and feature failures."],
  ["examples", "Examples", "examples", "Executable patterns using the actual exported API."],
  ["playground", "Interactive Playground", "tool", "Controlled browser execution for browser-safe PGBloom APIs with measured traces."],
];

// Curated SEO Landing Page routes to index in sitemap
const seoRoutes = [
  // Brand & Distribution
  "/pgbloom-js",
  "/pgbloom-npm",
  "/pgbloom-jsr",
  "/pgbloom-iotkit",
  "/pgbloom-installation",
  "/pgbloom-documentation",
  // Technical Features
  "/features/postgresql-cache",
  "/features/cache-ttl",
  "/features/cache-invalidation",
  "/features/pubsub",
  "/features/queue",
  "/features/distributed-locks",
  "/features/rate-limiting",
  "/features/scheduler",
  "/features/events",
  "/features/counters",
  "/features/bloom-filter",
  "/features/storage",
  "/features/browser",
  "/features/model",
  "/features/auth",
  // Educational Guides
  "/guides/postgresql-caching",
  "/guides/postgresql-cache-nodejs",
  "/guides/postgresql-cache-javascript",
  "/guides/cache-invalidation-guide",
  "/guides/postgresql-pubsub",
  "/guides/postgresql-distributed-locking",
  // Comparisons
  "/comparisons/pgbloom-vs-redis",
  "/comparisons/postgresql-cache-vs-redis",
  // Use Cases
  "/use-cases/backend-caching",
  "/use-cases/nodejs-applications",
];

const index = {
  project: "PGBloom",
  documentation: "/aiagent/",
  version,
  description: "AI-readable documentation for the PostgreSQL-first PGBloom toolkit.",
  sourceOfTruth: [
    "src/index.ts",
    "src/server.ts",
    "src/browser.ts",
    "src/client/PGSnap.ts",
    "test/"
  ],
  documents: documents.map(([slug, title, type, description]) => ({
    title,
    url: `/aiagent/${slug === "api" ? "api/" : slug}`,
    description,
    type,
    parent: "/aiagent/"
  }))
};

const sitemapRoutes = [
  "/",
  "/playground",
  "/aiagent/",
  ...documents.map(([slug]) => `/aiagent/${slug === "api" ? "api/" : slug}`),
  ...seoRoutes,
  "/aiagent/index.json",
  "/aiagent/llms.txt",
  "/aiagent/llms-full.txt",
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapRoutes.map((url) => `  <url><loc>${site}${url}</loc></url>`).join("\n")}
</urlset>
`;

await mkdir(output, { recursive: true });

// Generate machine-readable JSON & LLM context files (DO NOT generate static HTML in public/aiagent)
await writeFile(join(output, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
await writeFile(
  join(output, "llms.txt"),
  `# PGBloom

Canonical AI-agent documentation: /aiagent/
Machine-readable index: /aiagent/index.json

${documents.map(([slug, title, , description]) => `- ${title}: /aiagent/${slug === "api" ? "api/" : slug} - ${description}`).join("\n")}
`
);

await writeFile(
  join(output, "llms-full.txt"),
  `# PGBloom AI Agent Documentation

${documents.map(([slug, title, category, description]) => `## ${title}
- URL: /aiagent/${slug === "api" ? "api/" : slug}
- Category: ${category}
- Summary: ${description}
`).join("\n")}`
);

// Write sitemap and robots.txt to public/
await writeFile(join(publicRoot, "sitemap.xml"), sitemap);
await writeFile(
  join(publicRoot, "robots.txt"),
  `User-agent: *
Allow: /

# Canonical HTML, AI-agent, and machine-readable documentation entrypoints.
Sitemap: ${site}/sitemap.xml
`
);

console.log(`Generated machine-readable AI docs and sitemap with ${sitemapRoutes.length} canonical routes.`);