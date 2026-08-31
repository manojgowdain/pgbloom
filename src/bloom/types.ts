/**
 * Public types for the Bloom Filter module.
 *
 * A Bloom Filter is a probabilistic data structure that answers the
 * question "is this value possibly in the set?":
 *
 *   - `false` means the value is DEFINITELY not in the set (no false negatives).
 *   - `true`  means the value is MAYBE in the set (false positives possible).
 *
 * It must never be used as the source of truth — only as a way to skip
 * an unnecessary lookup when the value is almost certainly absent.
 */

/**
 * Primitive values the Bloom Filter can encode deterministically.
 *
 * Objects are intentionally NOT supported on the public API because
 * key ordering during serialization can produce inconsistent hashes
 * across runtimes.
 */
export type BloomFilterValue = string | number | boolean | bigint | null;

/**
 * Configuration options for the Bloom Filter.
 */
export interface BloomFilterOptions {
  /**
   * Expected number of distinct items that will be inserted. The filter
   * is sized to keep the false positive rate at the configured level
   * assuming this many items have been added.
   *
   * @default 10000
   */
  expectedItems?: number;

  /**
   * Target false positive rate, as a probability between 0 and 1.
   * For example, 0.01 targets a 1% false positive rate at the
   * configured capacity.
   *
   * @default 0.01
   */
  falsePositiveRate?: number;
}

/**
 * The serialization envelope for `BloomFilter.toJSON()`.
 *
 * Versioned so the format can evolve without breaking deserializers.
 */
export interface BloomFilterJSON {
  /** Format version. Currently always 1. */
  version: 1;
  /** Configuration used to size the filter. */
  expectedItems: number;
  falsePositiveRate: number;
  /** Number of bits in the bit array. */
  bitCount: number;
  /** Number of hash positions per insert. */
  hashCount: number;
  /** Base64-encoded bit array (LSB-first within each byte). */
  bits: string;
}

/**
 * Errors thrown by the Bloom Filter module.
 */
export class BloomFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BloomFilterError";
  }
}

export class BloomFilterConfigError extends BloomFilterError {
  constructor(message: string) {
    super(message);
    this.name = "BloomFilterConfigError";
  }
}
