/**
 * Non-cryptographic hash utilities used by the Bloom Filter.
 *
 * We use two fast 32-bit hashes combined via double hashing to derive
 * an arbitrary number of bit positions from a single value. This avoids
 * the need for several independent hash functions while keeping the
 * implementation dependency-free.
 *
 * The hashes are based on FNV-1a and a simple xorshift-style mix; they are
 * NOT cryptographic and are designed only for speed and decent dispersion
 * across bit positions.
 */
/**
 * Encodes a primitive value (string | number | boolean | null | undefined)
 * into a deterministic byte representation suitable for hashing.
 *
 * We deliberately do NOT use JSON.stringify for arbitrary objects because
 * key ordering is not guaranteed in older JavaScript engines, which would
 * lead to inconsistent hashes for equivalent objects.
 */
export declare function encodeValue(value: unknown): string;
/**
 * FNV-1a 32-bit hash. Fast, dependency-free, decent quality.
 */
export declare function fnv1a(input: string): number;
/**
 * A second, independent hash function derived from a different mixing
 * pattern. Used with fnv1a for double hashing.
 */
export declare function xorshift32(input: string): number;
/**
 * Two 32-bit hashes packed into a single array.
 *
 * Returned as [h1, h2]. Callers use double-hashing:
 *   index_i = (h1 + i * h2) % size
 *
 * which produces k distinct positions from two base hashes without
 * needing k independent hash functions.
 */
export declare function hashPair(value: string): [number, number];
//# sourceMappingURL=hash.d.ts.map