/**
 * SQL query builders for the PGBloom model CRUD operations.
 */
import type { ModelState, QueryFilter, FindOptions, UpdateOps, Document } from "./types.js";
/**
 * Builds WHERE clause from query filter with parameterized values.
 * Returns { sql: string, params: any[], paramIndex: number }
 */
export declare function buildWhereClause(filter: QueryFilter, columnMap: Map<string, string>, startParamIndex?: number): {
    sql: string;
    params: any[];
    paramIndex: number;
};
/**
 * Builds ORDER BY clause from sort options.
 */
export declare function buildOrderByClause(sort: Record<string, 1 | -1>, columnMap: Map<string, string>): string;
/**
 * Builds SELECT clause from select options.
 */
export declare function buildSelectClause(select: string[], columnMap: Map<string, string>): string;
/**
 * Executes a find query.
 */
export declare function findQuery<T>(state: ModelState, filter?: QueryFilter, options?: FindOptions): Promise<T[]>;
/**
 * Executes a findOne query.
 */
export declare function findOneQuery<T>(state: ModelState, filter: QueryFilter, options?: FindOptions): Promise<T | null>;
/**
 * Executes a findById query.
 */
export declare function findByIdQuery<T>(state: ModelState, id: string | number): Promise<T | null>;
/**
 * Executes an exists query.
 */
export declare function existsQuery(state: ModelState, filter: QueryFilter): Promise<boolean>;
/**
 * Executes a countDocuments query.
 */
export declare function countDocumentsQuery(state: ModelState, filter?: QueryFilter): Promise<number>;
/**
 * Executes a distinct query.
 */
export declare function distinctQuery(state: ModelState, field: string, filter?: QueryFilter): Promise<any[]>;
/**
 * Executes a create (insert) query.
 */
export declare function createQuery<T extends Document>(state: ModelState, doc: Partial<T>): Promise<T>;
/**
 * Executes an insertMany query.
 */
export declare function insertManyQuery<T extends Document>(state: ModelState, docs: Partial<T>[]): Promise<T[]>;
/**
 * Executes an updateOne query.
 */
export declare function updateOneQuery(state: ModelState, filter: QueryFilter, update: UpdateOps): Promise<{
    matched: number;
    modified: number;
}>;
/**
 * Executes an updateMany query.
 */
export declare function updateManyQuery(state: ModelState, filter: QueryFilter, update: UpdateOps): Promise<{
    matched: number;
    modified: number;
}>;
/**
 * Executes a findOneAndUpdate query.
 */
export declare function findOneAndUpdateQuery<T>(state: ModelState, filter: QueryFilter, update: UpdateOps, options?: {
    new?: boolean;
}): Promise<T | null>;
/**
 * Executes a findByIdAndUpdate query.
 */
export declare function findByIdAndUpdateQuery<T>(state: ModelState, id: string | number, update: UpdateOps, options?: {
    new?: boolean;
}): Promise<T | null>;
/**
 * Executes a deleteOne query.
 */
export declare function deleteOneQuery(state: ModelState, filter: QueryFilter): Promise<{
    deleted: number;
}>;
/**
 * Executes a deleteMany query.
 */
export declare function deleteManyQuery(state: ModelState, filter: QueryFilter): Promise<{
    deleted: number;
}>;
/**
 * Executes a findOneAndDelete query.
 */
export declare function findOneAndDeleteQuery<T>(state: ModelState, filter: QueryFilter): Promise<T | null>;
/**
 * Executes a findByIdAndDelete query.
 */
export declare function findByIdAndDeleteQuery<T>(state: ModelState, id: string | number): Promise<T | null>;
//# sourceMappingURL=queries.d.ts.map