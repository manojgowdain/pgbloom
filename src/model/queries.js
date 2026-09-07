/**
 * SQL query builders for the PGBloom model CRUD operations.
 */
import { toSnakeCase } from "./schema.js";
/**
 * Builds WHERE clause from query filter with parameterized values.
 * Returns { sql: string, params: any[], paramIndex: number }
 */
export function buildWhereClause(filter, columnMap, startParamIndex = 1) {
    const conditions = [];
    const params = [];
    let paramIndex = startParamIndex;
    for (const [field, value] of Object.entries(filter)) {
        const column = columnMap.get(field) || toSnakeCase(field);
        // Handle operators
        if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp)) {
            const operators = Object.keys(value);
            for (const op of operators) {
                const opValue = value[op];
                const placeholder = `$${paramIndex++}`;
                params.push(opValue);
                switch (op) {
                    case "$eq":
                        conditions.push(`${column} = ${placeholder}`);
                        break;
                    case "$ne":
                        conditions.push(`${column} != ${placeholder}`);
                        break;
                    case "$gt":
                        conditions.push(`${column} > ${placeholder}`);
                        break;
                    case "$gte":
                        conditions.push(`${column} >= ${placeholder}`);
                        break;
                    case "$lt":
                        conditions.push(`${column} < ${placeholder}`);
                        break;
                    case "$lte":
                        conditions.push(`${column} <= ${placeholder}`);
                        break;
                    case "$in":
                        if (Array.isArray(opValue) && opValue.length > 0) {
                            const placeholders = opValue.map(() => `$${paramIndex++}`).join(", ");
                            params.push(...opValue);
                            conditions.push(`${column} IN (${placeholders})`);
                        }
                        else {
                            conditions.push("FALSE"); // Empty array = no matches
                        }
                        break;
                    case "$nin":
                        if (Array.isArray(opValue) && opValue.length > 0) {
                            const placeholders = opValue.map(() => `$${paramIndex++}`).join(", ");
                            params.push(...opValue);
                            conditions.push(`${column} NOT IN (${placeholders})`);
                        }
                        else {
                            conditions.push("TRUE"); // Empty array = all matches
                        }
                        break;
                    case "$exists":
                        if (opValue === true) {
                            conditions.push(`${column} IS NOT NULL`);
                        }
                        else {
                            conditions.push(`${column} IS NULL`);
                        }
                        break;
                    case "$regex":
                        const regexValue = opValue instanceof RegExp ? opValue.source : opValue;
                        conditions.push(`${column} ~ ${placeholder}`);
                        break;
                    default:
                        // Unknown operator, treat as equality
                        conditions.push(`${column} = ${placeholder}`);
                }
            }
        }
        else {
            // Simple equality
            const placeholder = `$${paramIndex++}`;
            params.push(value);
            conditions.push(`${column} = ${placeholder}`);
        }
    }
    const sql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { sql, params, paramIndex };
}
/**
 * Builds ORDER BY clause from sort options.
 */
export function buildOrderByClause(sort, columnMap) {
    const parts = [];
    for (const [field, direction] of Object.entries(sort)) {
        const column = columnMap.get(field) || toSnakeCase(field);
        parts.push(`${column} ${direction === 1 ? "ASC" : "DESC"}`);
    }
    return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : "";
}
/**
 * Builds SELECT clause from select options.
 */
export function buildSelectClause(select, columnMap) {
    if (!select || select.length === 0) {
        return "*";
    }
    const columns = select.map((field) => columnMap.get(field) || toSnakeCase(field));
    return columns.join(", ");
}
/**
 * Executes a find query.
 */
export async function findQuery(state, filter = {}, options = {}) {
    const { select, sort, limit, skip } = options;
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const orderBy = buildOrderByClause(sort || {}, columnMap);
    const selectClause = buildSelectClause(select || [], columnMap);
    let sql = `SELECT ${selectClause} FROM ${state.tableName} ${where.sql}`;
    if (orderBy)
        sql += ` ${orderBy}`;
    if (limit)
        sql += ` LIMIT $${where.paramIndex++}`;
    if (skip)
        sql += ` OFFSET $${where.paramIndex++}`;
    const params = [...where.params];
    if (limit)
        params.push(limit);
    if (skip)
        params.push(skip);
    const result = await state.pool.query(sql, params);
    return result.rows.map((row) => rowToDocument(state.schema, row));
}
/**
 * Executes a findOne query.
 */
export async function findOneQuery(state, filter, options = {}) {
    const results = await findQuery(state, filter, { ...options, limit: 1 });
    return results[0] || null;
}
/**
 * Executes a findById query.
 */
export async function findByIdQuery(state, id) {
    const pk = state.primaryKey;
    const column = state.columnMap.get(pk) || "id";
    const sql = `SELECT * FROM ${state.tableName} WHERE ${column} = $1`;
    const result = await state.pool.query(sql, [id]);
    if (result.rows.length === 0)
        return null;
    return rowToDocument(state.schema, result.rows[0]);
}
/**
 * Executes an exists query.
 */
export async function existsQuery(state, filter) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const sql = `SELECT 1 FROM ${state.tableName} ${where.sql} LIMIT 1`;
    const result = await state.pool.query(sql, where.params);
    return result.rows.length > 0;
}
/**
 * Executes a countDocuments query.
 */
export async function countDocumentsQuery(state, filter = {}) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const sql = `SELECT COUNT(*) FROM ${state.tableName} ${where.sql}`;
    const result = await state.pool.query(sql, where.params);
    return parseInt(result.rows[0].count, 10);
}
/**
 * Executes a distinct query.
 */
export async function distinctQuery(state, field, filter = {}) {
    const columnMap = state.columnMap;
    const column = columnMap.get(field) || toSnakeCase(field);
    const where = buildWhereClause(filter, columnMap);
    const sql = `SELECT DISTINCT ${column} FROM ${state.tableName} ${where.sql}`;
    const result = await state.pool.query(sql, where.params);
    return result.rows.map((row) => row[column]);
}
/**
 * Executes a create (insert) query.
 */
export async function createQuery(state, doc) {
    const schema = state.schema;
    const row = documentToRow(schema, doc);
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `
    INSERT INTO ${state.tableName} (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING *
  `;
    const result = await state.pool.query(sql, values);
    return rowToDocument(schema, result.rows[0]);
}
/**
 * Executes an insertMany query.
 */
export async function insertManyQuery(state, docs) {
    if (docs.length === 0)
        return [];
    const schema = state.schema;
    const rows = docs.map((doc) => documentToRow(schema, doc));
    const columns = Object.keys(rows[0]);
    const allValues = [];
    const valuePlaceholders = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const placeholders = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ");
        valuePlaceholders.push(`(${placeholders})`);
        allValues.push(...columns.map((col) => row[col]));
    }
    const sql = `
    INSERT INTO ${state.tableName} (${columns.join(", ")})
    VALUES ${valuePlaceholders.join(", ")}
    RETURNING *
  `;
    const result = await state.pool.query(sql, allValues);
    return result.rows.map((row) => rowToDocument(schema, row));
}
/**
 * Builds SET clause for update operations.
 */
function buildUpdateSetClause(update, schema, columnMap, startParamIndex, timestampsEnabled) {
    const setParts = [];
    const params = [];
    let paramIndex = startParamIndex;
    // $set
    if (update.$set) {
        for (const [field, value] of Object.entries(update.$set)) {
            const column = columnMap.get(field) || toSnakeCase(field);
            const def = schema[field];
            let processedValue = value;
            if (def?.type === "date" && value instanceof Date) {
                processedValue = value.toISOString();
            }
            else if (def?.type === "json") {
                processedValue = JSON.stringify(value);
            }
            setParts.push(`${column} = $${paramIndex++}`);
            params.push(processedValue);
        }
    }
    // $inc
    if (update.$inc) {
        for (const [field, value] of Object.entries(update.$inc)) {
            const column = columnMap.get(field) || toSnakeCase(field);
            setParts.push(`${column} = ${column} + $${paramIndex++}`);
            params.push(value);
        }
    }
    // $unset
    if (update.$unset) {
        for (const field of Object.keys(update.$unset)) {
            const column = columnMap.get(field) || toSnakeCase(field);
            setParts.push(`${column} = NULL`);
        }
    }
    // $push (array append) - PostgreSQL specific
    if (update.$push) {
        for (const [field, value] of Object.entries(update.$push)) {
            const column = columnMap.get(field) || toSnakeCase(field);
            setParts.push(`${column} = COALESCE(${column}, '[]') || $${paramIndex++}::jsonb`);
            params.push(JSON.stringify([value]));
        }
    }
    // $pull (array remove) - PostgreSQL specific
    if (update.$pull) {
        for (const [field, value] of Object.entries(update.$pull)) {
            const column = columnMap.get(field) || toSnakeCase(field);
            setParts.push(`${column} = ${column} - $${paramIndex++}::jsonb`);
            params.push(JSON.stringify([value]));
        }
    }
    // Always update updated_at if timestamps enabled
    if (timestampsEnabled && !setParts.some((p) => p.startsWith("updated_at"))) {
        setParts.push("updated_at = NOW()");
    }
    const sql = setParts.length > 0 ? `SET ${setParts.join(", ")}` : "";
    return { sql, params, paramIndex };
}
/**
 * Executes an updateOne query.
 */
export async function updateOneQuery(state, filter, update) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const setClause = buildUpdateSetClause(update, state.schema, columnMap, where.paramIndex, state.options.timestamps);
    if (!setClause.sql) {
        return { matched: 0, modified: 0 };
    }
    const sql = `UPDATE ${state.tableName} ${setClause.sql} ${where.sql}`;
    const params = [...setClause.params, ...where.params];
    const result = await state.pool.query(sql, params);
    return {
        matched: result.rowCount ?? 0,
        modified: result.rowCount ?? 0,
    };
}
/**
 * Executes an updateMany query.
 */
export async function updateManyQuery(state, filter, update) {
    // Same as updateOne but without LIMIT 1
    return updateOneQuery(state, filter, update);
}
/**
 * Executes a findOneAndUpdate query.
 */
export async function findOneAndUpdateQuery(state, filter, update, options = {}) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const setClause = buildUpdateSetClause(update, state.schema, columnMap, where.paramIndex, state.options.timestamps);
    if (!setClause.sql) {
        return findOneQuery(state, filter);
    }
    const returning = options.new ? "RETURNING *" : "";
    const sql = `UPDATE ${state.tableName} ${setClause.sql} ${where.sql} ${returning}`;
    const params = [...setClause.params, ...where.params];
    const result = await state.pool.query(sql, params);
    if (result.rows.length === 0)
        return null;
    return rowToDocument(state.schema, result.rows[0]);
}
/**
 * Executes a findByIdAndUpdate query.
 */
export async function findByIdAndUpdateQuery(state, id, update, options = {}) {
    const pk = state.primaryKey;
    const column = state.columnMap.get(pk) || "id";
    const filter = { [pk]: { $eq: id } };
    return findOneAndUpdateQuery(state, filter, update, options);
}
/**
 * Executes a deleteOne query.
 */
export async function deleteOneQuery(state, filter) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const sql = `DELETE FROM ${state.tableName} ${where.sql}`;
    const result = await state.pool.query(sql, where.params);
    return { deleted: result.rowCount ?? 0 };
}
/**
 * Executes a deleteMany query.
 */
export async function deleteManyQuery(state, filter) {
    return deleteOneQuery(state, filter);
}
/**
 * Executes a findOneAndDelete query.
 */
export async function findOneAndDeleteQuery(state, filter) {
    const columnMap = state.columnMap;
    const where = buildWhereClause(filter, columnMap);
    const sql = `DELETE FROM ${state.tableName} ${where.sql} RETURNING *`;
    const result = await state.pool.query(sql, where.params);
    if (result.rows.length === 0)
        return null;
    return rowToDocument(state.schema, result.rows[0]);
}
/**
 * Executes a findByIdAndDelete query.
 */
export async function findByIdAndDeleteQuery(state, id) {
    const pk = state.primaryKey;
    const column = state.columnMap.get(pk) || "id";
    const filter = { [pk]: { $eq: id } };
    return findOneAndDeleteQuery(state, filter);
}
// Import schema helpers
import { documentToRow, rowToDocument } from "./schema.js";
//# sourceMappingURL=queries.js.map