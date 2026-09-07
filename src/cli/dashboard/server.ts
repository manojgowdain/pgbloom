/**
 * PGBloom Dashboard Server - Express-based local dashboard.
 */

import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DashboardConfig {
  port: number;
  host: string;
  dbUrl: string;
  config: any;
}

async function startDashboard(config: DashboardConfig) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Serve static files
  const publicDir = join(__dirname, "public");
  app.use(express.static(publicDir));
  app.use(express.json());

  // Health check
  app.get("/api/health", (req: any, res: any) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Dashboard data endpoints
  app.get("/api/status", async (req: any, res: any) => {
    try {
      const pg = await import("pg");
      const pool = new pg.Pool({ connectionString: config.dbUrl, max: 1 });
      const client = await pool.connect();

      try {
        // Database version
        const versionResult = await client.query("SELECT version()");

        // Table stats
        const tablesResult = await client.query(`
          SELECT
            schemaname,
            relname as table_name,
            n_live_tup as row_count
          FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          ORDER BY relname
        `);

        // Cache stats
        let cacheStats = { total: 0, active: 0, expired: 0 };
        try {
          const cacheResult = await client.query(`
            SELECT
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
              COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
            FROM pgsnap_cache
          `);
          cacheStats = {
            total: parseInt(cacheResult.rows[0].total),
            active: parseInt(cacheResult.rows[0].active),
            expired: parseInt(cacheResult.rows[0].expired),
          };
        } catch {}

        // Auth stats
        let authStats = { users: 0, sessions: 0, verified: 0 };
        try {
          const usersResult = await client.query("SELECT COUNT(*) as count FROM pgbloom_users");
          const sessionsResult = await client.query("SELECT COUNT(*) as count FROM pgbloom_sessions WHERE expires_at > NOW() AND revoked_at IS NULL");
          const verifiedResult = await client.query("SELECT COUNT(*) as count FROM pgbloom_users WHERE email_verified = TRUE");
          authStats = {
            users: parseInt(usersResult.rows[0].count),
            sessions: parseInt(sessionsResult.rows[0].count),
            verified: parseInt(verifiedResult.rows[0].count),
          };
        } catch {}

        // OTP stats
        let otpStats = { pending: 0, used: 0, expired: 0 };
        try {
          const otpResult = await client.query(`
            SELECT
              COUNT(*) FILTER (WHERE used = FALSE AND expires_at > NOW()) as pending,
              COUNT(*) FILTER (WHERE used = TRUE) as used,
              COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
            FROM pgbloom_otp_codes
          `);
          otpStats = {
            pending: parseInt(otpResult.rows[0].pending),
            used: parseInt(otpResult.rows[0].used),
            expired: parseInt(otpResult.rows[0].expired),
          };
        } catch {}

        // Queue stats
        let queueStats: any[] = [];
        try {
          const queueResult = await client.query(`
            SELECT queue_name,
              COUNT(*) FILTER (WHERE status = 'pending') as pending,
              COUNT(*) FILTER (WHERE status = 'processing') as processing,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM pgsnap_queue
            GROUP BY queue_name
          `);
          queueStats = queueResult.rows;
        } catch {}

        res.json({
          database: {
            connected: true,
            version: versionResult.rows[0].version.split(" ")[1],
          },
          cache: cacheStats,
          auth: authStats,
          otp: otpStats,
          queues: queueStats,
          tables: tablesResult.rows,
          config: config.config,
          timestamp: new Date().toISOString(),
        });
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Model CRUD endpoints
  app.get("/api/models", async (req: any, res: any) => {
    try {
      const pg = await import("pg");
      const pool = new pg.Pool({ connectionString: config.dbUrl, max: 1 });
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name NOT LIKE 'pgbloom_%' AND table_name NOT LIKE 'pgsnap_%'
          ORDER BY table_name
        `);

        const models = [];
        for (const row of result.rows) {
          const countResult = await client.query(`SELECT COUNT(*) FROM ${row.table_name}`);
          const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [row.table_name]);

          models.push({
            name: row.table_name,
            count: parseInt(countResult.rows[0].count),
            columns: columnsResult.rows,
          });
        }

        res.json({ models });
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/models/:name", async (req: any, res: any) => {
    try {
      const { name } = req.params;
      const { limit = "20", skip = "0", sort, select } = req.query;

      const pg = await import("pg");
      const pool = new pg.Pool({ connectionString: config.dbUrl, max: 1 });
      const client = await pool.connect();

      try {
        // Validate table exists
        const tableCheck = await client.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [name]
        );
        if (tableCheck.rows.length === 0) {
          return res.status(404).json({ error: "Model not found" });
        }

        // Build query
        let selectClause = "*";
        if (select && typeof select === "string") {
          selectClause = select.split(",").map((s: string) => s.trim()).join(", ");
        }

        let orderBy = "";
        if (sort && typeof sort === "string") {
          try {
            const sortObj = JSON.parse(sort);
            const parts = Object.entries(sortObj).map(([k, v]) => `${k} ${v === 1 || v === "1" ? "ASC" : "DESC"}`);
            orderBy = `ORDER BY ${parts.join(", ")}`;
          } catch {}
        }

        const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
        const skipNum = parseInt(skip as string, 10) || 0;

        const dataResult = await client.query(
          `SELECT ${selectClause} FROM ${name} ${orderBy} LIMIT $1 OFFSET $2`,
          [limitNum, skipNum]
        );

        const countResult = await client.query(`SELECT COUNT(*) FROM ${name}`);

        res.json({
          model: name,
          data: dataResult.rows,
          pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: limitNum,
            skip: skipNum,
          },
        });
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/models/:name", async (req: any, res: any) => {
    try {
      const { name } = req.params;
      const data = req.body;

      const pg = await import("pg");
      const pool = new pg.Pool({ connectionString: config.dbUrl, max: 1 });
      const client = await pool.connect();

      try {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const result = await client.query(
          `INSERT INTO ${name} (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
          values
        );

        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Activity stream - WebSocket
  const clients = new Set<any>();

  wss.on("connection", (ws: any) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  // Broadcast activity
  function broadcastActivity(activity: any) {
    const message = JSON.stringify({ type: "activity", data: activity, timestamp: new Date().toISOString() });
    for (const client of clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    }
  }

  // Periodic status updates
  setInterval(async () => {
    try {
      const pg = await import("pg");
      const pool = new pg.Pool({ connectionString: config.dbUrl, max: 1 });
      const client = await pool.connect();

      try {
        const cacheResult = await client.query(`
          SELECT COUNT(*) FILTER (WHERE expires_at > NOW()) as active FROM pgsnap_cache
        `);
        broadcastActivity({
          type: "cache_stats",
          activeKeys: parseInt(cacheResult.rows[0].active),
        });
      } finally {
        client.release();
        await pool.end();
      }
    } catch {}
  }, 5000);

  // Start server
  return new Promise<void>((resolve) => {
    server.listen(config.port, config.host, () => {
      console.log(`Dashboard server running on http://${config.host}:${config.port}`);
      resolve();
    });
  });
}

// Entry point
const [, , portArg, hostArg] = process.argv;
const port = parseInt(portArg || "3000", 10);
const host = hostArg || "127.0.0.1";
const dbUrl = process.env.PGBLOOM_DB_URL || "";
const configStr = process.env.PGBLOOM_CONFIG || "{}";
const config = JSON.parse(configStr);

if (!dbUrl) {
  console.error("PGBLOOM_DB_URL environment variable is required");
  process.exit(1);
}

startDashboard({ port, host, dbUrl, config }).catch((err) => {
  console.error("Failed to start dashboard:", err);
  process.exit(1);
});