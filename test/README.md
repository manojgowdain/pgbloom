# PGBloom Integration Test Suite

Real HTTP integration tests for PGBloom using Express server.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- `DATABASE_URL` environment variable set

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

## Installation

```bash
npm install
npm run build
```

## Test Commands

```bash
# Run all integration tests
npm run test:integration

# Run load test
npm run test:integration:load

# Run unit tests (vitest)
npm test
```

## Test Structure

```
test/
├── servers/
│   └── express-server.js       # Express HTTP server wrapping PGBloom
├── integration/
│   ├── cache.test.js           # Cache: set/get/delete/ttl/exists
│   ├── pubsub.test.js          # Pub/Sub: publish/subscribe/unsubscribe
│   ├── queue.test.js           # Queue: enqueue/dequeue/complete/fail/retry/priority
│   ├── locks.test.js           # Locks: tryLock/lock/unlock/TTL
│   ├── leader.test.js          # Leader election: acquire/release/status
│   ├── scheduler.test.js       # Scheduler: delayed/recurring/cancel
│   ├── rate-limit.test.js      # Rate limit: fixed/sliding/token-bucket
│   ├── events.test.js          # Events: emit/listen/history/replay
│   ├── counters.test.js        # Counters: inc/dec/add/set/atomicity
│   ├── bloom.test.js           # Bloom filter: add/has/stats/false-positive
│   ├── concurrency.test.js     # 100+ concurrent operations
│   ├── multi-server.test.js    # 2 Express servers cross-coordination
│   └── errors.test.js          # Error handling: 400/404/500
├── load/
│   └── load.test.js            # High-throughput load test
├── helpers/
│   ├── http.js                 # fetch wrapper
│   ├── test-data.js            # RUN_ID, namespaced keys, cleanup
│   └── assertions.js           # Test runner + assertions
├── setup.js                    # DB connection, client creation
├── run-tests.js                # Orchestrator
└── README.md
```

## Features Tested

| Feature | HTTP Tests | Concurrency | Multi-Server |
|---------|-----------|-------------|--------------|
| Cache | ✓ | ✓ (100) | ✓ |
| Pub/Sub | ✓ | ✓ (100) | ✓ |
| Queue | ✓ | ✓ (100) | ✓ |
| Locks | ✓ | ✓ (100) | ✓ |
| Leader Election | ✓ | | ✓ |
| Scheduler | ✓ | | |
| Rate Limit | ✓ | ✓ (100) | ✓ |
| Events | ✓ | ✓ (100) | ✓ |
| Counters | ✓ | ✓ (1000) | ✓ |
| Bloom Filter | ✓ | | |
| Local Store (SSDiskDB) | | | |
| Error Handling | ✓ | | |

## Multi-Server Tests

The multi-server test starts **two Express servers** on different ports (e.g., 3100 and 3101), both connecting to the same PostgreSQL database. This tests real distributed coordination:

- Cache invalidation across servers
- Pub/Sub message delivery to all subscribers
- Queue job processing from any server
- Lock/leader coordination via PostgreSQL
- Global rate limiting across servers
- Event delivery to listeners on different servers
- Atomic counters across servers

## Local Storage (SSDiskDB)

Local persistent storage using `ssdiskdb` is tested independently:

```bash
# The test suite creates a temporary directory:
/tmp/pgbloom-test-<RUN_ID>-local-XXXXX/
```

This is **not** wired into the main PGBloom client (the library doesn't expose `localCache` option in `createPgbloom`). Instead, tests use `createLocalStore` directly from the library to verify the storage layer works correctly.

## Test Isolation

Every test run gets a unique `RUN_ID` (timestamp + PID + random suffix). All test data is prefixed:

```
pgbloom-test-<RUN_ID>:cache:*
pgbloom-test-<RUN_ID>:queue:*
pgbloom-test-<RUN_ID>:lock:*
pgbloom-test-<RUN_ID>:leader:*
pgbloom-test-<RUN_ID>:event:*
pgbloom-test-<RUN_ID>:counter:*
```

After tests complete, only rows matching this prefix are cleaned up. No other database data is touched.

## Load Test Configuration

```bash
CONCURRENCY=50 ITERATIONS=1000 npm run test:integration:load
```

Environment variables:
- `CONCURRENCY` — parallel operations (default: 50)
- `ITERATIONS` — cache/rate-limit iterations (default: 1000)
- `QUEUE_JOBS` — queue jobs (default: 1000)
- `EVENTS` — event emits (default: 1000)
- `COUNTER_INCREMENTS` — counter increments (default: 1000)

## Output Format

```
==================================================
PGBLOOM API INTEGRATION TEST — 20260902-12345-abc123
==================================================

=== ./integration/cache.test.js ===
  PASS  Cache SET and GET  (12ms)
  PASS  Cache GET missing key returns 404  (3ms)
  ...

==================================================
PGBLOOM API INTEGRATION TEST RESULT
==================================================
Passed:  47
Failed:  0
Skipped: 3
==================================================

PGBLOOM INTEGRATION TEST: PASS
==================================================
```

## Failure Output

```
  FAIL  Cache TTL expiration  (350ms)

  FAIL: Cache TTL expiration
  Error: waitFor timed out: value should be expired
  timeoutMs: 5000
  lastResult: { exists: true, value: "ttl-test" }

  Stack: Error: waitFor timed out...
```

## Skipped Features

- **Fastify server**: Not implemented (user chose Express only)
- **Search/AI**: Not implemented in PGBloom yet
- **Scheduler worker processing**: Test only verifies job creation; actual worker execution requires separate process

## Troubleshooting

### Connection refused
Ensure PostgreSQL is accessible and `DATABASE_URL` is correct.

### Tests hang
Increase timeouts or check for unclosed listeners/connections.

### Port conflicts
Tests use random ports. If conflicts occur, retry.

### Database cleanup
If cleanup fails, manually delete test rows:
```sql
DELETE FROM pgsnap_cache WHERE key LIKE 'pgbloom-test-%';
DELETE FROM pgsnap_queue WHERE queue_name LIKE 'pgbloom-test-%';
-- etc for all pgbloom tables
```