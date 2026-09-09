import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const docsRoot = normalize(join(projectRoot, "docs-react", "public", "aiagent"));
const indexPath = join(docsRoot, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8"));
const failures = [];

function routeToFile(route) {
  if (!route.startsWith("/aiagent")) return null;
  const suffix = route.slice("/aiagent".length).replace(/^\//, "");
  if (suffix === "") return join(docsRoot, "index.html");
  if (suffix === "index.json" || suffix === "llms.txt" || suffix === "llms-full.txt") return join(docsRoot, suffix);
  return join(docsRoot, suffix.replace(/\/$/, ""), "index.html");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(index.project === "PGBloom", "index.json project must be PGBloom");
assert(index.documentation === "/aiagent/", "index.json documentation root is incorrect");
assert(Array.isArray(index.documents) && index.documents.length > 0, "index.json must contain documents");
assert(existsSync(join(docsRoot, "index.html")), "root /aiagent/index.html is missing");

const routes = new Set(["/aiagent/", "/aiagent/index.json", "/aiagent/llms.txt", "/aiagent/llms-full.txt"]);
for (const document of index.documents) {
  assert(typeof document.url === "string", "every index document needs a URL");
  assert(!routes.has(document.url), `duplicate documentation URL: ${document.url}`);
  routes.add(document.url);
  const file = routeToFile(document.url);
  assert(file && existsSync(file), `missing document file for ${document.url}`);
  assert(document.parent === "/aiagent/", `${document.url} must point to /aiagent/ as parent`);
}

for (const route of routes) {
  const file = routeToFile(route);
  if (file && !existsSync(file)) failures.push(`missing indexed support file for ${route}`);
}

for (const route of routes) {
  const file = routeToFile(route);
  if (!file?.endsWith(".html") || !existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  assert(html.includes("<title>"), `${route} has no title`);
  assert(html.includes("<h1>"), `${route} has no h1`);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!href.startsWith("/aiagent")) continue;
    const target = href.split("#", 1)[0];
    assert(existsSync(routeToFile(target)), `${route} links to missing ${target}`);
  }
}

for (const name of ["llms.txt", "llms-full.txt"]) {
  const content = readFileSync(join(docsRoot, name), "utf8");
  for (const document of index.documents) assert(content.includes(document.url), `${name} omits ${document.url}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`AI-agent documentation valid: ${index.documents.length} documents, ${routes.size} crawlable routes.`);