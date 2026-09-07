/**
 * Token Bucket Rate Limiter implementation.
 */
import type { RateLimitState, TokenBucketOptions, RateLimitResult } from "./types.js";
/**
 * Checks and consumes a rate limit using the token bucket algorithm.
 * Returns the rate limit result with allowed status and metadata.
 */
export declare function tokenBucket(state: RateLimitState, options: TokenBucketOptions): Promise<RateLimitResult>;
//# sourceMappingURL=token-bucket.d.ts.map