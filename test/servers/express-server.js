/**
 * Express integration test server for PGBloom.
 *
 * Exposes HTTP endpoints that map directly to the PGBloom client API.
 * Run with: node test/servers/express-server.js <port>
 */

import express from "express";
import { createPgbloom } from "../../dist/esm/index.js";
import { RUN_ID, key, channel, queueName, scheduleName, eventType, counterKey, lockKey, resourceKey } from "../helpers/test-data.js";

// ============================================================
// Server class - supports multiple independent instances
// ============================================================
export class ExpressPgBloomServer {
  constructor() {
    this.app = express();
    this.app.use(express.json({ limit: "1mb" }));
    this.client = null;
    this.server = null;
    this.pubsubChannels = new Map();
    this.eventListeners = new Map();
    this.receivedMessages = new Map();
    this.receivedEvents = new Map();
    this._setupRoutes();
  }

  // ============================================================
  // Helpers
  // ============================================================
  _makeSubscriberId() {
    return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  _makeListenerId() {
    return `lst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  _pushMessage(subscriberId, msg) {
    const arr = this.receivedMessages.get(subscriberId) ?? [];
    arr.push({ receivedAt: new Date().toISOString(), ...msg });
    if (arr.length > 1000) arr.shift();
    this.receivedMessages.set(subscriberId, arr);
  }

  _pushEvent(listenerId, event) {
    const arr = this.receivedEvents.get(listenerId) ?? [];
    arr.push({ receivedAt: new Date().toISOString(), ...event });
    if (arr.length > 1000) arr.shift();
    this.receivedEvents.set(listenerId, arr);
  }

  // ============================================================
  // Route setup
  // ============================================================
  _setupRoutes() {
    const app = this.app;
    const self = this;

    // Health endpoints
    app.get("/health", (req, res) => {
      res.json({ ok: true, runId: RUN_ID });
    });

    app.get("/health/database", async (req, res) => {
      try {
        await self.client.pool.query("SELECT 1");
        res.json({ ok: true, connected: true });
      } catch (e) {
        res.status(500).json({ ok: false, connected: false, error: e.message });
      }
    });

    // CACHE endpoints
    app.post("/cache", async (req, res) => {
      try {
        const { key: k, value, ttl } = req.body;
        if (!k) return res.status(400).json({ error: "key required" });
        const expiry = ttl ? new Date(Date.now() + ttl) : undefined;
        await self.client.setCache(k, value, expiry);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/cache/:key", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        if (value === null) return res.status(404).json({ error: "not found" });
        res.json({ value });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.head("/cache/:key", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        if (value === null) return res.status(404).end();
        res.status(200).end();
      } catch (e) {
        res.status(500).end();
      }
    });

    app.get("/cache/:key/exists", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        res.json({ exists: value !== null });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/cache/:key", async (req, res) => {
      try {
        await self.client.deleteCache(req.params.key);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/cache/clear-expired", async (req, res) => {
      try {
        const deleted = await self.client.clearExpiredCache();
        res.json({ deleted });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // PUBSUB endpoints
    app.post("/pubsub/publish", async (req, res) => {
      try {
        const { channel: ch, message } = req.body;
        if (!ch) return res.status(400).json({ error: "channel required" });
        await self.client.publish(ch, message);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/pubsub/subscribe", async (req, res) => {
      try {
        const { channel: ch } = req.body;
        if (!ch) return res.status(400).json({ error: "channel required" });

        const subscriberId = self._makeSubscriberId();
        const unsubscribe = await self.client.subscribe(ch, (channel, payload) => {
          self._pushMessage(subscriberId, { channel, payload });
        });

        self.pubsubChannels.set(subscriberId, { channel: ch, unsubscribe });
        self.receivedMessages.set(subscriberId, []);

        res.json({ subscriberId, channel: ch });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/pubsub/subscribe/:subscriberId", async (req, res) => {
      try {
        const { subscriberId } = req.params;
        const sub = self.pubsubChannels.get(subscriberId);
        if (!sub) return res.status(404).json({ error: "subscriber not found" });
        await sub.unsubscribe();
        self.pubsubChannels.delete(subscriberId);
        self.receivedMessages.delete(subscriberId);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/pubsub/messages/:subscriberId", (req, res) => {
      const { subscriberId } = req.params;
      const msgs = self.receivedMessages.get(subscriberId) ?? [];
      self.receivedMessages.set(subscriberId, []);
      res.json({ messages: msgs });
    });

    app.get("/pubsub/channels", (req, res) => {
      const channels = [...new Set([...self.pubsubChannels.values()].map((s) => s.channel))];
      res.json({ channels });
    });

    // SSE endpoint for real-time pubsub
    app.get("/pubsub/events", (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const subscriberId = self._makeSubscriberId();
      const interval = setInterval(() => {
        const msgs = self.receivedMessages.get(subscriberId) ?? [];
        if (msgs.length > 0) {
          for (const msg of msgs) {
            res.write(`data: ${JSON.stringify(msg)}\n\n`);
          }
          self.receivedMessages.set(subscriberId, []);
        }
      }, 100);

      req.on("close", () => {
        clearInterval(interval);
        self.pubsubChannels.delete(subscriberId);
        self.receivedMessages.delete(subscriberId);
      });
    });

    // QUEUE endpoints
    app.post("/queue/:name/enqueue", async (req, res) => {
      try {
        const { name } = req.params;
        const { payload, priority, maxAttempts, visibilityTimeout } = req.body;
        const job = await self.client.enqueue(name, payload, { priority, maxAttempts, visibilityTimeout });
        res.json(job);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/queue/:name/dequeue", async (req, res) => {
      try {
        const { name } = req.params;
        const job = await self.client.dequeue(name);
        if (!job) return res.status(404).json({ error: "no job available" });
        res.json(job);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/queue/:name/worker", async (req, res) => {
      try {
        const { name } = req.params;
        const job = await self.client.dequeue(name);
        if (!job) return res.json({ status: "no_job" });
        res.json({ status: "dequeued", job });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/queue/:name/stats", async (req, res) => {
      try {
        const { name } = req.params;
        const stats = await self.client.getQueueStats(name);
        res.json(stats);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/queue/:name/complete/:jobId", async (req, res) => {
      try {
        await self.client.completeJob(Number(req.params.jobId));
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/queue/:name/fail/:jobId", async (req, res) => {
      try {
        const { error } = req.body;
        await self.client.failJob(Number(req.params.jobId), error ?? "failed");
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/queue/:name/cleanup", async (req, res) => {
      try {
        const { olderThan } = req.body;
        const deleted = await self.client.cleanupJobs(req.params.name, olderThan ? new Date(olderThan) : undefined);
        res.json({ deleted });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // LOCK endpoints
    app.post("/lock/try", async (req, res) => {
      try {
        const { key: k, ttl } = req.body;
        if (!k) return res.status(400).json({ error: "key required" });
        const acquired = await self.client.tryLock(k, { ttl });
        res.json({ acquired });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/lock", async (req, res) => {
      try {
        const { key: k, ttl, timeout } = req.body;
        if (!k) return res.status(400).json({ error: "key required" });
        await self.client.lock(k, { ttl, timeout });
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/unlock", async (req, res) => {
      try {
        const { key: k, holderId } = req.body;
        if (!k || !holderId) return res.status(400).json({ error: "key and holderId required" });
        await self.client.unlock(k, holderId);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/lock/extend", async (req, res) => {
      try {
        res.status(501).json({ error: "not implemented in client" });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // LEADER ELECTION endpoints
    app.post("/leader/acquire", async (req, res) => {
      try {
        const { resource, ttl, onLost } = req.body;
        if (!resource) return res.status(400).json({ error: "resource required" });
        const holderId = await self.client.acquireLeadership(resource, { ttl });
        if (holderId === null) return res.status(409).json({ error: "leader already exists", holderId: null });
        res.json({ holderId });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/leader/release", async (req, res) => {
      try {
        const { resource, holderId } = req.body;
        if (!resource || !holderId) return res.status(400).json({ error: "resource and holderId required" });
        await self.client.releaseLeadership(resource, holderId);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/leader/status", async (req, res) => {
      try {
        const { resource, holderId } = req.query;
        if (!resource || !holderId) return res.status(400).json({ error: "resource and holderId query params required" });
        const isLeader = await self.client.isLeader(resource, holderId);
        res.json({ isLeader });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // SCHEDULER endpoints
    app.post("/scheduler/delayed", async (req, res) => {
      try {
        const { name, payload, runAt, priority, maxAttempts } = req.body;
        if (!name || !runAt) return res.status(400).json({ error: "name and runAt required" });
        const result = await self.client.schedule(name, payload, new Date(runAt), { priority, maxAttempts });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/scheduler/recurring", async (req, res) => {
      try {
        const { name, payload, interval, priority, maxAttempts } = req.body;
        if (!name || !interval) return res.status(400).json({ error: "name and interval required" });
        const result = await self.client.scheduleRecurring(name, payload, interval, { priority, maxAttempts });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/scheduler/jobs", async (req, res) => {
      try {
        const { status, name } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (name) filter.name = name;
        const jobs = await self.client.listSchedules(filter);
        res.json({ jobs });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/scheduler/cancel/:jobId", async (req, res) => {
      try {
        await self.client.cancelSchedule(Number(req.params.jobId));
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // RATE LIMIT endpoints
    app.post("/rate-limit/fixed", async (req, res) => {
      try {
        const { key: k, limit, windowMs } = req.body;
        if (!k || !limit || !windowMs) return res.status(400).json({ error: "key, limit, windowMs required" });
        const result = await self.client.rateLimit(k, limit, windowMs);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/rate-limit/sliding", async (req, res) => {
      try {
        const { key: k, limit, windowMs } = req.body;
        if (!k || !limit || !windowMs) return res.status(400).json({ error: "key, limit, windowMs required" });
        const result = await self.client.checkSlidingRateLimit({ key: k, limit, windowMs });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/rate-limit/token-bucket", async (req, res) => {
      try {
        const { key: k, capacity, refillRate } = req.body;
        if (!k || !capacity || !refillRate) return res.status(400).json({ error: "key, capacity, refillRate required" });
        const result = await self.client.rateLimitTokenBucket(k, capacity, refillRate);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // EVENTS endpoints
    app.post("/events/emit", async (req, res) => {
      try {
        const { type, payload, metadata } = req.body;
        if (!type) return res.status(400).json({ error: "type required" });
        const eventId = await self.client.emit(type, payload, metadata);
        res.json({ eventId });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/events/listen", async (req, res) => {
      try {
        const { type } = req.body;
        if (!type) return res.status(400).json({ error: "type required" });

        const listenerId = self._makeListenerId();
        const unsubscribe = await self.client.listen(type, (channel, payload, meta) => {
          // Events module calls handler with (channel='pgbloom_events', payload, meta)
          // The actual event type is in the listen() subscription - track it separately
          self._pushEvent(listenerId, { type, payload, meta });
        });

        self.eventListeners.set(listenerId, { type, unsubscribe });
        self.receivedEvents.set(listenerId, []);

        res.json({ listenerId, type });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/events/listen/:listenerId", async (req, res) => {
      try {
        const { listenerId } = req.params;
        const lst = self.eventListeners.get(listenerId);
        if (!lst) return res.status(404).json({ error: "listener not found" });
        await lst.unsubscribe();
        self.eventListeners.delete(listenerId);
        self.receivedEvents.delete(listenerId);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/events/messages/:listenerId", (req, res) => {
      const { listenerId } = req.params;
      const events = self.receivedEvents.get(listenerId) ?? [];
      self.receivedEvents.set(listenerId, []);
      res.json({ events });
    });

    app.get("/events/history", async (req, res) => {
      try {
        const { type, from, to, limit, cursor } = req.query;
        const options = {};
        if (type) options.type = type;
        if (from) options.from = new Date(from);
        if (to) options.to = new Date(to);
        if (limit) options.limit = Number(limit);
        if (cursor) options.cursor = cursor;
        const result = await self.client.getEventHistory(options);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/events/replay", async (req, res) => {
      try {
        const { from, to, type } = req.body;
        if (!from) return res.status(400).json({ error: "from required" });
        let replayed = 0;
        await self.client.replayEvents(
          new Date(from),
          to ? new Date(to) : undefined,
          type,
          () => { replayed++; }
        );
        res.json({ replayed });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // COUNTER endpoints
    app.get("/counter/:key", async (req, res) => {
      try {
        const { consistency } = req.query;
        const result = await self.client.getCounter(req.params.key, { consistency });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/counter/:key/increment", async (req, res) => {
      try {
        const { delta } = req.body;
        const result = await self.client.increment(req.params.key, delta);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/counter/:key/decrement", async (req, res) => {
      try {
        const { delta } = req.body;
        const result = await self.client.decrement(req.params.key, delta);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/counter/:key/add", async (req, res) => {
      try {
        const { delta } = req.body;
        if (delta === undefined) return res.status(400).json({ error: "delta required" });
        const result = await self.client.add(req.params.key, delta);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/counter/:key/set", async (req, res) => {
      try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: "value required" });
        const result = await self.client.setCounter(req.params.key, value);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/counter/:key/subtract", async (req, res) => {
      try {
        const { delta } = req.body;
        if (delta === undefined) return res.status(400).json({ error: "delta required" });
        const result = await self.client.subtract(req.params.key, delta);
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.delete("/counter/:key", async (req, res) => {
      try {
        const removed = await self.client.removeCounter(req.params.key);
        res.json({ removed });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // BLOOM FILTER endpoints
    app.post("/bloom/add", async (req, res) => {
      try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: "value required" });
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        self._bloom.add(value);
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/bloom/has/:key", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        const has = self._bloom.has(req.params.key);
        res.json({ has });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post("/bloom/rebuild", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        self._bloom.clear();
        res.json({ ok: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get("/bloom/statistics", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        res.json({
          size: self._bloom.size(),
          bitSize: self._bloom.bitSize,
          hashCount: self._bloom.hashCount,
          expectedItems: self._bloom.expectedItems,
          falsePositiveRate: self._bloom.falsePositiveRate,
        });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // STATS endpoint
    app.get("/stats", async (req, res) => {
      res.json({
        runId: RUN_ID,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: "not found", path: req.path, method: req.method });
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error("Server error:", err);
      res.status(500).json({ error: "internal server error", message: err.message });
    });
  }

  // ============================================================
  // Lifecycle
  // ============================================================
  async start(port, connectionString, options = {}) {
    this.client = await createPgbloom(connectionString, {
      cleanupInterval: false,
      bloomFilter: true,
      bloom: { expectedItems: 5000, falsePositiveRate: 0.01, rebuildInterval: false },
      lock: { defaultTtl: 10000 },
      scheduler: { workerId: `worker-${RUN_ID}` },
      queue: { visibilityTimeout: 1000, maxAttempts: 3 },
      events: { maxListenersPerType: 100 },
      counter: { defaultConsistency: "strong" },
      maxConnections: 10,
      ...options,
    });

    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`Express server listening on http://127.0.0.1:${port}`);
        resolve({ server: this.server, client: this.client, app: this.app });
      });
    });
  }

  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.pubsubChannels.clear();
    this.eventListeners.clear();
    this.receivedMessages.clear();
    this.receivedEvents.clear();
    this._bloom = null;
  }

  get baseUrl() {
    if (!this.server) return null;
    const addr = this.server.address();
    if (!addr || typeof addr === "string") return null;
    return `http://127.0.0.1:${addr.port}`;
  }
}

// ============================================================
// Backwards-compatible exports for existing tests
// ============================================================
let defaultServer = null;

export async function startExpressServer(port, connectionString, options = {}) {
  defaultServer = new ExpressPgBloomServer();
  return defaultServer.start(port, connectionString, options);
}

export async function stopExpressServer() {
  if (defaultServer) {
    await defaultServer.stop();
    defaultServer = null;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2]) || 3000;
  const dsn = process.env.DATABASE_URL;
  if (!dsn) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const server = new ExpressPgBloomServer();
  await server.start(port, dsn);
  console.log("Server running. Press Ctrl+C to stop.");
  process.stdin.resume();
}