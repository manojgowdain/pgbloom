/**
 * Model types for the PGBloom CRUD API.
 */

import { Pool } from "pg";
import type { LocalStore } from "../storage/local/types.js";

/**
 * Schema field definition.
 */
export interface SchemaField {
  type: "string" | "number" | "boolean" | "date" | "json" | "buffer";
  required?: boolean;
  unique?: boolean;
  default?: any;
  index?: boolean;
}

/**
 * Model schema definition.
 */
export interface ModelSchema {
  [field: string]: SchemaField;
}

/**
 * Query filter with MongoDB-style operators.
 */
export type QueryFilter = {
  [field: string]: any
    | { $eq?: any }
    | { $ne?: any }
    | { $gt?: any }
    | { $gte?: any }
    | { $lt?: any }
    | { $lte?: any }
    | { $in?: any[] }
    | { $nin?: any[] }
    | { $exists?: boolean }
    | { $regex?: string | RegExp };
};

/**
 * Find options for select, sort, pagination.
 */
export interface FindOptions {
  select?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

/**
 * Update operations with MongoDB-style operators.
 */
export type UpdateOps = {
  $set?: Record<string, any>;
  $inc?: Record<string, number>;
  $unset?: Record<string, true>;
  $push?: Record<string, any>;
  $pull?: Record<string, any>;
};

/**
 * Model options.
 */
export interface ModelOptions {
  cache?: boolean;
  cacheTtl?: number;
  timestamps?: boolean;
  autoCreateTable?: boolean;
}

/**
 * Internal model state.
 */
export interface ModelState<T = any> {
  pool: Pool;
  localStore: LocalStore | null;
  tableName: string;
  schema: ModelSchema;
  options: Required<ModelOptions>;
  columnMap: Map<string, string>;
  primaryKey: string;
}

/**
 * Document with standard fields.
 */
export type Document<T = any> = T & {
  id: string | number;
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Result of create/insert operations.
 */
export interface CreateResult<T> {
  id: string | number;
  document: T;
}

/**
 * Result of update operations.
 */
export interface UpdateResult {
  matched: number;
  modified: number;
}

/**
 * Result of delete operations.
 */
export interface DeleteResult {
  deleted: number;
}

/**
 * Pagination result.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}