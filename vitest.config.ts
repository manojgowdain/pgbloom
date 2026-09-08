import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["**/src/**/*.ts"],
      exclude: ["**/src/cli/**", "**/src/cli.ts", "**/src/**/*.d.ts"],
      allowExternal: true,
      excludeAfterRemap: false,
      reporter: ["text", "html", "lcov"],
    },
  },
  resolve: {
    alias: {
      "pgbloom": path.resolve(__dirname, "./src/index.ts"),
      "pgsnap": path.resolve(__dirname, "./dist/esm/index.js"),
    },
  },
});