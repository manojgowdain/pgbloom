# PGBloom test suite

## Canonical workflow

Run the complete reproducible suite with Docker PostgreSQL:

```bash
npm run test:docker
```

The command starts `postgres:16` with a Compose health check, builds the package, runs unit tests, runs the direct PostgreSQL integration suite, runs the restart/persistence smoke test, and executes `docker compose down -v --remove-orphans` in a cleanup path.

The test database is `pgbloom_test`, owned by `pgbloom`, and is exposed on host port `55432` by default. Set `PGBLOOM_TEST_PORT` to choose another host port. Set `DATABASE_URL` to override the connection string used by the Node tests.

## Test commands

```bash
npm test                         # Vitest unit suite; integration files skip without DATABASE_URL
npm run test:integration         # direct PostgreSQL suite
npm run test:persistence         # PostgreSQL stop/start persistence smoke test
npm run test:coverage            # V8 coverage report
npm run test:integration:legacy  # existing HTTP and multi-server runner
npm run test:integration:load    # controlled load test
```

The direct suite is the CI gate because it fails through Vitest on any assertion or setup error. The legacy HTTP runner remains available for transport and multi-server experiments, but it is not the canonical gate because it predates the direct client suite and has broader server-adapter assumptions.

## Coverage

`npm run test:coverage` uses Vitest's V8 provider and reports statements, branches, functions, and lines. It is intentionally separate from the Docker workflow because coverage is collected from the fast unit suite; the Docker workflow validates behavior against PostgreSQL.

## What is covered

The direct PostgreSQL suite verifies:

- PostgreSQL initialization and pooled connections
- Cache set, get, update, delete, null values, expiration, Bloom-assisted misses, and invalid keys
- Queue enqueue, dequeue, visibility timeout, retry, completion, and statistics
- Atomic concurrent counters
- Schema-driven CRUD creation, reads, custom unique primary keys, numeric mapping, updates, and deletes
- Transaction rollback without partial state
- Argon2id authentication, JWT access tokens, refresh-token rotation, logout, and current-user lookup
- SSDiskDB persistence and MemoryCache reads
- Bloom membership, duplicate insertion, false-negative behavior, and JSON serialization
- PostgreSQL lock contention and ownership release
- LISTEN/NOTIFY Pub/Sub and persistent event notification/replay
- Fixed-window, sliding-window, and token-bucket rate limits

The restart smoke test verifies PostgreSQL-backed cache and counter values after `docker compose down` followed by `docker compose up --wait`. Local disk persistence is verified by closing and reopening the store directory.

## Docker architecture

```text
Developer or GitHub Actions
          |
          v
scripts/run-postgres-tests.mjs
          |
          v
Docker Compose: postgres:16
          |
          v
PGBloom client and Vitest
          |
          +-- cache / queue / counters / CRUD / auth
          +-- Bloom filter / locks / rate limits
          +-- Pub/Sub / events / transactions
          +-- SSDiskDB local persistence
```

PGBloom does not install a PostgreSQL extension. It creates ordinary `pgsnap_*` and `pgbloom_*` tables and uses PostgreSQL pooling, parameterized SQL, `LISTEN/NOTIFY`, transactions, and row-locking primitives.

## Isolation and cleanup

Direct tests use a process-specific run ID in keys, queue names, event types, counters, and model table names. Each client closes its pool in `afterAll`. The Docker runner removes the test volume and network on success or failure. The suite does not claim to test PostgreSQL extension lifecycle because this project does not ship an extension.
