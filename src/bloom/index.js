/**
 * Bloom Filter module exports.
 *
 * Main classes:
 * - BloomFilter: Counting Bloom Filter implementation
 *
 * Types:
 * - BloomFilterValue: primitive values supported (string | number | boolean | bigint | null)
 * - BloomFilterOptions: configuration { expectedItems, falsePositiveRate }
 * - BloomFilterJSON: serialization envelope
 *
 * Errors:
 * - BloomFilterError
 * - BloomFilterConfigError
 */
export { BloomFilter } from "./BloomFilter.js";
export { BloomFilterError, BloomFilterConfigError, } from "./types.js";
export { encodeValue, fnv1a, xorshift32, hashPair } from "./hash.js";
//# sourceMappingURL=index.js.map