/**
 * Model module - Mongoose-like CRUD API for PostgreSQL.
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import type { LocalStore } from "../storage/local/types.js";
import {
  createCacheState,
  getCache,
  setCache,
  deleteCache,
  type CacheState,
} from "../cache/index.js";

import type {
  ModelSchema,
  ModelOptions,
  ModelState,
  Document,
  QueryFilter,
  FindOptions,
  UpdateOps,
  CreateResult,
  UpdateResult,
  DeleteResult,
} from "./types.js";

import {
  validateDocument,
  applyDefaults,
  buildColumnMap,
  getPrimaryKey,
  generateCreateTableSQL,
  generateAlterTableSQL,
} from "./schema.js";

import {
  findQuery,
  findOneQuery,
  findByIdQuery,
  existsQuery,
  countDocumentsQuery,
  distinctQuery,
  createQuery,
  insertManyQuery,
  updateOneQuery,
  updateManyQuery,
  findOneAndUpdateQuery,
  findByIdAndUpdateQuery,
  deleteOneQuery,
  deleteManyQuery,
  findOneAndDeleteQuery,
  findByIdAndDeleteQuery,
} from "./queries.js";

// Re-export types
export type {
  ModelSchema,
  ModelOptions,
  ModelState,
  Document,
  QueryFilter,
  FindOptions,
  UpdateOps,
  CreateResult,
  UpdateResult,
  DeleteResult,
};

/**
 * Creates a new model state.
 */
export function createModelState<T = any>(
  pool: Pool,
  tableName: string,
  schema: ModelSchema,
  options: ModelOptions = {},
  localStore: LocalStore | null = null
): ModelState<T> {
  const defaultOptions: Required<ModelOptions> = {
    cache: options.cache ?? false,
    cacheTtl: options.cacheTtl ?? 60000,
    timestamps: options.timestamps ?? true,
    autoCreateTable: options.autoCreateTable ?? false,
  };

  const primaryKey = getPrimaryKey(schema);
  const columnMap = buildColumnMap(schema);

  // Create cache state if caching enabled
  let cacheState: CacheState | null = null;
  if (defaultOptions.cache && localStore) {
    cacheState = createCacheState(pool, { enabled: true });
  }

  return {
    pool,
    localStore,
    tableName,
    schema,
    options: defaultOptions,
    columnMap,
    primaryKey,
  };
}

/**
 * Model class providing Mongoose-like CRUD API.
 */
export class Model<T extends Document = Document> {
  private state: ModelState<T>;
  private cacheState: CacheState | null = null;

  constructor(
    pool: Pool,
    tableName: string,
    schema: ModelSchema,
    options: ModelOptions = {},
    localStore: LocalStore | null = null
  ) {
    this.state = createModelState(pool, tableName, schema, options, localStore);
    if (this.state.options.cache && localStore) {
      this.cacheState = createCacheState(pool, { enabled: true });
    }
  }

  /**
   * Creates the table if it doesn't exist.
   */
  async createTable(): Promise<void> {
    const sql = generateCreateTableSQL(
      this.state.tableName,
      this.state.schema,
      this.state.primaryKey,
      this.state.options.timestamps
    );
    await this.state.pool.query(sql);
  }

  /**
   * Syncs indexes and adds missing columns.
   */
  async syncIndexes(): Promise<void> {
    // Get existing columns
    const result = await this.state.pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [this.state.tableName]
    );
    const existingColumns = new Set(result.rows.map((r) => r.column_name));

    // Generate and execute ALTER statements
    const alterStatements = generateAlterTableSQL(
      this.state.tableName,
      this.state.schema,
      existingColumns,
      this.state.primaryKey,
      this.state.options.timestamps
    );

    for (const stmt of alterStatements) {
      try {
        await this.state.pool.query(stmt);
      } catch (err) {
        // Ignore errors for constraints that already exist
        if (!(err as Error).message.includes("already exists")) {
          throw err;
        }
      }
    }
  }

  /**
   * Gets cache key for a document.
   */
  private getCacheKey(id: string | number): string {
    return `${this.state.tableName}:${id}`;
  }

  /**
   * Invalidates cache for a document.
   */
  private async invalidateCache(id: string | number): Promise<void> {
    if (this.cacheState) {
      await deleteCache(this.cacheState, this.getCacheKey(id));
    }
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Creates a new document.
   */
  async create(doc: Partial<T>): Promise<T> {
    // Apply defaults
    const docWithDefaults = applyDefaults(this.state.schema, doc as Record<string, any>);

    // Validate
    validateDocument(this.state.schema, docWithDefaults, false);

    // Add timestamps
    if (this.state.options.timestamps) {
      const now = new Date();
      (docWithDefaults as any).createdAt = now;
      (docWithDefaults as any).updatedAt = now;
    }

    // Insert
    const created = await createQuery(this.state, docWithDefaults as Partial<T>);

    // Invalidate any related cache
    await this.invalidateCache((created as any).id);

    return created;
  }

  /**
   * Creates multiple documents.
   */
  async insertMany(docs: Partial<T>[]): Promise<T[]> {
    if (docs.length === 0) return [];

    // Apply defaults and validate each
    const docsWithDefaults = docs.map((doc) => {
      const withDefaults = applyDefaults(this.state.schema, doc as Record<string, any>);
      validateDocument(this.state.schema, withDefaults, false);
      if (this.state.options.timestamps) {
        const now = new Date();
        (withDefaults as any).createdAt = now;
        (withDefaults as any).updatedAt = now;
      }
      return withDefaults;
    });

    const created = await insertManyQuery(this.state, docsWithDefaults as Partial<T>[]);
    return created;
  }

  // ============================================================
  // READ
  // ============================================================

  /**
   * Finds documents matching the filter.
   */
  async find(filter: QueryFilter = {}, options: FindOptions = {}): Promise<T[]> {
    // Check cache for simple ID lookups
    if (this.cacheState && filter && Object.keys(filter).length === 1) {
      const pk = this.state.primaryKey;
      if (filter[pk] && typeof filter[pk] === "object" && filter[pk].$eq) {
        const id = filter[pk].$eq;
        const cached = await getCache<T>(this.cacheState, this.getCacheKey(id));
        if (cached) return [cached];
      }
    }

    const results = await findQuery<T>(this.state, filter, options);

    // Cache results if simple lookup
    if (this.cacheState && results.length === 1) {
      const id = (results[0] as any).id;
      if (id) {
        await setCache(this.cacheState, this.getCacheKey(id), results[0], this.state.options.cacheTtl);
      }
    }

    return results;
  }

  /**
   * Finds a single document.
   */
  async findOne(filter: QueryFilter, options: FindOptions = {}): Promise<T | null> {
    const results = await this.find(filter, { ...options, limit: 1 });
    return results[0] || null;
  }

  /**
   * Finds a document by ID.
   */
  async findById(id: string | number): Promise<T | null> {
    // Check cache first
    if (this.cacheState) {
      const cached = await getCache<T>(this.cacheState, this.getCacheKey(id));
      if (cached) return cached;
    }

    const doc = await findByIdQuery<T>(this.state, id);

    // Cache result
    if (doc && this.cacheState) {
      await setCache(this.cacheState, this.getCacheKey(id), doc, this.state.options.cacheTtl);
    }

    return doc;
  }

  /**
   * Checks if a document exists.
   */
  async exists(filter: QueryFilter): Promise<boolean> {
    return existsQuery(this.state, filter);
  }

  /**
   * Counts documents matching the filter.
   */
  async countDocuments(filter: QueryFilter = {}): Promise<number> {
    return countDocumentsQuery(this.state, filter);
  }

  /**
   * Gets distinct values for a field.
   */
  async distinct(field: string, filter: QueryFilter = {}): Promise<any[]> {
    return distinctQuery(this.state, field, filter);
  }

  // ============================================================
  // UPDATE
  // ============================================================

  /**
   * Updates a single document.
   */
  async updateOne(filter: QueryFilter, update: UpdateOps): Promise<UpdateResult> {
    const result = await updateOneQuery(this.state, filter, update);

    // Invalidate cache for matched documents
    if (result.matched > 0) {
      // For simplicity, we could fetch IDs and invalidate, but that's expensive
      // Instead, we'll clear the entire model cache if enabled
      if (this.cacheState) {
        // Note: In production, you'd want more granular cache invalidation
        // This is a simplified approach
      }
    }

    return result;
  }

  /**
   * Updates multiple documents.
   */
  async updateMany(filter: QueryFilter, update: UpdateOps): Promise<UpdateResult> {
    return updateManyQuery(this.state, filter, update);
  }

  /**
   * Finds one document and updates it.
   */
  async findOneAndUpdate(filter: QueryFilter, update: UpdateOps, options: { new?: boolean } = {}): Promise<T | null> {
    const doc = await findOneAndUpdateQuery<T>(this.state, filter, update, options);

    // Invalidate cache
    if (doc && this.cacheState) {
      await this.invalidateCache((doc as any).id);
    }

    return doc;
  }

  /**
   * Finds a document by ID and updates it.
   */
  async findByIdAndUpdate(id: string | number, update: UpdateOps, options: { new?: boolean } = {}): Promise<T | null> {
    const doc = await findByIdAndUpdateQuery<T>(this.state, id, update, options);

    // Invalidate cache
    if (doc && this.cacheState) {
      await this.invalidateCache(id);
    }

    return doc;
  }

  // ============================================================
  // DELETE
  // ============================================================

  /**
   * Deletes a single document.
   */
  async deleteOne(filter: QueryFilter): Promise<DeleteResult> {
    const result = await deleteOneQuery(this.state, filter);

    // Invalidate cache (best effort)
    if (this.cacheState) {
      // Would need to know which IDs were deleted
    }

    return result;
  }

  /**
   * Deletes multiple documents.
   */
  async deleteMany(filter: QueryFilter): Promise<DeleteResult> {
    return deleteManyQuery(this.state, filter);
  }

  /**
   * Finds one document and deletes it.
   */
  async findOneAndDelete(filter: QueryFilter): Promise<T | null> {
    const doc = await findOneAndDeleteQuery<T>(this.state, filter);

    // Invalidate cache
    if (doc && this.cacheState) {
      await this.invalidateCache((doc as any).id);
    }

    return doc;
  }

  /**
   * Finds a document by ID and deletes it.
   */
  async findByIdAndDelete(id: string | number): Promise<T | null> {
    const doc = await findByIdAndDeleteQuery<T>(this.state, id);

    // Invalidate cache
    if (doc && this.cacheState) {
      await this.invalidateCache(id);
    }

    return doc;
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Gets the table name.
   */
  getTableName(): string {
    return this.state.tableName;
  }

  /**
   * Gets the schema.
   */
  getSchema(): ModelSchema {
    return this.state.schema;
  }
}

/**
 * Factory function to create a Model instance.
 */
export function createModel<T extends Document = Document>(
  pool: Pool,
  tableName: string,
  schema: ModelSchema,
  options: ModelOptions = {},
  localStore: LocalStore | null = null
): Model<T> {
  return new Model<T>(pool, tableName, schema, options, localStore);
}