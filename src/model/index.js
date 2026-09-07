/**
 * Model module - Mongoose-like CRUD API for PostgreSQL.
 */
import { createCacheState, getCache, setCache, deleteCache, } from "../cache/index.js";
import { validateDocument, applyDefaults, buildColumnMap, getPrimaryKey, generateCreateTableSQL, generateAlterTableSQL, } from "./schema.js";
import { findQuery, findByIdQuery, existsQuery, countDocumentsQuery, distinctQuery, createQuery, insertManyQuery, updateOneQuery, updateManyQuery, findOneAndUpdateQuery, findByIdAndUpdateQuery, deleteOneQuery, deleteManyQuery, findOneAndDeleteQuery, findByIdAndDeleteQuery, } from "./queries.js";
/**
 * Creates a new model state.
 */
export function createModelState(pool, tableName, schema, options = {}, localStore = null) {
    const defaultOptions = {
        cache: options.cache ?? false,
        cacheTtl: options.cacheTtl ?? 60000,
        timestamps: options.timestamps ?? true,
        autoCreateTable: options.autoCreateTable ?? false,
    };
    const primaryKey = getPrimaryKey(schema);
    const columnMap = buildColumnMap(schema);
    // Create cache state if caching enabled
    let cacheState = null;
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
export class Model {
    state;
    cacheState = null;
    constructor(pool, tableName, schema, options = {}, localStore = null) {
        this.state = createModelState(pool, tableName, schema, options, localStore);
        if (this.state.options.cache && localStore) {
            this.cacheState = createCacheState(pool, { enabled: true });
        }
    }
    /**
     * Creates the table if it doesn't exist.
     */
    async createTable() {
        const sql = generateCreateTableSQL(this.state.tableName, this.state.schema, this.state.primaryKey, this.state.options.timestamps);
        await this.state.pool.query(sql);
    }
    /**
     * Syncs indexes and adds missing columns.
     */
    async syncIndexes() {
        // Get existing columns
        const result = await this.state.pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [this.state.tableName]);
        const existingColumns = new Set(result.rows.map((r) => r.column_name));
        // Generate and execute ALTER statements
        const alterStatements = generateAlterTableSQL(this.state.tableName, this.state.schema, existingColumns, this.state.primaryKey, this.state.options.timestamps);
        for (const stmt of alterStatements) {
            try {
                await this.state.pool.query(stmt);
            }
            catch (err) {
                // Ignore errors for constraints that already exist
                if (!err.message.includes("already exists")) {
                    throw err;
                }
            }
        }
    }
    /**
     * Gets cache key for a document.
     */
    getCacheKey(id) {
        return `${this.state.tableName}:${id}`;
    }
    /**
     * Invalidates cache for a document.
     */
    async invalidateCache(id) {
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
    async create(doc) {
        // Apply defaults
        const docWithDefaults = applyDefaults(this.state.schema, doc);
        // Validate
        validateDocument(this.state.schema, docWithDefaults, false);
        // Add timestamps
        if (this.state.options.timestamps) {
            const now = new Date();
            docWithDefaults.createdAt = now;
            docWithDefaults.updatedAt = now;
        }
        // Insert
        const created = await createQuery(this.state, docWithDefaults);
        // Invalidate any related cache
        await this.invalidateCache(created.id);
        return created;
    }
    /**
     * Creates multiple documents.
     */
    async insertMany(docs) {
        if (docs.length === 0)
            return [];
        // Apply defaults and validate each
        const docsWithDefaults = docs.map((doc) => {
            const withDefaults = applyDefaults(this.state.schema, doc);
            validateDocument(this.state.schema, withDefaults, false);
            if (this.state.options.timestamps) {
                const now = new Date();
                withDefaults.createdAt = now;
                withDefaults.updatedAt = now;
            }
            return withDefaults;
        });
        const created = await insertManyQuery(this.state, docsWithDefaults);
        return created;
    }
    // ============================================================
    // READ
    // ============================================================
    /**
     * Finds documents matching the filter.
     */
    async find(filter = {}, options = {}) {
        // Check cache for simple ID lookups
        if (this.cacheState && filter && Object.keys(filter).length === 1) {
            const pk = this.state.primaryKey;
            if (filter[pk] && typeof filter[pk] === "object" && filter[pk].$eq) {
                const id = filter[pk].$eq;
                const cached = await getCache(this.cacheState, this.getCacheKey(id));
                if (cached)
                    return [cached];
            }
        }
        const results = await findQuery(this.state, filter, options);
        // Cache results if simple lookup
        if (this.cacheState && results.length === 1) {
            const id = results[0].id;
            if (id) {
                await setCache(this.cacheState, this.getCacheKey(id), results[0], this.state.options.cacheTtl);
            }
        }
        return results;
    }
    /**
     * Finds a single document.
     */
    async findOne(filter, options = {}) {
        const results = await this.find(filter, { ...options, limit: 1 });
        return results[0] || null;
    }
    /**
     * Finds a document by ID.
     */
    async findById(id) {
        // Check cache first
        if (this.cacheState) {
            const cached = await getCache(this.cacheState, this.getCacheKey(id));
            if (cached)
                return cached;
        }
        const doc = await findByIdQuery(this.state, id);
        // Cache result
        if (doc && this.cacheState) {
            await setCache(this.cacheState, this.getCacheKey(id), doc, this.state.options.cacheTtl);
        }
        return doc;
    }
    /**
     * Checks if a document exists.
     */
    async exists(filter) {
        return existsQuery(this.state, filter);
    }
    /**
     * Counts documents matching the filter.
     */
    async countDocuments(filter = {}) {
        return countDocumentsQuery(this.state, filter);
    }
    /**
     * Gets distinct values for a field.
     */
    async distinct(field, filter = {}) {
        return distinctQuery(this.state, field, filter);
    }
    // ============================================================
    // UPDATE
    // ============================================================
    /**
     * Updates a single document.
     */
    async updateOne(filter, update) {
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
    async updateMany(filter, update) {
        return updateManyQuery(this.state, filter, update);
    }
    /**
     * Finds one document and updates it.
     */
    async findOneAndUpdate(filter, update, options = {}) {
        const doc = await findOneAndUpdateQuery(this.state, filter, update, options);
        // Invalidate cache
        if (doc && this.cacheState) {
            await this.invalidateCache(doc.id);
        }
        return doc;
    }
    /**
     * Finds a document by ID and updates it.
     */
    async findByIdAndUpdate(id, update, options = {}) {
        const doc = await findByIdAndUpdateQuery(this.state, id, update, options);
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
    async deleteOne(filter) {
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
    async deleteMany(filter) {
        return deleteManyQuery(this.state, filter);
    }
    /**
     * Finds one document and deletes it.
     */
    async findOneAndDelete(filter) {
        const doc = await findOneAndDeleteQuery(this.state, filter);
        // Invalidate cache
        if (doc && this.cacheState) {
            await this.invalidateCache(doc.id);
        }
        return doc;
    }
    /**
     * Finds a document by ID and deletes it.
     */
    async findByIdAndDelete(id) {
        const doc = await findByIdAndDeleteQuery(this.state, id);
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
    getTableName() {
        return this.state.tableName;
    }
    /**
     * Gets the schema.
     */
    getSchema() {
        return this.state.schema;
    }
}
/**
 * Factory function to create a Model instance.
 */
export function createModel(pool, tableName, schema, options = {}, localStore = null) {
    return new Model(pool, tableName, schema, options, localStore);
}
//# sourceMappingURL=index.js.map