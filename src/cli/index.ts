/**
 * PGBloom CLI - Command line interface for PGBloom.
 */

import { cac } from "cac";
import { createPgbloom } from "../client/index.js";
import { validateConnectionString } from "../utils/validation.js";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cli = cac("pgbloom");

cli.version("1.6.0");
cli.help();

// Global options
cli.option("--config <path>", "Path to pgbloom.config.js", { default: "./pgbloom.config.js" });
cli.option("--database-url <url>", "PostgreSQL connection string");

// Helper to load config
async function loadConfig(configPath: string) {
  try {
    const configModule = await import(resolve(configPath));
    return configModule.default || configModule;
  } catch (err) {
    console.warn("No config file found, using defaults");
    return {};
  }
}

// Helper to get database URL
function getDbUrl(databaseUrl: string | undefined, config: any): string {
  return databaseUrl || config.database?.url || process.env.DATABASE_URL || "";
}

// ============================================================
// pgbloom init - Generate config file
// ============================================================
cli.command("init [path]", "Generate pgbloom.config.js")
  .option("--force", "Overwrite existing config")
  .action(async (path = "./pgbloom.config.js", options: any) => {
    const fs = await import("fs");
    const fullPath = resolve(path);

    if (fs.existsSync(fullPath) && !options.force) {
      console.error(`Config file already exists at ${fullPath}. Use --force to overwrite.`);
      process.exit(1);
    }

    const config = `export default {
  database: {
    url: process.env.DATABASE_URL
  },

  cache: {
    enabled: true,
    ttl: 60000
  },

  auth: {
    enabled: true,
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "30d"
  },

  otp: {
    enabled: true,
    expiry: "5m",
    maxAttempts: 5
  },

  model: {
    autoCreateTables: true,
    cache: false
  }
};`;

    fs.writeFileSync(fullPath, config);
    console.log(`✓ Created ${fullPath}`);
  });

// ============================================================
// pgbloom run - Start dashboard
// ============================================================
cli.command("run", "Start PGBloom dashboard")
  .option("--port <port>", "Port to run dashboard on", { default: "3000" })
  .option("--host <host>", "Host to bind to", { default: "127.0.0.1" })
  .action(async (options: any) => {
    const port = parseInt(options.port, 10);
    const host = options.host;

    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required. Set --database-url or DATABASE_URL env var.");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    console.log("Starting PGBloom Dashboard...");
    console.log(`Loading config from ${options.config || "./pgbloom.config.js"}...`);

    // Create PGBloom client
    const pgbloom = await createPgbloom(dbUrl, {
      bloomFilter: true,
      bloom: { expectedItems: 10000, falsePositiveRate: 0.01 },
      lock: { defaultTtl: 30000 },
      scheduler: { workerId: `dashboard-${Date.now()}` },
      model: config.model as any,
      auth: config.auth as any,
      otp: config.otp as any,
    });

    console.log("✓ Connected to PostgreSQL");
    console.log("✓ PGBloom client initialized");

    // Start dashboard server
    const dashboardPath = join(__dirname, "dashboard", "server.js");
    const serverProcess = spawn("node", [dashboardPath, String(port), host], {
      stdio: "inherit",
      env: {
        ...process.env,
        PGBLOOM_DB_URL: dbUrl,
        PGBLOOM_CONFIG: JSON.stringify(config),
      },
    });

    console.log(`\n🚀 PGBloom Dashboard running at http://${host}:${port}`);
    console.log("Press Ctrl+C to stop\n");

    serverProcess.on("close", async (code) => {
      await pgbloom.close();
      process.exit(code ?? 0);
    });

    // Handle shutdown
    process.on("SIGINT", () => {
      serverProcess.kill("SIGINT");
    });
    process.on("SIGTERM", () => {
      serverProcess.kill("SIGTERM");
    });
  });

// ============================================================
// pgbloom migrate - Run migrations
// ============================================================
cli.command("migrate", "Run database migrations")
  .action(async (options: any) => {
    console.log("Running migrations...");

    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl, {
      model: { autoCreateTables: true } as any,
    });

    console.log("✓ Tables created/updated");
    await pgbloom.close();
    console.log("✓ Migration complete");
  });

// ============================================================
// pgbloom status - Show connection status
// ============================================================
cli.command("status", "Show PGBloom status")
  .action(async (options: any) => {
    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl);
    const pool = (pgbloom as any).pool;

    try {
      const result = await pool.query("SELECT version()");
      console.log("Database: Connected");
      console.log(`Version: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}`);

      // Check tables
      const tablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE 'pgbloom_%' OR table_name LIKE 'pgsnap_%')
        ORDER BY table_name
      `);

      console.log("\nTables:");
      for (const row of tablesResult.rows) {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
        console.log(`  ${row.table_name}: ${countResult.rows[0].count} rows`);
      }
    } catch (err) {
      console.error("Database: Disconnected");
      console.error(err);
    } finally {
      await pgbloom.close();
    }
  });

// ============================================================
// pgbloom models - List registered models
// ============================================================
cli.command("models", "List registered models")
  .action(async (options: any) => {
    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl);
    const pool = (pgbloom as any).pool;

    try {
      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name NOT LIKE 'pgbloom_%' AND table_name NOT LIKE 'pgsnap_%'
        AND table_name NOT IN ('pg_stat_statements', 'pg_stat_statements_info')
        ORDER BY table_name
      `);

      console.log("Models:");
      if (result.rows.length === 0) {
        console.log("  (none)");
      } else {
        for (const row of result.rows) {
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${row.table_name}`);
          console.log(`  ${row.table_name}: ${countResult.rows[0].count} rows`);
        }
      }
    } finally {
      await pgbloom.close();
    }
  });

// ============================================================
// pgbloom cache - Cache management
// ============================================================
cli.command("cache", "Cache management")
  .option("--clear", "Clear all cache")
  .option("--clear-expired", "Clear expired cache entries")
  .option("--stats", "Show cache statistics")
  .action(async (options: any) => {
    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl, { bloomFilter: true });

    if (options.clear) {
      await pgbloom.clearCache();
      console.log("✓ Cache cleared");
    } else if (options.clearExpired) {
      const deleted = await pgbloom.clearExpiredCache();
      console.log(`✓ Cleared ${deleted} expired entries`);
    } else if (options.stats) {
      const result = await (pgbloom as any).pool.query(`
        SELECT COUNT(*) as total,
               COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
               COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
        FROM pgsnap_cache
      `);
      console.log("Cache Statistics:");
      console.log(`  Total entries: ${result.rows[0].total}`);
      console.log(`  Active: ${result.rows[0].active}`);
      console.log(`  Expired: ${result.rows[0].expired}`);
    } else {
      console.log("Use --clear, --clear-expired, or --stats");
    }

    await pgbloom.close();
  });

// ============================================================
// pgbloom auth create-user - Create a user
// ============================================================
cli.command("auth:create-user <email> <password> [name]", "Create a user")
  .action(async (email: string, password: string, name: string | undefined, options: any) => {
    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl, { auth: config.auth } as any);
    const auth = pgbloom.auth(config.auth);

    const result = await auth.signup({ email, password, name });
    console.log(`✓ User created: ${result.user.email} (${result.user.id})`);
    console.log(`Access token: ${result.accessToken.slice(0, 20)}...`);
    console.log(`Refresh token: ${result.refreshToken.slice(0, 20)}...`);

    await pgbloom.close();
  });

// ============================================================
// pgbloom auth list-users - List all users
// ============================================================
cli.command("auth:list-users", "List all users")
  .action(async (options: any) => {
    const config = await loadConfig(options.config || "./pgbloom.config.js");
    const dbUrl = getDbUrl(options.databaseUrl, config);

    if (!dbUrl) {
      console.error("Database URL is required");
      process.exit(1);
    }

    validateConnectionString(dbUrl);

    const pgbloom = await createPgbloom(dbUrl, { auth: config.auth } as any);
    const auth = pgbloom.auth(config.auth);

    const users = await auth.users.find({}, { select: ["id", "email", "name", "emailVerified", "createdAt"] });
    console.log("Users:");
    for (const user of users) {
      console.log(`  ${user.id}: ${user.email} (${user.name || "no name"}) - Verified: ${user.emailVerified}`);
    }

    await pgbloom.close();
  });

// Parse
cli.parse();