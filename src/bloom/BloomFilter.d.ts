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
import type { BloomFilterOptions, BloomFilterJSON, BloomFilterValue } from "./types.js";
/**
 * A Counting Bloom Filter using Uint16Array for counters.
 */
export declare class BloomFilter {
    /** Number of bits (also the number of counters). */
    readonly bitCount: number;
    /** Number of hash functions (positions per insert). */
    readonly hashCount: number;
    /** Configuration echo for serialization/inspection. */
    readonly expectedItems: number;
    readonly falsePositiveRate: number;
    /** Internal counter array. Each slot is a 16-bit counter. */
    private readonly counters;
    /** Tracks the number of distinct items added (approximately). */
    private _size;
    constructor(options?: BloomFilterOptions);
    /**
     * Internal: compute the `hashCount` bit positions for a given value.
     * Uses double hashing: index_i = (h1 + i * h2) % bitCount
     */
    private getIndices;
    /**
     * Adds a value to the filter. Increments the counters at all
     * corresponding hash positions.
     *
     * If the value is already present, the counters are incremented again,
     * which is fine — it just means the value was added multiple times.
     */
    add(value: BloomFilterValue): void;
    /**
     * Checks whether a value is possibly in the filter.
     *
     * Returns:
     *   - `false`: the value is DEFINITELY not in the filter.
     *   - `true`:  the value MAY be in the filter (false positive possible).
     *
     * Never returns false negatives.
     */
    has(value: BloomFilterValue): boolean;
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
    remove(value: BloomFilterValue): void;
    /**
     * Clears all counters, resetting the filter to empty state.
     */
    clear(): void;
    /**
     * Returns the approximate number of items added to the filter.
     * Note: duplicate adds increment the count. Removes decrement it.
     */
    size(): number;
    /**
     * Serializes the filter to a JSON-compatible object.
     *
     * The bit array is encoded as base64 (LSB-first within each byte).
     * This format can be restored via `BloomFilter.fromJSON()`.
     */
    toJSON(): BloomFilterJSON;
    /**
     * Reconstructs a BloomFilter from a JSON object produced by toJSON().
     *
     * @throws BloomFilterConfigError if the JSON is invalid or version mismatch.
     */
    static fromJSON(json: BloomFilterJSON): BloomFilter;
}
//# sourceMappingURL=BloomFilter.d.ts.map