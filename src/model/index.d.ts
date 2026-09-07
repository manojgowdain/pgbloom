/**
 * Model module - Mongoose-like CRUD API for PostgreSQL.
 */
import { Pool } from "pg";
import type { LocalStore } from "../storage/local/types.js";
import type { ModelSchema, ModelOptions, ModelState, Document, QueryFilter, FindOptions, UpdateOps, CreateResult, UpdateResult, DeleteResult } from "./types.js";
export type { ModelSchema, ModelOptions, ModelState, Document, QueryFilter, FindOptions, UpdateOps, CreateResult, UpdateResult, DeleteResult, };
/**
 * Creates a new model state.
 */
export declare function createModelState<T = any>(pool: Pool, tableName: string, schema: ModelSchema, options?: ModelOptions, localStore?: LocalStore | null): ModelState<T>;
/**
 * Model class providing Mongoose-like CRUD API.
 */
export declare class Model<T extends Document = Document> {
    private state;
    private cacheState;
    constructor(pool: Pool, tableName: string, schema: ModelSchema, options?: ModelOptions, localStore?: LocalStore | null);
    /**
     * Creates the table if it doesn't exist.
     */
    createTable(): Promise<void>;
    /**
     * Syncs indexes and adds missing columns.
     */
    syncIndexes(): Promise<void>;
    /**
     * Gets cache key for a document.
     */
    private getCacheKey;
    /**
     * Invalidates cache for a document.
     */
    private invalidateCache;
    /**
     * Creates a new document.
     */
    create(doc: Partial<T>): Promise<T>;
    /**
     * Creates multiple documents.
     */
    insertMany(docs: Partial<T>[]): Promise<T[]>;
    /**
     * Finds documents matching the filter.
     */
    find(filter?: QueryFilter, options?: FindOptions): Promise<T[]>;
    /**
     * Finds a single document.
     */
    findOne(filter: QueryFilter, options?: FindOptions): Promise<T | null>;
    /**
     * Finds a document by ID.
     */
    findById(id: string | number): Promise<T | null>;
    /**
     * Checks if a document exists.
     */
    exists(filter: QueryFilter): Promise<boolean>;
    /**
     * Counts documents matching the filter.
     */
    countDocuments(filter?: QueryFilter): Promise<number>;
    /**
     * Gets distinct values for a field.
     */
    distinct(field: string, filter?: QueryFilter): Promise<any[]>;
    /**
     * Updates a single document.
     */
    updateOne(filter: QueryFilter, update: UpdateOps): Promise<UpdateResult>;
    /**
     * Updates multiple documents.
     */
    updateMany(filter: QueryFilter, update: UpdateOps): Promise<UpdateResult>;
    /**
     * Finds one document and updates it.
     */
    findOneAndUpdate(filter: QueryFilter, update: UpdateOps, options?: {
        new?: boolean;
    }): Promise<T | null>;
    /**
     * Finds a document by ID and updates it.
     */
    findByIdAndUpdate(id: string | number, update: UpdateOps, options?: {
        new?: boolean;
    }): Promise<T | null>;
    /**
     * Deletes a single document.
     */
    deleteOne(filter: QueryFilter): Promise<DeleteResult>;
    /**
     * Deletes multiple documents.
     */
    deleteMany(filter: QueryFilter): Promise<DeleteResult>;
    /**
     * Finds one document and deletes it.
     */
    findOneAndDelete(filter: QueryFilter): Promise<T | null>;
    /**
     * Finds a document by ID and deletes it.
     */
    findByIdAndDelete(id: string | number): Promise<T | null>;
    /**
     * Gets the table name.
     */
    getTableName(): string;
    /**
     * Gets the schema.
     */
    getSchema(): ModelSchema;
}
/**
 * Factory function to create a Model instance.
 */
export declare function createModel<T extends Document = Document>(pool: Pool, tableName: string, schema: ModelSchema, options?: ModelOptions, localStore?: LocalStore | null): Model<T>;
//# sourceMappingURL=index.d.ts.map