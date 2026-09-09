import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = join(docsRoot, "public", "aiagent");
const distRoot = join(docsRoot, "dist");
const index = JSON.parse(readFileSync(join(publicRoot, "index.json"), "utf8"));

assert.equal(index.project, "PGBloom");
assert.equal(index.documentation, "/aiagent/");
assert.equal(index.documents.length, 24);

for (const document of index.documents) {
  const slug = document.url.replace("/aiagent/", "").replace(/\/$/, "");
  const sourcePage = join(publicRoot, slug, "index.html");
  const builtPage = join(distRoot, "aiagent", slug, "index.html");

  assert.ok(existsSync(sourcePage), `missing source route: ${document.url}`);
  assert.ok(existsSync(builtPage), `missing built route: ${document.url}`);

  const html = readFileSync(builtPage, "utf8");
  assert.match(html, /<title>[^<]+<\/title>/, `${document.url} has no title`);
  assert.match(html, /<h1>[^<]+<\/h1>/, `${document.url} has no heading`);
  assert.match(html, /href="\/aiagent\//, `${document.url} has no AI-agent navigation`);
}

for (const file of ["index.html", "index.json", "llms.txt", "llms-full.txt"]) {
  assert.ok(existsSync(join(distRoot, "aiagent", file)), `missing built AI-agent file: ${file}`);
}

assert.ok(existsSync(join(distRoot, "index.html")), "missing React app entrypoint");
const assets = readdirSync(join(distRoot, "assets"));
const javascript = assets.find((file) => file.endsWith(".js"));
assert.ok(javascript, "missing React JavaScript bundle");
const bundle = readFileSync(join(distRoot, "assets", javascript), "utf8");
assert.match(bundle, /AI index|AI Agent Documentation/, "React bundle does not contain routed AI-agent docs");
assert.match(bundle, /Interactive Playground/, "React bundle does not contain the playground");

console.log(`Docs route smoke test passed: ${index.documents.length} AI-agent routes checked.`);