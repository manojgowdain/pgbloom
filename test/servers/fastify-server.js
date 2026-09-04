/**
 * Fastify integration test server for PGBloom.
 *
 * Exposes HTTP endpoints that map directly to the PGBloom client API.
 * Run with: node test/servers/fastify-server.js <port>
 */

import Fastify from "fastify";
import { createPgbloom } from "../../dist/esm/index.js";
import { RUN_ID, key, channel, queueName, scheduleName, eventType, counterKey, lockKey, resourceKey } from "../helpers/test-data.js";

// ============================================================
// Server class - supports multiple independent instances
// ============================================================
export class FastifyPgBloomServer {
  constructor() {
    this.app = Fastify({ logger: false });
    this.client = null;
    this.server = null;
    this.pubsubChannels = new Map();
    this.eventListeners = new Map();
    this.receivedMessages = new Map();
    this.receivedEvents = new Map();
    this._bloom = null;
    this._setupRoutes();
  }

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

  _setupRoutes() {
    const app = this.app;
    const self = this;

    // Health endpoints
    app.get("/health", async (req, res) => {
      return { ok: true, runId: RUN_ID };
    });

    app.get("/health/database", async (req, res) => {
      try {
        await self.client.pool.query("SELECT 1");
        return { ok: true, connected: true };
      } catch (e) {
        res.status(500);
        return { ok: false, connected: false, error: e.message };
      }
    });

    // CACHE endpoints
    app.post("/cache", async (req, res) => {
      try {
        const { key: k, value, ttl } = req.body;
        if (!k) {
          res.status(400);
          return { error: "key required" };
        }
        const expiry = ttl ? new Date(Date.now() + ttl) : undefined;
        await self.client.setCache(k, value, expiry);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/cache/:key", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        if (value === null) {
          res.status(404);
          return { error: "not found" };
        }
        return { value };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.head("/cache/:key", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        if (value === null) {
          res.status(404);
          return;
        }
        res.status(200);
        return;
      } catch (e) {
        res.status(500);
        return;
      }
    });

    app.get("/cache/:key/exists", async (req, res) => {
      try {
        const value = await self.client.getCache(req.params.key);
        return { exists: value !== null };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.delete("/cache/:key", async (req, res) => {
      try {
        await self.client.deleteCache(req.params.key);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/cache/clear-expired", async (req, res) => {
      try {
        const deleted = await self.client.clearExpiredCache();
        return { deleted };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // PUBSUB endpoints
    app.post("/pubsub/publish", async (req, res) => {
      try {
        const { channel: ch, message } = req.body;
        if (!ch) {
          res.status(400);
          return { error: "channel required" };
        }
        await self.client.publish(ch, message);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/pubsub/subscribe", async (req, res) => {
      try {
        const { channel: ch } = req.body;
        if (!ch) {
          res.status(400);
          return { error: "channel required" };
        }

        const subscriberId = self._makeSubscriberId();
        const unsubscribe = await self.client.subscribe(ch, (channel, payload) => {
          self._pushMessage(subscriberId, { channel, payload });
        });

        self.pubsubChannels.set(subscriberId, { channel: ch, unsubscribe });
        self.receivedMessages.set(subscriberId, []);

        return { subscriberId, channel: ch };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.delete("/pubsub/subscribe/:subscriberId", async (req, res) => {
      try {
        const { subscriberId } = req.params;
        const sub = self.pubsubChannels.get(subscriberId);
        if (!sub) {
          res.status(404);
          return { error: "subscriber not found" };
        }
        await sub.unsubscribe();
        self.pubsubChannels.delete(subscriberId);
        self.receivedMessages.delete(subscriberId);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/pubsub/messages/:subscriberId", async (req, res) => {
      const { subscriberId } = req.params;
      const msgs = self.receivedMessages.get(subscriberId) ?? [];
      self.receivedMessages.set(subscriberId, []);
      return { messages: msgs };
    });

    app.get("/pubsub/channels", async (req, res) => {
      const channels = [...new Set([...self.pubsubChannels.values()].map((s) => s.channel))];
      return { channels };
    });

    // SSE endpoint for real-time pubsub
    app.get("/pubsub/events", async (req, res) => {
      res.raw.setHeader("Content-Type", "text/event-stream");
      res.raw.setHeader("Cache-Control", "no-cache");
      res.raw.setHeader("Connection", "keep-alive");
      res.raw.flushHeaders();

      const subscriberId = self._makeSubscriberId();
      const interval = setInterval(() => {
        const msgs = self.receivedMessages.get(subscriberId) ?? [];
        if (msgs.length > 0) {
          for (const msg of msgs) {
            res.raw.write(`data: ${JSON.stringify(msg)}\n\n`);
          }
          self.receivedMessages.set(subscriberId, []);
        }
      }, 100);

      req.raw.on("close", () => {
        clearInterval(interval);
        self.pubsubChannels.delete(subscriberId);
        self.receivedMessages.delete(subscriberId);
      });

      return "";
    });

    // QUEUE endpoints
    app.post("/queue/:name/enqueue", async (req, res) => {
      try {
        const { name } = req.params;
        const { payload, priority, maxAttempts, visibilityTimeout } = req.body;
        const job = await self.client.enqueue(name, payload, { priority, maxAttempts, visibilityTimeout });
        return job;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/queue/:name/dequeue", async (req, res) => {
      try {
        const { name } = req.params;
        const job = await self.client.dequeue(name);
        if (!job) {
          res.status(404);
          return { error: "no job available" };
        }
        return job;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/queue/:name/worker", async (req, res) => {
      try {
        const { name } = req.params;
        const job = await self.client.dequeue(name);
        if (!job) return { status: "no_job" };
        return { status: "dequeued", job };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/queue/:name/stats", async (req, res) => {
      try {
        const { name } = req.params;
        const stats = await self.client.getQueueStats(name);
        return stats;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/queue/:name/complete/:jobId", async (req, res) => {
      try {
        await self.client.completeJob(Number(req.params.jobId));
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/queue/:name/fail/:jobId", async (req, res) => {
      try {
        const { error } = req.body;
        await self.client.failJob(Number(req.params.jobId), error ?? "failed");
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/queue/:name/cleanup", async (req, res) => {
      try {
        const { olderThan } = req.body;
        const deleted = await self.client.cleanupJobs(req.params.name, olderThan ? new Date(olderThan) : undefined);
        return { deleted };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // LOCK endpoints
    app.post("/lock/try", async (req, res) => {
      try {
        const { key: k, ttl } = req.body;
        if (!k) {
          res.status(400);
          return { error: "key required" };
        }
        const acquired = await self.client.tryLock(k, { ttl });
        return { acquired };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/lock", async (req, res) => {
      try {
        const { key: k, ttl, timeout } = req.body;
        if (!k) {
          res.status(400);
          return { error: "key required" };
        }
        await self.client.lock(k, { ttl, timeout });
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/unlock", async (req, res) => {
      try {
        const { key: k, holderId } = req.body;
        if (!k || !holderId) {
          res.status(400);
          return { error: "key and holderId required" };
        }
        await self.client.unlock(k, holderId);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/lock/extend", async (req, res) => {
      try {
        res.status(501);
        return { error: "not implemented in client" };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // LEADER ELECTION endpoints
    app.post("/leader/acquire", async (req, res) => {
      try {
        const { resource, ttl, onLost } = req.body;
        if (!resource) {
          res.status(400);
          return { error: "resource required" };
        }
        const holderId = await self.client.acquireLeadership(resource, { ttl });
        if (holderId === null) {
          res.status(409);
          return { error: "leader already exists", holderId: null };
        }
        return { holderId };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/leader/release", async (req, res) => {
      try {
        const { resource, holderId } = req.body;
        if (!resource || !holderId) {
          res.status(400);
          return { error: "resource and holderId required" };
        }
        await self.client.releaseLeadership(resource, holderId);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/leader/status", async (req, res) => {
      try {
        const { resource, holderId } = req.query;
        if (!resource || !holderId) {
          res.status(400);
          return { error: "resource and holderId query params required" };
        }
        const isLeader = await self.client.isLeader(resource, holderId);
        return { isLeader };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // SCHEDULER endpoints
    app.post("/scheduler/delayed", async (req, res) => {
      try {
        const { name, payload, runAt, priority, maxAttempts } = req.body;
        if (!name || !runAt) {
          res.status(400);
          return { error: "name and runAt required" };
        }
        const result = await self.client.schedule(name, payload, new Date(runAt), { priority, maxAttempts });
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/scheduler/recurring", async (req, res) => {
      try {
        const { name, payload, interval, priority, maxAttempts } = req.body;
        if (!name || !interval) {
          res.status(400);
          return { error: "name and interval required" };
        }
        const result = await self.client.scheduleRecurring(name, payload, interval, { priority, maxAttempts });
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/scheduler/jobs", async (req, res) => {
      try {
        const { status, name } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (name) filter.name = name;
        const jobs = await self.client.listSchedules(filter);
        return { jobs };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/scheduler/cancel/:jobId", async (req, res) => {
      try {
        await self.client.cancelSchedule(Number(req.params.jobId));
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // RATE LIMIT endpoints
    app.post("/rate-limit/fixed", async (req, res) => {
      try {
        const { key: k, limit, windowMs } = req.body;
        if (!k || !limit || !windowMs) {
          res.status(400);
          return { error: "key, limit, windowMs required" };
        }
        const result = await self.client.rateLimit(k, limit, windowMs);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/rate-limit/sliding", async (req, res) => {
      try {
        const { key: k, limit, windowMs } = req.body;
        if (!k || !limit || !windowMs) {
          res.status(400);
          return { error: "key, limit, windowMs required" };
        }
        const result = await self.client.checkSlidingRateLimit({ key: k, limit, windowMs });
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/rate-limit/token-bucket", async (req, res) => {
      try {
        const { key: k, capacity, refillRate } = req.body;
        if (!k || !capacity || !refillRate) {
          res.status(400);
          return { error: "key, capacity, refillRate required" };
        }
        const result = await self.client.rateLimitTokenBucket(k, capacity, refillRate);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // EVENTS endpoints
    app.post("/events/emit", async (req, res) => {
      try {
        const { type, payload, metadata } = req.body;
        if (!type) {
          res.status(400);
          return { error: "type required" };
        }
        const eventId = await self.client.emit(type, payload, metadata);
        return { eventId };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/events/listen", async (req, res) => {
      try {
        const { type } = req.body;
        if (!type) {
          res.status(400);
          return { error: "type required" };
        }

        const listenerId = self._makeListenerId();
        const unsubscribe = await self.client.listen(type, (channel, payload, meta) => {
          // Events module calls handler with (channel='pgbloom_events', payload, meta)
          // The actual event type is in the listen() subscription - track it separately
          self._pushEvent(listenerId, { type, payload, meta });
        });

        self.eventListeners.set(listenerId, { type, unsubscribe });
        self.receivedEvents.set(listenerId, []);

        return { listenerId, type };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.delete("/events/listen/:listenerId", async (req, res) => {
      try {
        const { listenerId } = req.params;
        const lst = self.eventListeners.get(listenerId);
        if (!lst) {
          res.status(404);
          return { error: "listener not found" };
        }
        await lst.unsubscribe();
        self.eventListeners.delete(listenerId);
        self.receivedEvents.delete(listenerId);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/events/messages/:listenerId", async (req, res) => {
      const { listenerId } = req.params;
      const events = self.receivedEvents.get(listenerId) ?? [];
      self.receivedEvents.set(listenerId, []);
      return { events };
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
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/events/replay", async (req, res) => {
      try {
        const { from, to, type } = req.body;
        if (!from) {
          res.status(400);
          return { error: "from required" };
        }
        let replayed = 0;
        await self.client.replayEvents(
          new Date(from),
          to ? new Date(to) : undefined,
          type,
          () => { replayed++; }
        );
        return { replayed };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // COUNTER endpoints
    app.get("/counter/:key", async (req, res) => {
      try {
        const { consistency } = req.query;
        const result = await self.client.getCounter(req.params.key, { consistency });
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/counter/:key/increment", async (req, res) => {
      try {
        const { delta } = req.body;
        const result = await self.client.increment(req.params.key, delta);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/counter/:key/decrement", async (req, res) => {
      try {
        const { delta } = req.body;
        const result = await self.client.decrement(req.params.key, delta);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/counter/:key/add", async (req, res) => {
      try {
        const { delta } = req.body;
        if (delta === undefined) {
          res.status(400);
          return { error: "delta required" };
        }
        const result = await self.client.add(req.params.key, delta);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/counter/:key/set", async (req, res) => {
      try {
        const { value } = req.body;
        if (value === undefined) {
          res.status(400);
          return { error: "value required" };
        }
        const result = await self.client.setCounter(req.params.key, value);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/counter/:key/subtract", async (req, res) => {
      try {
        const { delta } = req.body;
        if (delta === undefined) {
          res.status(400);
          return { error: "delta required" };
        }
        const result = await self.client.subtract(req.params.key, delta);
        return result;
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.delete("/counter/:key", async (req, res) => {
      try {
        const removed = await self.client.removeCounter(req.params.key);
        return { removed };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // BLOOM FILTER endpoints
    app.post("/bloom/add", async (req, res) => {
      try {
        const { value } = req.body;
        if (value === undefined) {
          res.status(400);
          return { error: "value required" };
        }
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        self._bloom.add(value);
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/bloom/has/:key", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        const has = self._bloom.has(req.params.key);
        return { has };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.post("/bloom/rebuild", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        self._bloom.clear();
        return { ok: true };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    app.get("/bloom/statistics", async (req, res) => {
      try {
        if (!self._bloom) {
          self._bloom = self.client.bloom({ expectedItems: 10000, falsePositiveRate: 0.01 });
        }
        return {
          size: self._bloom.size(),
          bitSize: self._bloom.bitSize,
          hashCount: self._bloom.hashCount,
          expectedItems: self._bloom.expectedItems,
          falsePositiveRate: self._bloom.falsePositiveRate,
        };
      } catch (e) {
        res.status(500);
        return { error: e.message };
      }
    });

    // STATS endpoint
    app.get("/stats", async (req, res) => {
      return {
        runId: RUN_ID,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    });

    // 404 handler
    app.setNotFoundHandler((req, res) => {
      res.status(404);
      return { error: "not found", path: req.url, method: req.method };
    });

    // Error handler
    app.setErrorHandler((err, req, res) => {
      console.error("Server error:", err);
      res.status(500);
      return { error: "internal server error", message: err.message };
    });
  }

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

    await this.app.listen({ port, host: "127.0.0.1" });
    console.log(`Fastify server listening on http://127.0.0.1:${port}`);
    return { server: this.app, client: this.client, app: this.app };
  }

  async stop() {
    if (this.app) {
      await this.app.close();
      this.app = null;
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
    // Fastify doesn't easily expose port after listen, return null
    return null;
  }
}

// ============================================================
// Backwards-compatible exports for existing tests
// ============================================================
let defaultServer = null;

export async function startFastifyServer(port, connectionString, options = {}) {
  defaultServer = new FastifyPgBloomServer();
  return defaultServer.start(port, connectionString, options);
}

export async function stopFastifyServer() {
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
  const server = new FastifyPgBloomServer();
  await server.start(port, dsn);
  console.log("Server running. Press Ctrl+C to stop.");
  process.stdin.resume();
}