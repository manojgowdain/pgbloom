/**
 * SQL queries for authentication operations.
 */
import { hashRefreshToken } from "./tokens.js";
/**
 * Creates a new user.
 */
export async function createUser(pool, email, passwordHash, name) {
    const result = await pool.query(`INSERT INTO pgbloom_users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, email_verified, created_at, updated_at`, [email, passwordHash, name || null]);
    return mapRowToUser(result.rows[0]);
}
/**
 * Finds a user by email.
 */
export async function findUserByEmail(pool, email) {
    const result = await pool.query(`SELECT id, email, name, email_verified, created_at, updated_at
     FROM pgbloom_users WHERE email = $1`, [email]);
    if (result.rows.length === 0)
        return null;
    return mapRowToUser(result.rows[0]);
}
/**
 * Finds a user by ID.
 */
export async function findUserById(pool, id) {
    const result = await pool.query(`SELECT id, email, name, email_verified, created_at, updated_at
     FROM pgbloom_users WHERE id = $1`, [id]);
    if (result.rows.length === 0)
        return null;
    return mapRowToUser(result.rows[0]);
}
/**
 * Updates a user's email verification status.
 */
export async function setUserEmailVerified(pool, userId) {
    await pool.query(`UPDATE pgbloom_users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`, [userId]);
}
/**
 * Updates a user's password.
 */
export async function updateUserPassword(pool, userId, passwordHash) {
    await pool.query(`UPDATE pgbloom_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, userId]);
}
/**
 * Creates a new session (refresh token).
 */
export async function createSession(pool, userId, refreshToken, userAgent, ipAddress, expiresAt) {
    const refreshTokenHash = await hashRefreshToken(refreshToken);
    const expiry = expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default
    const result = await pool.query(`INSERT INTO pgbloom_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at, revoked_at`, [userId, refreshTokenHash, userAgent || null, ipAddress || null, expiry]);
    return mapRowToSession(result.rows[0]);
}
/**
 * Finds a session by refresh token hash.
 */
export async function findSessionByRefreshTokenHash(pool, refreshTokenHash) {
    const result = await pool.query(`SELECT id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at, revoked_at
     FROM pgbloom_sessions WHERE refresh_token_hash = $1`, [refreshTokenHash]);
    if (result.rows.length === 0)
        return null;
    return mapRowToSession(result.rows[0]);
}
/**
 * Finds all sessions for a user.
 */
export async function findSessionsByUserId(pool, userId) {
    const result = await pool.query(`SELECT id, user_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at, revoked_at
     FROM pgbloom_sessions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows.map(mapRowToSession);
}
/**
 * Revokes a session (logout).
 */
export async function revokeSession(pool, sessionId) {
    await pool.query(`UPDATE pgbloom_sessions SET revoked_at = NOW() WHERE id = $1`, [sessionId]);
}
/**
 * Revokes all sessions for a user.
 */
export async function revokeAllUserSessions(pool, userId) {
    await pool.query(`UPDATE pgbloom_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}
/**
 * Cleans up expired sessions.
 */
export async function cleanupExpiredSessions(pool) {
    const result = await pool.query(`DELETE FROM pgbloom_sessions WHERE expires_at < NOW() OR revoked_at IS NOT NULL`);
    return result.rowCount ?? 0;
}
/**
 * Maps a database row to User object.
 */
function mapRowToUser(row) {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        emailVerified: row.email_verified,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}
/**
 * Maps a database row to Session object.
 */
function mapRowToSession(row) {
    return {
        id: row.id,
        userId: row.user_id,
        refreshTokenHash: row.refresh_token_hash,
        userAgent: row.user_agent,
        ipAddress: row.ip_address,
        expiresAt: new Date(row.expires_at),
        createdAt: new Date(row.created_at),
        revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
    };
}
//# sourceMappingURL=queries.js.map