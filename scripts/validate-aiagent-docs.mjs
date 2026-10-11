import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const docsRoot = normalize(join(projectRoot, "docs-react", "public", "aiagent"));
const publicRoot = normalize(join(projectRoot, "docs-react", "public"));
const distRoot = normalize(join(projectRoot, "docs-react", "dist"));
const indexPath = join(docsRoot, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(index.project === "PGBloom", "index.json project must be PGBloom");
assert(index.documentation === "/aiagent/", "index.json documentation root is incorrect");
assert(Array.isArray(index.documents) && index.documents.length > 0, "index.json must contain documents");

// Verify that static HTML files were deleted from public/aiagent
const publicAiAgentFiles = readdirSync(docsRoot);
for (const file of publicAiAgentFiles) {
  if (!["index.json", "llms.txt", "llms-full.txt"].includes(file)) {
    failures.push(`Found static file or directory in public/aiagent: ${file}. All documentation pages must be rendered inside React!`);
  }
}

// Verify that machine-readable files exist
for (const name of ["llms.txt", "llms-full.txt"]) {
  const content = readFileSync(join(docsRoot, name), "utf8");
  for (const document of index.documents) {
    assert(content.includes(document.url), `${name} omits ${document.url}`);
  }
}

// Verify sitemap.xml
const sitemap = readFileSync(join(publicRoot, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
const expectedSitemapUrls = [
  "https://pgbloom.iotkit.in/",
  "https://pgbloom.iotkit.in/playground",
  "https://pgbloom.iotkit.in/aiagent/",
  ...index.documents.map((document) => `https://pgbloom.iotkit.in${document.url}`),
  "https://pgbloom.iotkit.in/aiagent/index.json",
  "https://pgbloom.iotkit.in/aiagent/llms.txt",
  "https://pgbloom.iotkit.in/aiagent/llms-full.txt",
];

assert(sitemapUrls.length === new Set(sitemapUrls).size, "sitemap contains duplicate URLs");
for (const url of expectedSitemapUrls) {
  assert(sitemapUrls.includes(url), `sitemap omits ${url}`);
}

assert(
  readFileSync(join(publicRoot, "robots.txt"), "utf8").includes("Sitemap: https://pgbloom.iotkit.in/sitemap.xml"),
  "robots.txt has no canonical sitemap"
);

if (failures.length > 0) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`AI-agent documentation valid: ${index.documents.length} documents validated for React SPA delivery.`);