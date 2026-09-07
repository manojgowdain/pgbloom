/**
 * Schema validation and column mapping for PGBloom models.
 */
import { PGBloomValidationError } from "../utils/validation.js";
/**
 * Maps JavaScript types to PostgreSQL types.
 */
const TYPE_MAP = {
    string: "TEXT",
    number: "NUMERIC",
    boolean: "BOOLEAN",
    date: "TIMESTAMPTZ",
    json: "JSONB",
    buffer: "BYTEA",
};
/**
 * Validates a document against the schema.
 * Throws PGBloomValidationError if validation fails.
 */
export function validateDocument(schema, doc, isUpdate = false) {
    for (const [field, def] of Object.entries(schema)) {
        const value = doc[field];
        const isRequired = def.required ?? false;
        // Check required fields (only on create, not update)
        if (!isUpdate && isRequired && (value === undefined || value === null)) {
            throw new PGBloomValidationError(`Field "${field}" is required`);
        }
        // Skip validation for undefined/null on optional fields
        if (value === undefined || value === null) {
            continue;
        }
        // Type validation
        const expectedType = def.type;
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (expectedType === "number" && actualType !== "number") {
            throw new PGBloomValidationError(`Field "${field}" must be a number`);
        }
        if (expectedType === "string" && actualType !== "string") {
            throw new PGBloomValidationError(`Field "${field}" must be a string`);
        }
        if (expectedType === "boolean" && actualType !== "boolean") {
            throw new PGBloomValidationError(`Field "${field}" must be a boolean`);
        }
        if (expectedType === "date" && !(value instanceof Date) && actualType !== "string") {
            throw new PGBloomValidationError(`Field "${field}" must be a Date or ISO string`);
        }
        // json and buffer accept any type (will be serialized)
    }
}
/**
 * Applies default values from schema to document.
 */
export function applyDefaults(schema, doc) {
    const result = { ...doc };
    for (const [field, def] of Object.entries(schema)) {
        if (result[field] === undefined && def.default !== undefined) {
            result[field] = typeof def.default === "function" ? def.default() : def.default;
        }
    }
    return result;
}
/**
 * Converts a document to database row format.
 */
export function documentToRow(schema, doc) {
    const row = {};
    for (const [field, def] of Object.entries(schema)) {
        const value = doc[field];
        if (value === undefined)
            continue;
        const columnName = toSnakeCase(field);
        if (def.type === "date" && value instanceof Date) {
            row[columnName] = value.toISOString();
        }
        else if (def.type === "json") {
            row[columnName] = JSON.stringify(value);
        }
        else if (def.type === "buffer" && Buffer.isBuffer(value)) {
            row[columnName] = value;
        }
        else {
            row[columnName] = value;
        }
    }
    return row;
}
/**
 * Converts a database row to document format.
 */
export function rowToDocument(schema, row) {
    const doc = {};
    for (const [field, def] of Object.entries(schema)) {
        const columnName = toSnakeCase(field);
        const value = row[columnName];
        if (value === undefined)
            continue;
        if (def.type === "date" && value) {
            doc[field] = new Date(value);
        }
        else if (def.type === "json" && typeof value === "string") {
            try {
                doc[field] = JSON.parse(value);
            }
            catch {
                doc[field] = value;
            }
        }
        else if (def.type === "buffer" && value instanceof Uint8Array) {
            doc[field] = Buffer.from(value);
        }
        else {
            doc[field] = value;
        }
    }
    return doc;
}
/**
 * Builds column map for schema (field name -> column name).
 */
export function buildColumnMap(schema) {
    const map = new Map();
    for (const field of Object.keys(schema)) {
        map.set(field, toSnakeCase(field));
    }
    // Standard fields
    map.set("id", "id");
    map.set("createdAt", "created_at");
    map.set("updatedAt", "updated_at");
    return map;
}
/**
 * Gets the primary key field name (default: id).
 */
export function getPrimaryKey(schema) {
    // Check for explicitly marked unique field that could be primary
    for (const [field, def] of Object.entries(schema)) {
        if (def.unique && def.required) {
            return field;
        }
    }
    return "id";
}
/**
 * Converts camelCase to snake_case.
 */
export function toSnakeCase(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
/**
 * Converts snake_case to camelCase.
 */
export function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
/**
 * Generates CREATE TABLE SQL for a model.
 */
export function generateCreateTableSQL(tableName, schema, primaryKey, timestamps) {
    const columns = [];
    const constraints = [];
    const indexes = [];
    // Primary key
    if (primaryKey !== "id") {
        const pkDef = schema[primaryKey];
        if (pkDef) {
            columns.push(`${toSnakeCase(primaryKey)} ${TYPE_MAP[pkDef.type] || "TEXT"} PRIMARY KEY`);
        }
        else {
            columns.push("id BIGSERIAL PRIMARY KEY");
        }
    }
    else {
        columns.push("id BIGSERIAL PRIMARY KEY");
    }
    // Schema fields
    for (const [field, def] of Object.entries(schema)) {
        if (field === primaryKey)
            continue;
        const columnName = toSnakeCase(field);
        const pgType = TYPE_MAP[def.type] || "TEXT";
        let colDef = `${columnName} ${pgType}`;
        if (def.required) {
            colDef += " NOT NULL";
        }
        if (def.default !== undefined && typeof def.default !== "function") {
            if (def.type === "string") {
                colDef += ` DEFAULT '${def.default}'`;
            }
            else if (def.type === "boolean") {
                colDef += ` DEFAULT ${def.default}`;
            }
            else if (def.type === "number") {
                colDef += ` DEFAULT ${def.default}`;
            }
        }
        columns.push(colDef);
        // Unique constraint
        if (def.unique) {
            constraints.push(`CONSTRAINT ${tableName}_${columnName}_unique UNIQUE (${columnName})`);
        }
        // Index
        if (def.index) {
            indexes.push(`CREATE INDEX IF NOT EXISTS ${tableName}_${columnName}_idx ON ${tableName} (${columnName});`);
        }
    }
    // Timestamps
    if (timestamps) {
        columns.push("created_at TIMESTAMPTZ DEFAULT NOW()");
        columns.push("updated_at TIMESTAMPTZ DEFAULT NOW()");
    }
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.join(",\n  ")}\n  ${constraints.length > 0 ? ",\n  " + constraints.join(",\n  ") : ""}\n);`;
    return sql + (indexes.length > 0 ? "\n" + indexes.join("\n") : "");
}
/**
 * Generates ALTER TABLE SQL for missing columns.
 */
export function generateAlterTableSQL(tableName, schema, existingColumns, primaryKey, timestamps) {
    const statements = [];
    for (const [field, def] of Object.entries(schema)) {
        const columnName = toSnakeCase(field);
        if (field === primaryKey)
            continue;
        if (existingColumns.has(columnName))
            continue;
        const pgType = TYPE_MAP[def.type] || "TEXT";
        let colDef = `${columnName} ${pgType}`;
        if (def.required) {
            colDef += " NOT NULL";
        }
        if (def.default !== undefined && typeof def.default !== "function") {
            if (def.type === "string") {
                colDef += ` DEFAULT '${def.default}'`;
            }
            else if (def.type === "boolean") {
                colDef += ` DEFAULT ${def.default}`;
            }
            else if (def.type === "number") {
                colDef += ` DEFAULT ${def.default}`;
            }
        }
        statements.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colDef};`);
        // Add unique constraint if needed
        if (def.unique) {
            statements.push(`ALTER TABLE ${tableName} ADD CONSTRAINT ${tableName}_${columnName}_unique UNIQUE (${columnName});`);
        }
        // Add index if needed
        if (def.index) {
            statements.push(`CREATE INDEX IF NOT EXISTS ${tableName}_${columnName}_idx ON ${tableName} (${columnName});`);
        }
    }
    // Check timestamps
    if (timestamps) {
        if (!existingColumns.has("created_at")) {
            statements.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`);
        }
        if (!existingColumns.has("updated_at")) {
            statements.push(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);
        }
    }
    return statements;
}
//# sourceMappingURL=schema.js.map