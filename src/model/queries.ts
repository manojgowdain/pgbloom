/**
 * SQL query builders for the PGBloom model CRUD operations.
 */

import { Pool } from "pg";
import type { ModelState, QueryFilter, FindOptions, UpdateOps, Document, ModelSchema } from "./types.js";
import { toSnakeCase, buildColumnMap, getPrimaryKey } from "./schema.js";

/**
 * Builds WHERE clause from query filter with parameterized values.
 * Returns { sql: string, params: any[], paramIndex: number }
 */
export function buildWhereClause(
  filter: QueryFilter,
  columnMap: Map<string, string>,
  startParamIndex = 1
): { sql: string; params: any[]; paramIndex: number } {
  const conditions: string[] = [];
  const params: any[] = [];
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
            } else {
              conditions.push("FALSE"); // Empty array = no matches
            }
            break;
          case "$nin":
            if (Array.isArray(opValue) && opValue.length > 0) {
              const placeholders = opValue.map(() => `$${paramIndex++}`).join(", ");
              params.push(...opValue);
              conditions.push(`${column} NOT IN (${placeholders})`);
            } else {
              conditions.push("TRUE"); // Empty array = all matches
            }
            break;
          case "$exists":
            if (opValue === true) {
              conditions.push(`${column} IS NOT NULL`);
            } else {
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
    } else {
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
export function buildOrderByClause(sort: Record<string, 1 | -1>, columnMap: Map<string, string>): string {
  const parts: string[] = [];
  for (const [field, direction] of Object.entries(sort)) {
    const column = columnMap.get(field) || toSnakeCase(field);
    parts.push(`${column} ${direction === 1 ? "ASC" : "DESC"}`);
  }
  return parts.length > 0 ? `ORDER BY ${parts.join(", ")}` : "";
}

/**
 * Builds SELECT clause from select options.
 */
export function buildSelectClause(select: string[], columnMap: Map<string, string>): string {
  if (!select || select.length === 0) {
    return "*";
  }
  const columns = select.map((field) => columnMap.get(field) || toSnakeCase(field));
  return columns.join(", ");
}

/**
 * Executes a find query.
 */
export async function findQuery<T>(
  state: ModelState,
  filter: QueryFilter = {},
  options: FindOptions = {}
): Promise<T[]> {
  const { select, sort, limit, skip } = options;
  const columnMap = state.columnMap;

  const where = buildWhereClause(filter, columnMap);
  const orderBy = buildOrderByClause(sort || {}, columnMap);
  const selectClause = buildSelectClause(select || [], columnMap);

  let sql = `SELECT ${selectClause} FROM ${state.tableName} ${where.sql}`;
  if (orderBy) sql += ` ${orderBy}`;
  if (limit) sql += ` LIMIT $${where.paramIndex++}`;
  if (skip) sql += ` OFFSET $${where.paramIndex++}`;

  const params = [...where.params];
  if (limit) params.push(limit);
  if (skip) params.push(skip);

  const result = await state.pool.query(sql, params);
  return result.rows.map((row) => rowToDocument(state.schema, row) as T);
}

/**
 * Executes a findOne query.
 */
export async function findOneQuery<T>(
  state: ModelState,
  filter: QueryFilter,
  options: FindOptions = {}
): Promise<T | null> {
  const results = await findQuery<T>(state, filter, { ...options, limit: 1 });
  return results[0] || null;
}

/**
 * Executes a findById query.
 */
export async function findByIdQuery<T>(
  state: ModelState,
  id: string | number
): Promise<T | null> {
  const pk = state.primaryKey;
  const column = state.columnMap.get(pk) || "id";
  const sql = `SELECT * FROM ${state.tableName} WHERE ${column} = $1`;
  const result = await state.pool.query(sql, [id]);
  if (result.rows.length === 0) return null;
  return rowToDocument(state.schema, result.rows[0]) as T;
}

/**
 * Executes an exists query.
 */
export async function existsQuery(state: ModelState, filter: QueryFilter): Promise<boolean> {
  const columnMap = state.columnMap;
  const where = buildWhereClause(filter, columnMap);
  const sql = `SELECT 1 FROM ${state.tableName} ${where.sql} LIMIT 1`;
  const result = await state.pool.query(sql, where.params);
  return result.rows.length > 0;
}

/**
 * Executes a countDocuments query.
 */
export async function countDocumentsQuery(state: ModelState, filter: QueryFilter = {}): Promise<number> {
  const columnMap = state.columnMap;
  const where = buildWhereClause(filter, columnMap);
  const sql = `SELECT COUNT(*) FROM ${state.tableName} ${where.sql}`;
  const result = await state.pool.query(sql, where.params);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Executes a distinct query.
 */
export async function distinctQuery(state: ModelState, field: string, filter: QueryFilter = {}): Promise<any[]> {
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
export async function createQuery<T extends Document>(
  state: ModelState,
  doc: Partial<T>
): Promise<T> {
  const schema = state.schema;
  const row = documentToRow(schema, doc as Record<string, any>);
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

  const sql = `
    INSERT INTO ${state.tableName} (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result = await state.pool.query(sql, values);
  return rowToDocument(schema, result.rows[0]) as T;
}

/**
 * Executes an insertMany query.
 */
export async function insertManyQuery<T extends Document>(
  state: ModelState,
  docs: Partial<T>[]
): Promise<T[]> {
  if (docs.length === 0) return [];

  const schema = state.schema;
  const rows = docs.map((doc) => documentToRow(schema, doc as Record<string, any>));
  const columns = Object.keys(rows[0]);
  const allValues: any[] = [];
  const valuePlaceholders: string[] = [];

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
  return result.rows.map((row) => rowToDocument(schema, row) as T);
}

/**
 * Builds SET clause for update operations.
 */
function buildUpdateSetClause(
  update: UpdateOps,
  schema: ModelSchema,
  columnMap: Map<string, string>,
  startParamIndex: number,
  timestampsEnabled: boolean
): { sql: string; params: any[]; paramIndex: number } {
  const setParts: string[] = [];
  const params: any[] = [];
  let paramIndex = startParamIndex;

  // $set
  if (update.$set) {
    for (const [field, value] of Object.entries(update.$set)) {
      const column = columnMap.get(field) || toSnakeCase(field);
      const def = schema[field];
      let processedValue = value;

      if (def?.type === "date" && value instanceof Date) {
        processedValue = value.toISOString();
      } else if (def?.type === "json") {
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
export async function updateOneQuery(
  state: ModelState,
  filter: QueryFilter,
  update: UpdateOps
): Promise<{ matched: number; modified: number }> {
  const columnMap = state.columnMap;
  const setClause = buildUpdateSetClause(update, state.schema, columnMap, 1, state.options.timestamps);
  const where = buildWhereClause(filter, columnMap, setClause.paramIndex);

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
export async function updateManyQuery(
  state: ModelState,
  filter: QueryFilter,
  update: UpdateOps
): Promise<{ matched: number; modified: number }> {
  // Same as updateOne but without LIMIT 1
  return updateOneQuery(state, filter, update);
}

/**
 * Executes a findOneAndUpdate query.
 */
export async function findOneAndUpdateQuery<T>(
  state: ModelState,
  filter: QueryFilter,
  update: UpdateOps,
  options: { new?: boolean } = {}
): Promise<T | null> {
  const columnMap = state.columnMap;
  const setClause = buildUpdateSetClause(update, state.schema, columnMap, 1, state.options.timestamps);
  const where = buildWhereClause(filter, columnMap, setClause.paramIndex);

  if (!setClause.sql) {
    return findOneQuery(state, filter);
  }

  const returning = options.new ? "RETURNING *" : "";
  const sql = `UPDATE ${state.tableName} ${setClause.sql} ${where.sql} ${returning}`;
  const params = [...setClause.params, ...where.params];

  const result = await state.pool.query(sql, params);
  if (result.rows.length === 0) return null;
  return rowToDocument(state.schema, result.rows[0]) as T;
}

/**
 * Executes a findByIdAndUpdate query.
 */
export async function findByIdAndUpdateQuery<T>(
  state: ModelState,
  id: string | number,
  update: UpdateOps,
  options: { new?: boolean } = {}
): Promise<T | null> {
  const pk = state.primaryKey;
  const column = state.columnMap.get(pk) || "id";
  const filter: QueryFilter = { [pk]: { $eq: id } };
  return findOneAndUpdateQuery(state, filter, update, options);
}

/**
 * Executes a deleteOne query.
 */
export async function deleteOneQuery(state: ModelState, filter: QueryFilter): Promise<{ deleted: number }> {
  const columnMap = state.columnMap;
  const where = buildWhereClause(filter, columnMap);
  const sql = `DELETE FROM ${state.tableName} ${where.sql}`;
  const result = await state.pool.query(sql, where.params);
  return { deleted: result.rowCount ?? 0 };
}

/**
 * Executes a deleteMany query.
 */
export async function deleteManyQuery(state: ModelState, filter: QueryFilter): Promise<{ deleted: number }> {
  return deleteOneQuery(state, filter);
}

/**
 * Executes a findOneAndDelete query.
 */
export async function findOneAndDeleteQuery<T>(
  state: ModelState,
  filter: QueryFilter
): Promise<T | null> {
  const columnMap = state.columnMap;
  const where = buildWhereClause(filter, columnMap);
  const sql = `DELETE FROM ${state.tableName} ${where.sql} RETURNING *`;
  const result = await state.pool.query(sql, where.params);
  if (result.rows.length === 0) return null;
  return rowToDocument(state.schema, result.rows[0]) as T;
}

/**
 * Executes a findByIdAndDelete query.
 */
export async function findByIdAndDeleteQuery<T>(
  state: ModelState,
  id: string | number
): Promise<T | null> {
  const pk = state.primaryKey;
  const column = state.columnMap.get(pk) || "id";
  const filter: QueryFilter = { [pk]: { $eq: id } };
  return findOneAndDeleteQuery(state, filter);
}

// Import schema helpers
import { documentToRow, rowToDocument } from "./schema.js";