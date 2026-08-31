/**
 * Pub/Sub integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, skip } from "vitest";
import { createPgbloom } from "pgbloom";

const SKIP_INTEGRATION = !process.env.DATABASE_URL;

describe("Pub/Sub Integration", () => {
  let pgsnap: Awaited<ReturnType<typeof createPgbloom>>;

  beforeAll(async () => {
    if (SKIP_INTEGRATION) return;
    pgsnap = await createPgbloom(process.env.DATABASE_URL!, {
      cleanupInterval: false,
    });
  });

  afterAll(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap?.close();
  });

  it("should publish and receive messages", async () => {
    if (SKIP_INTEGRATION) return;

    const received: unknown[] = [];
    const unsubscribe = await pgsnap.subscribe("test-channel", (channel, payload) => {
      received.push({ channel, payload });
    });

    await pgsnap.publish("test-channel", { hello: "world" });
    await pgsnap.publish("test-channel", "string message");
    await pgsnap.publish("test-channel", 42);

    // Give time for notifications to arrive
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toHaveLength(3);
    expect(received[0]).toEqual({ channel: "test-channel", payload: { hello: "world" } });
    expect(received[1]).toEqual({ channel: "test-channel", payload: "string message" });
    expect(received[2]).toEqual({ channel: "test-channel", payload: 42 });

    await unsubscribe();
  });

  it("should not receive messages after unsubscribe", async () => {
    if (SKIP_INTEGRATION) return;

    const received: unknown[] = [];
    const unsubscribe = await pgsnap.subscribe("test-channel-2", (channel, payload) => {
      received.push(payload);
    });

    await pgsnap.publish("test-channel-2", "before");
    await unsubscribe();
    await pgsnap.publish("test-channel-2", "after");
    await new Promise((r) => setTimeout(r, 100));

    expect(received).toHaveLength(1);
    expect(received[0]).toBe("before");
  });

  it("should support multiple subscribers on same channel", async () => {
    if (SKIP_INTEGRATION) return;

    const received1: unknown[] = [];
    const received2: unknown[] = [];

    const unsubscribe1 = await pgsnap.subscribe("multi-channel", (c, p) => received1.push(p));
    const unsubscribe2 = await pgsnap.subscribe("multi-channel", (c, p) => received2.push(p));

    await pgsnap.publish("multi-channel", "broadcast");
    await new Promise((r) => setTimeout(r, 100));

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);

    await unsubscribe1();
    await unsubscribe2();
  });
});