// JSR entry point - exports all public API from the library
export { createPgbloom, type PgbloomClient, type PgbloomOptions } from "./src/client/index.ts";

// Browser entry point
export * from "./src/browser.ts";

// Server entry point
export * from "./src/server.ts";

// Model / CRUD
export { createModelState, createModel, type Model, type ModelSchema, type ModelOptions, type ModelState } from "./src/model/index.ts";

// Authentication
export {
  createAuthState,
  createAuth,
  type Auth,
  type AuthOptions,
  type AuthState,
  type User,
  type Session,
  type TokenPayload,
  type AuthResult,
  type SignupInput,
  type LoginInput,
  type ResetPasswordInput,
  type VerifyOTPInput,
  type ForgotPasswordInput,
  type OTTPurpose,
  type OTPOptions,
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyToken,
  hashRefreshToken,
  parseExpiry,
  extractBearerToken,
  sendOTP,
  verifyOTP,
  resendOTP,
  cleanupExpiredOTPs,
  createOTPState,
} from "./src/auth/index.ts";

// Default export
import { createPgbloom } from "./src/client/index.ts";
export default createPgbloom;