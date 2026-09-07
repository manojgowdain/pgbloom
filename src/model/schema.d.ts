/**
 * Schema validation and column mapping for PGBloom models.
 */
import type { ModelSchema } from "./types.js";
/**
 * Validates a document against the schema.
 * Throws PGBloomValidationError if validation fails.
 */
export declare function validateDocument(schema: ModelSchema, doc: Record<string, any>, isUpdate?: boolean): void;
/**
 * Applies default values from schema to document.
 */
export declare function applyDefaults(schema: ModelSchema, doc: Record<string, any>): Record<string, any>;
/**
 * Converts a document to database row format.
 */
export declare function documentToRow(schema: ModelSchema, doc: Record<string, any>): Record<string, any>;
/**
 * Converts a database row to document format.
 */
export declare function rowToDocument(schema: ModelSchema, row: Record<string, any>): Record<string, any>;
/**
 * Builds column map for schema (field name -> column name).
 */
export declare function buildColumnMap(schema: ModelSchema): Map<string, string>;
/**
 * Gets the primary key field name (default: id).
 */
export declare function getPrimaryKey(schema: ModelSchema): string;
/**
 * Converts camelCase to snake_case.
 */
export declare function toSnakeCase(str: string): string;
/**
 * Converts snake_case to camelCase.
 */
export declare function toCamelCase(str: string): string;
/**
 * Generates CREATE TABLE SQL for a model.
 */
export declare function generateCreateTableSQL(tableName: string, schema: ModelSchema, primaryKey: string, timestamps: boolean): string;
/**
 * Generates ALTER TABLE SQL for missing columns.
 */
export declare function generateAlterTableSQL(tableName: string, schema: ModelSchema, existingColumns: Set<string>, primaryKey: string, timestamps: boolean): string[];
//# sourceMappingURL=schema.d.ts.map