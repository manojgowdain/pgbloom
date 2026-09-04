/**
 * PGBloom Integration Test Runner.
 *
 * Orchestrates the test suite:
 * 1. Connect to PostgreSQL
 * 2. Start Express server
 * 3. Start Fastify server
 * 4. Run integration tests against both servers
 * 5. Run multi-server tests
 * 6. Stop servers
 * 7. Clean up
 * 8. Print summary
 */

import { setup, teardown, connectionString } from "./setup.js";
import { startExpressServer, stopExpressServer, ExpressPgBloomServer } from "./servers/express-server.js";
import { startFastifyServer, stopFastifyServer, FastifyPgBloomServer } from "./servers/fastify-server.js";
import { RUN_ID } from "./helpers/test-data.js";
import { printSummary, getResults, resetResults } from "./helpers/assertions.js";

// ============================================================
// Test modules (dynamically imported)
// ============================================================
const testModules = [
  "./integration/cache.test.js",
  "./integration/pubsub.test.js",
  "./integration/queue.test.js",
  "./integration/locks.test.js",
  "./integration/leader.test.js",
  "./integration/scheduler.test.js",
  "./integration/rate-limit.test.js",
  "./integration/events.test.js",
  "./integration/counters.test.js",
  "./integration/bloom.test.js",
  "./integration/concurrency.test.js",
  "./integration/errors.test.js",
];

// ============================================================
// Multi-server test modules
// ============================================================
const multiServerTestModules = [
  "./integration/multi-server.test.js",
];

async function runAllTests(baseUrl, serverName) {
  console.log(`\n=== ${serverName.toUpperCase()} tests ===`);
  resetResults();

  for (const modulePath of testModules) {
    try {
      const mod = await import(modulePath);
      if (typeof mod.runTests === "function") {
        console.log(`\n--- ${modulePath} ---`);
        await mod.runTests(baseUrl);
      } else {
        console.log(`  SKIP  ${modulePath} (no runTests export)`);
      }
    } catch (err) {
      console.error(`  ERROR loading ${modulePath}:`, err.message);
    }
  }
}

async function runMultiServerTests(serverClass, connectionString, serverName) {
  console.log(`\n=== MULTI-SERVER ${serverName.toUpperCase()} tests ===`);
  resetResults();

  // Create two server instances
  const server1 = new serverClass();
  const server2 = new serverClass();

  // Pick random ports
  const PORT1 = 3100 + Math.floor(Math.random() * 100);
  const PORT2 = PORT1 + 1;
  const URL1 = `http://127.0.0.1:${PORT1}`;
  const URL2 = `http://127.0.0.1:${PORT2}`;

  try {
    await server1.start(PORT1, connectionString);
    await server2.start(PORT2, connectionString);
    console.log(`  Server 1: ${URL1}`);
    console.log(`  Server 2: ${URL2}`);

    // Run multi-server tests against both URLs
    for (const modulePath of multiServerTestModules) {
      try {
        const mod = await import(modulePath);
        if (typeof mod.runTests === "function") {
          console.log(`\n--- ${modulePath} ---`);
          // The multi-server test module expects global URL1/URL2
          // We need to monkey-patch or adapt - let's call a modified version
          await mod.runTestsMulti(URL1, URL2);
        } else {
          console.log(`  SKIP  ${modulePath} (no runTests export)`);
        }
      } catch (err) {
        console.error(`  ERROR loading ${modulePath}:`, err.message);
      }
    }
  } finally {
    await server1.stop();
    await server2.stop();
  }
}

async function main() {
  console.log("==================================================");
  console.log(`PGBLOOM API INTEGRATION TEST — ${RUN_ID}`);
  console.log("==================================================");
  console.log("");

  // Verify DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error("");
    console.error("ERROR: DATABASE_URL environment variable is required.");
    console.error("Example: set DATABASE_URL=postgresql://postgres:StrongPass123@skobase.skoegle.cloud:5433/iotkit?statusColor=&env=local&name=New%20Connection&tLSMode=0&usePrivateKey=false&safeModeLevel=0&advancedSafeModeLevel=0&driverVersion=0&showSystemSchemas=0&driverVersion=0&lazyload=False");
    console.error("");
    process.exit(1);
  }

  console.log("Setting up test environment...");
  console.log(`RUN_ID: ${RUN_ID}`);

  const { client, localStore } = await setup();
  console.log("✓ Connected to PostgreSQL and created PGBloom client");
  console.log("✓ Local store ready:", !!localStore);

  let expressServer, fastifyServer;
  let expressUrl, fastifyUrl;

  // Find free ports
  const expressPort = 3000 + Math.floor(Math.random() * 100);
  const fastifyPort = 3200 + Math.floor(Math.random() * 100);
  expressUrl = `http://127.0.0.1:${expressPort}`;
  fastifyUrl = `http://127.0.0.1:${fastifyPort}`;

  try {
    // Start Express server
    console.log(`\nStarting Express server on port ${expressPort}...`);
    await startExpressServer(expressPort, connectionString);
    console.log("✓ Express server started");

    // Start Fastify server
    console.log(`Starting Fastify server on port ${fastifyPort}...`);
    await startFastifyServer(fastifyPort, connectionString);
    console.log("✓ Fastify server started");

    // Run integration tests on Express
    await runAllTests(expressUrl, "Express");

    // Run integration tests on Fastify
    await runAllTests(fastifyUrl, "Fastify");

    // Run multi-server tests (Express)
    await runMultiServerTests(ExpressPgBloomServer, connectionString, "Express");

    // Run multi-server tests (Fastify)
    await runMultiServerTests(FastifyPgBloomServer, connectionString, "Fastify");

  } finally {
    console.log("\nStopping Express server...");
    await stopExpressServer();
    console.log("✓ Express server stopped");

    console.log("Stopping Fastify server...");
    await stopFastifyServer();
    console.log("✓ Fastify server stopped");

    console.log("Cleaning up...");
    await teardown();
    console.log("✓ Cleanup complete");
  }

  printSummary();
  const results = getResults();
  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});