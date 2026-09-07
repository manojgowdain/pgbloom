/**
 * OTP (One-Time Password) generation and verification.
 */
import { randomBytes } from "crypto";
import { PGBloomOTPError, PGBloomError } from "../utils/validation.js";
import { hashPassword, verifyPassword } from "./password.js";
/**
 * Parses duration string (e.g., "5m", "60s", "2h") to milliseconds.
 */
export function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new PGBloomError(`Invalid duration format: ${duration}. Use format like "5m", "60s", "2h"`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case "s":
            return value * 1000;
        case "m":
            return value * 60 * 1000;
        case "h":
            return value * 60 * 60 * 1000;
        case "d":
            return value * 24 * 60 * 60 * 1000;
        default:
            throw new PGBloomError(`Unknown time unit: ${unit}`);
    }
}
/**
 * Generates a secure random OTP code.
 */
export function generateOTP(length = 6) {
    // Generate cryptographically secure random digits
    const bytes = randomBytes(length);
    let otp = "";
    for (let i = 0; i < length; i++) {
        otp += (bytes[i] % 10).toString();
    }
    return otp;
}
/**
 * Creates OTP state with default options.
 */
export function createOTPState(pool, options = {}) {
    return {
        expiry: options.expiry || "5m",
        maxAttempts: options.maxAttempts ?? 5,
        resendCooldown: options.resendCooldown || "60s",
        length: options.length ?? 6,
    };
}
/**
 * Sends an OTP to an email (stores hashed OTP in database).
 * In a real implementation, this would integrate with an email service.
 */
export async function sendOTP(state, email, purpose, userId, otpOptions = {}) {
    const opts = createOTPState(state.pool, otpOptions);
    const otp = generateOTP(opts.length);
    const otpHash = await hashPassword(otp, state.argon2Options);
    const expiresAt = new Date(Date.now() + parseDuration(opts.expiry));
    // Check resend cooldown
    const existing = await state.pool.query(`SELECT id, created_at FROM pgbloom_otp_codes
     WHERE email = $1 AND purpose = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`, [email, purpose]);
    if (existing.rows.length > 0) {
        const lastSent = new Date(existing.rows[0].created_at);
        const cooldownMs = parseDuration(opts.resendCooldown);
        if (Date.now() - lastSent.getTime() < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - (Date.now() - lastSent.getTime())) / 1000);
            throw new PGBloomOTPError(`Please wait ${remaining}s before requesting another OTP`);
        }
    }
    // Insert new OTP
    const result = await state.pool.query(`INSERT INTO pgbloom_otp_codes (user_id, email, otp_hash, purpose, expires_at, max_attempts)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, expires_at`, [userId || null, email, otpHash, purpose, expiresAt, opts.maxAttempts]);
    const otpRecord = result.rows[0];
    // TODO: Send OTP via email/SMS here
    // For now, we'll log it (in development only)
    if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] OTP for ${email} (${purpose}): ${otp}`);
    }
    return {
        otpId: String(otpRecord.id),
        expiresAt: new Date(otpRecord.expires_at),
    };
}
/**
 * Maps database row to OTPRecord with camelCase properties.
 */
function mapRowToOTPRecord(row) {
    return {
        id: row.id,
        userId: row.user_id,
        email: row.email,
        otpHash: row.otp_hash,
        purpose: row.purpose,
        expiresAt: new Date(row.expires_at),
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        used: row.used,
        createdAt: new Date(row.created_at),
    };
}
/**
 * Verifies an OTP code.
 */
export async function verifyOTP(state, email, otp, purpose, otpOptions = {}) {
    const opts = createOTPState(state.pool, otpOptions);
    // Find the most recent unused OTP for this email/purpose
    const result = await state.pool.query(`SELECT * FROM pgbloom_otp_codes
     WHERE email = $1 AND purpose = $2 AND used = FALSE
     ORDER BY created_at DESC LIMIT 1`, [email, purpose]);
    if (result.rows.length === 0) {
        return { valid: false };
    }
    const record = mapRowToOTPRecord(result.rows[0]);
    const now = new Date();
    // Check expiration
    if (record.expiresAt < now) {
        return { valid: false };
    }
    // Check max attempts
    if (record.attempts >= record.maxAttempts) {
        return { valid: false };
    }
    // Verify OTP
    const isValid = await verifyPassword(otp, record.otpHash);
    // Increment attempts
    await state.pool.query(`UPDATE pgbloom_otp_codes SET attempts = attempts + 1 WHERE id = $1`, [record.id]);
    if (!isValid) {
        return { valid: false };
    }
    // Mark as used
    await state.pool.query(`UPDATE pgbloom_otp_codes SET used = TRUE WHERE id = $1`, [record.id]);
    return {
        valid: true,
        userId: record.userId,
        otpRecord: record,
    };
}
/**
 * Resends an OTP (invalidates previous unused OTPs for same email/purpose).
 */
export async function resendOTP(state, email, purpose, userId, otpOptions = {}) {
    // Mark previous unused OTPs as used
    await state.pool.query(`UPDATE pgbloom_otp_codes SET used = TRUE WHERE email = $1 AND purpose = $2 AND used = FALSE`, [email, purpose]);
    return sendOTP(state, email, purpose, userId, otpOptions);
}
/**
 * Cleans up expired OTP codes.
 */
export async function cleanupExpiredOTPs(state) {
    const result = await state.pool.query(`DELETE FROM pgbloom_otp_codes WHERE expires_at < NOW() OR used = TRUE`);
    return result.rowCount ?? 0;
}
/**
 * Gets OTP record by ID (for debugging/admin).
 */
export async function getOTPById(state, id) {
    const result = await state.pool.query(`SELECT * FROM pgbloom_otp_codes WHERE id = $1`, [id]);
    if (result.rows.length === 0)
        return null;
    return result.rows[0];
}
//# sourceMappingURL=otp.js.map