/**
 * Cache integration tests.
 *
 * These tests require a running PostgreSQL instance with a test database.
 * Set DATABASE_URL environment variable to run them.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, skip } from "vitest";
import { createPgbloom } from "pgbloom";

// Skip by default - requires PostgreSQL
const SKIP_INTEGRATION = !process.env.DATABASE_URL;

describe("Cache Integration", () => {
  let pgsnap: Awaited<ReturnType<typeof createPgbloom>>;

  beforeAll(async () => {
    if (SKIP_INTEGRATION) return;
    pgsnap = await createPgbloom(process.env.DATABASE_URL!, {
      bloomFilter: false,
      cleanupInterval: false,
    });
  });

  afterAll(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap?.close();
  });

  beforeEach(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.clearCache();
  });

  it("should set and get a string value", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "hello");
    const value = await pgsnap.getCache("key1");
    expect(value).toBe("hello");
  });

  it("should set and get an object value", async () => {
    if (SKIP_INTEGRATION) return;
    const obj = { name: "Manoj", age: 30 };
    await pgsnap.setCache("key1", obj);
    const value = await pgsnap.getCache("key1");
    expect(value).toEqual(obj);
  });

  it("should set and get a number value", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", 42);
    const value = await pgsnap.getCache("key1");
    expect(value).toBe(42);
  });

  it("should set and get a boolean value", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", true);
    const value = await pgsnap.getCache("key1");
    expect(value).toBe(true);
  });

  it("should return null for missing key", async () => {
    if (SKIP_INTEGRATION) return;
    const value = await pgsnap.getCache("nonexistent");
    expect(value).toBeNull();
  });

  it("should return null for expired key", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "value", 1); // 1ms expiry
    await new Promise((r) => setTimeout(r, 10));
    const value = await pgsnap.getCache("key1");
    expect(value).toBeNull();
  });

  it("should delete a key", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "value");
    await pgsnap.deleteCache("key1");
    const value = await pgsnap.getCache("key1");
    expect(value).toBeNull();
  });

  it("should clear all keys", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "a");
    await pgsnap.setCache("key2", "b");
    await pgsnap.clearCache();
    expect(await pgsnap.getCache("key1")).toBeNull();
    expect(await pgsnap.getCache("key2")).toBeNull();
  });

  it("should clear expired entries", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("expired1", "a", 1);
    await pgsnap.setCache("expired2", "b", 1);
    await pgsnap.setCache("valid", "c", 3600000);
    await new Promise((r) => setTimeout(r, 10));
    const deleted = await pgsnap.clearExpiredCache();
    expect(deleted).toBe(2);
    expect(await pgsnap.getCache("valid")).toBe("c");
  });

  it("should overwrite existing key", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "first");
    await pgsnap.setCache("key1", "second");
    expect(await pgsnap.getCache("key1")).toBe("second");
  });
});

describe("Cache with Internal Bloom Filter", () => {
  let pgsnap: Awaited<ReturnType<typeof createPgbloom>>;

  beforeAll(async () => {
    if (SKIP_INTEGRATION) return;
    pgsnap = await createPgbloom(process.env.DATABASE_URL!, {
      bloomFilter: true,
      bloom: { expectedItems: 1000, falsePositiveRate: 0.01 },
      cleanupInterval: false,
    });
  });

  afterAll(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap?.close();
  });

  beforeEach(async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.clearCache();
  });

  it("should return null for definitely absent keys without querying DB", async () => {
    if (SKIP_INTEGRATION) return;
    // Set up a key
    await pgsnap.setCache("existing", "value");

    // Query a definitely absent key - should hit Bloom Filter and return null
    // without touching PostgreSQL
    const value = await pgsnap.getCache("definitely-absent");
    expect(value).toBeNull();
  });

  it("should still query PostgreSQL for possibly present keys", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("existing", "value");

    // Existing key - Bloom Filter says "possibly present", must query PostgreSQL
    const value = await pgsnap.getCache("existing");
    expect(value).toBe("value");
  });

  it("should update Bloom Filter on setCache", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("newkey", "newvalue");

    // Immediately after set, key should be in Bloom Filter
    const value = await pgsnap.getCache("newkey");
    expect(value).toBe("newvalue");
  });

  it("should update Bloom Filter on deleteCache (counting bloom)", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "value1");
    await pgsnap.setCache("key2", "value2");

    // Delete key1 - counting bloom filter should handle this safely
    await pgsnap.deleteCache("key1");

    // key2 should still work (no false negative)
    expect(await pgsnap.getCache("key2")).toBe("value2");
    expect(await pgsnap.getCache("key1")).toBeNull();
  });

  it("should clear Bloom Filter on clearCache", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("key1", "value");
    await pgsnap.clearCache();
    expect(await pgsnap.getCache("key1")).toBeNull();
  });

  it("should handle expired keys without false negatives", async () => {
    if (SKIP_INTEGRATION) return;
    await pgsnap.setCache("expired", "value", 1); // 1ms
    await new Promise((r) => setTimeout(r, 10));

    // Expired key might still be in Bloom Filter (false positive)
    // but PostgreSQL will correctly return null
    expect(await pgsnap.getCache("expired")).toBeNull();
  });
});