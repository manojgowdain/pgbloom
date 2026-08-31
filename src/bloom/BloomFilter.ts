/**
 * Counting Bloom Filter implementation.
 *
 * A Counting Bloom Filter replaces the single-bit array with an array of
 * small integer counters. This allows safe deletion: when an item is
 * removed, we decrement the counters at its hash positions. Counters
 * never wrap (we use Uint16Array which saturates at 65535).
 *
 * The public API is deliberately simple: add(), has(), clear(), size().
 * It does NOT expose delete/remove for individual items because that
 * requires the caller to know the item was previously added; a plain
 * Counting Bloom Filter cannot distinguish "not present" from "present
 * but all counters decremented". For our internal use we DO provide a
 * protected `remove()` method that is only called after a successful
 * cache deletion.
 *
 * Key properties:
 * - No false negatives: if has() returns false, the value was never added.
 * - False positives possible: has() may return true for values never added.
 * - Compact memory: uses Uint16Array (2 bytes per counter).
 */

import { encodeValue, hashPair } from "./hash.js";
import type { BloomFilterOptions, BloomFilterJSON, BloomFilterValue } from "./types.js";
import { BloomFilterConfigError } from "./types.js";

const LN2 = Math.LN2;
const LN2_SQUARED = LN2 * LN2;

/**
 * Calculates the optimal bit array size (m) and number of hash functions (k)
 * for a given capacity and false positive rate.
 *
 * Formulas:
 *   m = -(n * ln(p)) / (ln(2)^2)
 *   k = (m / n) * ln(2)
 */
function calculateParams(
  expectedItems: number,
  falsePositiveRate: number,
): { bitCount: number; hashCount: number } {
  if (expectedItems <= 0) {
    throw new BloomFilterConfigError(
      "expectedItems must be a positive integer.",
    );
  }
  if (!(falsePositiveRate > 0 && falsePositiveRate < 1)) {
    throw new BloomFilterConfigError(
      "falsePositiveRate must be a number between 0 and 1 (exclusive).",
    );
  }

  // m = -(n * ln(p)) / (ln(2)^2)
  const bitCount = Math.ceil(
    (-(expectedItems * Math.log(falsePositiveRate))) / LN2_SQUARED,
  );

  // k = (m / n) * ln(2), rounded to nearest integer, at least 1
  const hashCount = Math.max(1, Math.round((bitCount / expectedItems) * LN2));

  return { bitCount, hashCount };
}

/**
 * Round bit count up to the nearest multiple of 8 so we can use
 * whole bytes and avoid partial-byte masking in hot paths.
 */
function roundUpToByte(bitCount: number): number {
  return Math.ceil(bitCount / 8) * 8;
}

/**
 * A Counting Bloom Filter using Uint16Array for counters.
 */
export class BloomFilter {
  /** Number of bits (also the number of counters). */
  public readonly bitCount: number;
  /** Number of hash functions (positions per insert). */
  public readonly hashCount: number;
  /** Configuration echo for serialization/inspection. */
  public readonly expectedItems: number;
  public readonly falsePositiveRate: number;

  /** Internal counter array. Each slot is a 16-bit counter. */
  private readonly counters: Uint16Array;

  /** Tracks the number of distinct items added (approximately). */
  private _size = 0;

  constructor(options: BloomFilterOptions = {}) {
    const expectedItems = options.expectedItems ?? 10000;
    const falsePositiveRate = options.falsePositiveRate ?? 0.01;

    const { bitCount, hashCount } = calculateParams(
      expectedItems,
      falsePositiveRate,
    );

    this.expectedItems = expectedItems;
    this.falsePositiveRate = falsePositiveRate;
    this.bitCount = roundUpToByte(bitCount);
    this.hashCount = hashCount;
    this.counters = new Uint16Array(this.bitCount);
  }

  /**
   * Internal: compute the `hashCount` bit positions for a given value.
   * Uses double hashing: index_i = (h1 + i * h2) % bitCount
   */
  private getIndices(value: string): number[] {
    const [h1, h2] = hashPair(value);
    const indices = new Array<number>(this.hashCount);
    for (let i = 0; i < this.hashCount; i++) {
      // Use modular arithmetic with unsigned 32-bit operands
      indices[i] = ((h1 + Math.imul(i, h2)) >>> 0) % this.bitCount;
    }
    return indices;
  }

  /**
   * Adds a value to the filter. Increments the counters at all
   * corresponding hash positions.
   *
   * If the value is already present, the counters are incremented again,
   * which is fine — it just means the value was added multiple times.
   */
  add(value: BloomFilterValue): void {
    const encoded = encodeValue(value);
    const indices = this.getIndices(encoded);
    for (const idx of indices) {
      // Uint16Array saturates at 65535, which is more than enough
      // for any realistic insertion count.
      this.counters[idx]++;
    }
    this._size++;
  }

  /**
   * Checks whether a value is possibly in the filter.
   *
   * Returns:
   *   - `false`: the value is DEFINITELY not in the filter.
   *   - `true`:  the value MAY be in the filter (false positive possible).
   *
   * Never returns false negatives.
   */
  has(value: BloomFilterValue): boolean {
    const encoded = encodeValue(value);
    const [h1, h2] = hashPair(encoded);
    for (let i = 0; i < this.hashCount; i++) {
      const idx = ((h1 + Math.imul(i, h2)) >>> 0) % this.bitCount;
      if (this.counters[idx] === 0) {
        return false; // Definitely not present
      }
    }
    return true; // Possibly present
  }

  /**
   * Removes a value from the filter. Decrements the counters at all
   * corresponding hash positions.
   *
   * WARNING: Only call this if you are certain the value was previously
   * added and has NOT already been removed. A Counting Bloom Filter
   * cannot distinguish "never added" from "added and then removed the
   * same number of times" — both result in all counters being zero.
   *
   * This method is internal; public API does not expose remove().
   */
  remove(value: BloomFilterValue): void {
    const encoded = encodeValue(value);
    const indices = this.getIndices(encoded);
    for (const idx of indices) {
      if (this.counters[idx] > 0) {
        this.counters[idx]--;
      }
    }
    if (this._size > 0) {
      this._size--;
    }
  }

  /**
   * Clears all counters, resetting the filter to empty state.
   */
  clear(): void {
    this.counters.fill(0);
    this._size = 0;
  }

  /**
   * Returns the approximate number of items added to the filter.
   * Note: duplicate adds increment the count. Removes decrement it.
   */
  size(): number {
    return this._size;
  }

  /**
   * Serializes the filter to a JSON-compatible object.
   *
   * The bit array is encoded as base64 (LSB-first within each byte).
   * This format can be restored via `BloomFilter.fromJSON()`.
   */
  toJSON(): BloomFilterJSON {
    // Pack the uint16 counters into a byte array (2 bytes per counter)
    // using little-endian encoding, then base64.
    const byteLength = this.counters.length * 2;
    const bytes = new Uint8Array(byteLength);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < this.counters.length; i++) {
      view.setUint16(i * 2, this.counters[i], true); // little-endian
    }
    // Convert to base64
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const bitsB64 = btoa(binary);

    return {
      version: 1,
      expectedItems: this.expectedItems,
      falsePositiveRate: this.falsePositiveRate,
      bitCount: this.bitCount,
      hashCount: this.hashCount,
      bits: bitsB64,
    };
  }

  /**
   * Reconstructs a BloomFilter from a JSON object produced by toJSON().
   *
   * @throws BloomFilterConfigError if the JSON is invalid or version mismatch.
   */
  static fromJSON(json: BloomFilterJSON): BloomFilter {
    if (!json || json.version !== 1) {
      throw new BloomFilterConfigError(
        "Invalid or unsupported Bloom Filter JSON version.",
      );
    }
    if (
      typeof json.expectedItems !== "number" ||
      typeof json.falsePositiveRate !== "number" ||
      typeof json.bitCount !== "number" ||
      typeof json.hashCount !== "number" ||
      typeof json.bits !== "string"
    ) {
      throw new BloomFilterConfigError(
        "Bloom Filter JSON missing required fields.",
      );
    }

    const filter = new BloomFilter({
      expectedItems: json.expectedItems,
      falsePositiveRate: json.falsePositiveRate,
    });

    // Overwrite the computed bitCount/hashCount with stored values
    // (they should match but we trust the serialized data).
    // Note: the constructor already allocated counters of correct size.
    if (filter.bitCount !== json.bitCount) {
      throw new BloomFilterConfigError(
        "Bloom Filter bitCount mismatch in serialized data.",
      );
    }
    if (filter.hashCount !== json.hashCount) {
      throw new BloomFilterConfigError(
        "Bloom Filter hashCount mismatch in serialized data.",
      );
    }

    // Decode base64 back into Uint16Array
    const binary = atob(json.bits);
    if (binary.length !== filter.counters.length * 2) {
      throw new BloomFilterConfigError(
        "Bloom Filter bits length mismatch in serialized data.",
      );
    }
    const view = new DataView(
      new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i)).buffer,
    );
    for (let i = 0; i < filter.counters.length; i++) {
      filter.counters[i] = view.getUint16(i * 2, true);
    }

    return filter;
  }
}