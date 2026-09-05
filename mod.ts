// JSR entry point - exports all public API from the library
export { createPgbloom, type PgbloomClient, type PgbloomOptions } from "./src/client/index.ts";

// Browser entry point
export * from "./src/browser.ts";

// Server entry point
export * from "./src/server.ts";

// Default export
import { createPgbloom } from "./src/client/index.ts";
export default createPgbloom;