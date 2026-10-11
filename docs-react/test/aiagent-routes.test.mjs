import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = join(docsRoot, "public", "aiagent");
const distRoot = join(docsRoot, "dist");
const indexPath = join(publicRoot, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));

assert.equal(index.project, "PGBloom");
assert.equal(index.documentation, "/aiagent/");
assert.equal(index.documents.length, 24);

// 1. Verify machine-readable files exist in dist/
for (const file of ["index.json", "llms.txt", "llms-full.txt"]) {
  assert.ok(existsSync(join(distRoot, "aiagent", file)), `missing built AI-agent file in dist: ${file}`);
}

// 2. Verify static HTML pages were correctly deleted from public/aiagent
// (Only index.json, llms.txt, and llms-full.txt remain in public/aiagent)
const publicAiAgentFiles = readdirSync(publicRoot);
for (const file of publicAiAgentFiles) {
  assert.ok(
    ["index.json", "llms.txt", "llms-full.txt"].includes(file),
    `Found unexpected static file/folder in public/aiagent: ${file}. All HTML pages must be rendered inside React!`
  );
}

// 3. Verify React app entrypoint and bundle
assert.ok(existsSync(join(distRoot, "index.html")), "missing React app entrypoint");
const assets = readdirSync(join(distRoot, "assets"));
const jsFiles = assets.filter((file) => file.endsWith(".js"));
assert.ok(jsFiles.length > 0, "missing React JavaScript bundle");

// Verify that React bundle contains AIAgentDocs, Playground, and SEO landing page routes
const allChunks = jsFiles.map((f) => readFileSync(join(distRoot, "assets", f), "utf8")).join(" ");
assert.match(allChunks, /AI Agent Documentation|PGBloom AI Agent/, "React bundle does not contain in-app AI agent docs");
assert.match(allChunks, /Interactive Playground/, "React bundle does not contain interactive playground");
assert.match(allChunks, /PostgreSQL Cache/, "React bundle does not contain SEO feature landing pages");

// 4. Verify Sitemap and robots.txt
const sitemap = readFileSync(join(distRoot, "sitemap.xml"), "utf8");
assert.match(sitemap, /<loc>https:\/\/pgbloom\.iotkit\.in\/aiagent\/<\/loc>/, "sitemap missing /aiagent/ root");
assert.match(sitemap, /<loc>https:\/\/pgbloom\.iotkit\.in\/features\/postgresql-cache<\/loc>/, "sitemap missing feature route");
assert.match(sitemap, /<loc>https:\/\/pgbloom\.iotkit\.in\/comparisons\/pgbloom-vs-redis<\/loc>/, "sitemap missing comparison route");

const robots = readFileSync(join(distRoot, "robots.txt"), "utf8");
assert.match(robots, /Sitemap: https:\/\/pgbloom\.iotkit\.in\/sitemap\.xml/, "robots.txt missing sitemap reference");

console.log(`Docs route smoke test passed: ${index.documents.length} AI-agent routes verified inside React app.`);