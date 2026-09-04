/**
 * Writes a `package.json` to `dist/cjs/` declaring CommonJS semantics.
 *
 * The root `package.json` sets `"type": "module"`, which makes Node treat
 * every `.js` file under `dist/` as ESM. The CJS build outputs CommonJS
 * code (uses `Object.defineProperty(exports, ...)`), so we need an
 * explicit `"type": "commonjs"` override in that subdirectory.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjsPkgPath = resolve(__dirname, "..", "dist", "cjs", "package.json");

mkdirSync(dirname(cjsPkgPath), { recursive: true });

writeFileSync(
  cjsPkgPath,
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
  "utf8",
);

console.log(`✓ Wrote ${cjsPkgPath}`);
