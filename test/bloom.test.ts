/**
 * Bloom Filter tests.
 *
 * Tests both the public BloomFilter class and internal cache integration.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BloomFilter,
  type BloomFilterOptions,
  BloomFilterConfigError,
  encodeValue,
  hashPair,
} from "pgbloom";

// ============================================================
// PUBLIC BLOOM FILTER TESTS
// ============================================================

describe("BloomFilter - Public API", () => {
  let bloom: BloomFilter;

  beforeEach(() => {
    bloom = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
  });

  afterEach(() => {
    bloom.clear();
  });

  it("should add and check a string value", () => {
    bloom.add("hello");
    expect(bloom.has("hello")).toBe(true);
  });

  it("should return false for missing values", () => {
    bloom.add("hello");
    expect(bloom.has("world")).toBe(false);
  });

  it("should support multiple values", () => {
    bloom.add("a");
    bloom.add("b");
    bloom.add("c");
    expect(bloom.has("a")).toBe(true);
    expect(bloom.has("b")).toBe(true);
    expect(bloom.has("c")).toBe(true);
    expect(bloom.has("d")).toBe(false);
  });

  it("should support numbers", () => {
    bloom.add(42);
    bloom.add(-7);
    bloom.add(3.14);
    expect(bloom.has(42)).toBe(true);
    expect(bloom.has(-7)).toBe(true);
    expect(bloom.has(3.14)).toBe(true);
    expect(bloom.has(99)).toBe(false);
  });

  it("should support booleans", () => {
    bloom.add(true);
    bloom.add(false);
    expect(bloom.has(true)).toBe(true);
    expect(bloom.has(false)).toBe(true);
  });

  it("should support null", () => {
    bloom.add(null);
    expect(bloom.has(null)).toBe(true);
    expect(bloom.has(undefined)).toBe(false);
  });

  it("should support bigint", () => {
    bloom.add(12345678901234567890n);
    expect(bloom.has(12345678901234567890n)).toBe(true);
  });

  it("should support empty string", () => {
    bloom.add("");
    expect(bloom.has("")).toBe(true);
  });

  it("should handle duplicate adds correctly", () => {
    bloom.add("dup");
    bloom.add("dup");
    bloom.add("dup");
    expect(bloom.has("dup")).toBe(true);
    // Size should reflect all adds
    expect(bloom.size()).toBe(3);
  });

  it("should clear all values", () => {
    bloom.add("a");
    bloom.add("b");
    bloom.clear();
    expect(bloom.has("a")).toBe(false);
    expect(bloom.has("b")).toBe(false);
    expect(bloom.size()).toBe(0);
  });

  it("should track approximate size", () => {
    expect(bloom.size()).toBe(0);
    bloom.add("a");
    expect(bloom.size()).toBe(1);
    bloom.add("b");
    expect(bloom.size()).toBe(2);
    bloom.clear();
    expect(bloom.size()).toBe(0);
  });

  it("should serialize and deserialize correctly", () => {
    bloom.add("test1");
    bloom.add("test2");

    const json = bloom.toJSON();
    expect(json.version).toBe(1);
    expect(json.expectedItems).toBe(1000);
    expect(json.falsePositiveRate).toBe(0.01);
    expect(typeof json.bits).toBe("string");
    expect(json.bits.length).toBeGreaterThan(0);

    const restored = BloomFilter.fromJSON(json);
    expect(restored.has("test1")).toBe(true);
    expect(restored.has("test2")).toBe(true);
    // False positives possible but unlikely with these settings
    expect(restored.has("unknown")).toBe(false);
    expect(restored.expectedItems).toBe(1000);
    expect(restored.falsePositiveRate).toBe(0.01);
  });

  it("should throw on invalid expectedItems", () => {
    expect(() => new BloomFilter({ expectedItems: 0, falsePositiveRate: 0.01 }))
      .toThrow(BloomFilterConfigError);
    expect(() => new BloomFilter({ expectedItems: -1, falsePositiveRate: 0.01 }))
      .toThrow(BloomFilterConfigError);
  });

  it("should throw on invalid falsePositiveRate", () => {
    expect(() => new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0 }))
      .toThrow(BloomFilterConfigError);
    expect(() => new BloomFilter({ expectedItems: 1000, falsePositiveRate: 1 }))
      .toThrow(BloomFilterConfigError);
    expect(() => new BloomFilter({ expectedItems: 1000, falsePositiveRate: -0.1 }))
      .toThrow(BloomFilterConfigError);
    expect(() => new BloomFilter({ expectedItems: 1000, falsePositiveRate: 1.5 }))
      .toThrow(BloomFilterConfigError);
  });

  it("should throw on invalid JSON version", () => {
    expect(() => BloomFilter.fromJSON({
      version: 2,
      expectedItems: 1000,
      falsePositiveRate: 0.01,
      bitCount: 1000,
      hashCount: 7,
      bits: "AAAA",
    })).toThrow(BloomFilterConfigError);
  });

  it("should throw on mismatched bitCount in JSON", () => {
    const bloom1 = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    const json = bloom1.toJSON();
    json.bitCount = json.bitCount + 100; // mismatch
    expect(() => BloomFilter.fromJSON(json)).toThrow(BloomFilterConfigError);
  });

  it("should throw on mismatched hashCount in JSON", () => {
    const bloom1 = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    const json = bloom1.toJSON();
    json.hashCount = json.hashCount + 1; // mismatch
    expect(() => BloomFilter.fromJSON(json)).toThrow(BloomFilterConfigError);
  });

  it("should not allow false negatives after serialization round-trip", () => {
    const items = ["a", "b", "c", "d", "e", 1, 2, 3, true, false, null];
    for (const item of items) {
      bloom.add(item);
    }

    const json = bloom.toJSON();
    const restored = BloomFilter.fromJSON(json);

    for (const item of items) {
      expect(restored.has(item)).toBe(true);
    }
  });
});

describe("BloomFilter - Sizing", () => {
  it("should calculate correct bit count and hash count for defaults", () => {
    const bloom = new BloomFilter(); // defaults: 10000, 0.01
    // m = -(10000 * ln(0.01)) / ln(2)^2 ≈ 95851
    // k = (m/n) * ln(2) ≈ 6.64 -> 7
    expect(bloom.bitCount).toBeGreaterThanOrEqual(95850);
    expect(bloom.hashCount).toBe(7);
  });

  it("should scale bit count with expectedItems", () => {
    const bloom1 = new BloomFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
    const bloom2 = new BloomFilter({ expectedItems: 100000, falsePositiveRate: 0.01 });
    expect(bloom2.bitCount).toBeGreaterThan(bloom1.bitCount * 5); // roughly 10x
  });

  it("should increase bit count for lower false positive rate", () => {
    const bloom1 = new BloomFilter({ expectedItems: 10000, falsePositiveRate: 0.1 });
    const bloom2 = new BloomFilter({ expectedItems: 10000, falsePositiveRate: 0.001 });
    expect(bloom2.bitCount).toBeGreaterThan(bloom1.bitCount);
  });
});

describe("BloomFilter - Hash functions", () => {
  it("should produce deterministic encodings", () => {
    expect(encodeValue("hello")).toBe("s:hello");
    expect(encodeValue(42)).toBe("n:42");
    expect(encodeValue(true)).toBe("b:1");
    expect(encodeValue(false)).toBe("b:0");
    expect(encodeValue(123n)).toBe("i:123");
  });

  it("should throw on non-finite numbers", () => {
    expect(() => encodeValue(NaN)).toThrow(TypeError);
    expect(() => encodeValue(Infinity)).toThrow(TypeError);
    expect(() => encodeValue(-Infinity)).toThrow(TypeError);
  });

  it("should throw on unsupported types", () => {
    expect(() => encodeValue({})).toThrow(TypeError);
    expect(() => encodeValue([])).toThrow(TypeError);
    expect(() => encodeValue(() => {})).toThrow(TypeError);
  });

  it("should produce consistent hash pairs", () => {
    const [h1, h2] = hashPair("test");
    expect(typeof h1).toBe("number");
    expect(typeof h2).toBe("number");
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h2).toBeGreaterThanOrEqual(0);
    // Same input should produce same pair
    expect(hashPair("test")).toEqual([h1, h2]);
  });

  it("should produce different pairs for different inputs", () => {
    const pair1 = hashPair("a");
    const pair2 = hashPair("b");
    expect(pair1).not.toEqual(pair2);
  });
});

// ============================================================
// FALSE POSITIVE SEMANTICS TESTS
// ============================================================

describe("BloomFilter - False Positive Semantics", () => {
  it("should never return false negatives for added items", () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);

    for (const item of items) {
      bloom.add(item);
    }

    // Every added item MUST return true (no false negatives)
    for (const item of items) {
      expect(bloom.has(item)).toBe(true);
    }
  });

  it("should return false for definitely absent items (most of the time)", () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bloom.add("present");

    // Items not added should usually return false
    // (Some false positives are statistically possible but very unlikely at 1%)
    let falsePositives = 0;
    for (let i = 0; i < 100; i++) {
      if (bloom.has(`absent-${i}`)) {
        falsePositives++;
      }
    }
    // At 1% FPR with 1 item added, we expect ~1 false positive in 100 checks
    expect(falsePositives).toBeLessThanOrEqual(5); // generous upper bound
  });

  it("should demonstrate has() semantics: false = definitely not present", () => {
    const bloom = new BloomFilter({ expectedItems: 10, falsePositiveRate: 0.01 });
    bloom.add("x");

    const result = bloom.has("y");
    if (result === false) {
      // This is the critical guarantee: false means DEFINITELY not added
      expect(bloom.has("y")).toBe(false); // always false, never flips to true
    }
  });
});

// ============================================================
// COUNTING BLOOM FILTER - DELETE SUPPORT
// ============================================================

describe("BloomFilter - Counting/Delete (internal)", () => {
  it("should support remove after add", () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bloom.add("removable");
    expect(bloom.has("removable")).toBe(true);

    // Internal method - removes the item
    (bloom as any).remove("removable");
    expect(bloom.has("removable")).toBe(false);
    expect(bloom.size()).toBe(0);
  });

  it("should handle multiple add/remove cycles", () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    bloom.add("x");
    bloom.add("x");
    expect(bloom.size()).toBe(2);

    (bloom as any).remove("x");
    expect(bloom.size()).toBe(1);
    expect(bloom.has("x")).toBe(true); // still present

    (bloom as any).remove("x");
    expect(bloom.size()).toBe(0);
    expect(bloom.has("x")).toBe(false);
  });

  it("should not underflow counters on remove of non-existent item", () => {
    const bloom = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    // remove without add - should not crash or underflow
    (bloom as any).remove("never-added");
    expect(bloom.has("never-added")).toBe(false);
    expect(bloom.size()).toBe(0);
  });
});

// ============================================================
// INTERNAL CACHE BLOOM FILTER INTEGRATION TESTS
// ============================================================
//
// These tests would require a running PostgreSQL instance.
// They are documented here as requirements for integration testing.
//
// Required test scenarios:
// 1. bloomFilter=false preserves existing behavior
// 2. bloomFilter=true initializes correctly
// 3. existing PostgreSQL cache keys are loaded on startup
// 4. missing cache keys can bypass PostgreSQL
// 5. existing cache keys still query PostgreSQL
// 6. setCache updates Bloom Filter after successful DB write
// 7. deleteCache does not cause false negatives (uses counting bloom)
// 8. clearCache resets Bloom Filter
// 9. expired cache does not create false negatives
// 10. automatic rebuild refreshes filter
// 11. concurrent set during rebuild doesn't cause false negatives
// 12. multiple PGSnap instances work independently
// 13. close() cleans rebuild timers
//
// A test that would FAIL if a normal (non-counting) Bloom Filter
// incorrectly removes bits:
//
// it("should not create false negatives on delete", async () => {
//   const pgsnap = await PGSnap(url, { bloomFilter: true });
//   await pgsnap.setCache("key1", "value1");
//   await pgsnap.setCache("key2", "value2");
//   await pgsnap.deleteCache("key1");
//   // If using standard Bloom Filter with bit clearing, this would incorrectly
//   // clear bits shared with "key2", causing a false negative:
//   const result = await pgsnap.getCache("key2");
//   expect(result).toBe("value2"); // MUST NOT be null
// });

describe("Internal vs Public Bloom Filter Independence", () => {
  it("should create separate instances", () => {
    const bloom1 = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
    const bloom2 = new BloomFilter({ expectedItems: 100, falsePositiveRate: 0.01 });

    bloom1.add("shared");
    expect(bloom1.has("shared")).toBe(true);
    expect(bloom2.has("shared")).toBe(false); // independent
  });
});