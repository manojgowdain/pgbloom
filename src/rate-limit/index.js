/**
 * Rate Limit module with Fixed Window, Sliding Window, and Token Bucket algorithms.
 */
import { fixedWindow } from "./fixed-window.js";
import { slidingWindow } from "./sliding-window.js";
import { tokenBucket } from "./token-bucket.js";
import { cleanupExpiredRateLimits } from "./queries.js";
/**
 * Creates a new rate limit state with the database connection pool
 * and optional local store for caching.
 */
export function createRateLimitState(pool, localStore = null) {
    return {
        pool,
        localStore,
    };
}
/**
 * Checks rate limit using the fixed window algorithm.
 */
export async function checkRateLimit(state, options) {
    return fixedWindow(state, options);
}
/**
 * Checks rate limit using the sliding window algorithm.
 */
export async function checkSlidingRateLimit(state, options) {
    return slidingWindow(state, options);
}
/**
 * Checks rate limit using the token bucket algorithm.
 */
export async function checkTokenBucketRateLimit(state, options) {
    return tokenBucket(state, options);
}
/**
 * Convenience function for simple fixed window rate limiting.
 */
export async function rateLimit(state, key, limit, windowMs) {
    return fixedWindow(state, { key, limit, windowMs });
}
/**
 * Convenience function for simple token bucket rate limiting.
 */
export async function rateLimitTokenBucket(state, key, capacity, refillRate) {
    return tokenBucket(state, { key, capacity, refillRate });
}
/**
 * Cleans up expired rate limit entries.
 */
export async function cleanup(state, maxAgeMs = 24 * 60 * 60 * 1000) {
    return cleanupExpiredRateLimits(state.pool, maxAgeMs);
}
/**
 * Generates a unique rate limit key with optional prefix.
 */
export function generateKey(prefix, identifier) {
    return `${prefix}:${identifier}`;
}
/**
 * Generates a unique rate limit key for a user/API combination.
 */
export function generateUserKey(userId, api) {
    return api ? `ratelimit:user:${userId}:api:${api}` : `ratelimit:user:${userId}`;
}
/**
 * Generates a unique rate limit key for an IP address.
 */
export function generateIpKey(ip, endpoint) {
    return endpoint ? `ratelimit:ip:${ip}:endpoint:${endpoint}` : `ratelimit:ip:${ip}`;
}
//# sourceMappingURL=index.js.map