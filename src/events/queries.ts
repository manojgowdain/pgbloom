/**
 * PostgreSQL queries for events operations.
 */

import { Pool } from "pg";
import { serialize } from "../utils/serialize.js";
import { EventHistoryOptions } from "./types.js";

/**
 * Inserts an event into the pgbloom_events table and sends a NOTIFY.
 */
export async function insertEvent(
  pool: Pool,
  eventId: string,
  type: string,
  payload: unknown,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const serializedPayload = serialize(payload);
  const result = await pool.query(
    `INSERT INTO pgbloom_events (event_id, type, payload, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [eventId, type, serializedPayload, JSON.stringify(metadata)]
  );

  const row = result.rows[0];
  const notifyPayload = JSON.stringify({
    eventId,
    type,
    payload,
    createdAt: row.created_at,
    metadata,
  });

  // PostgreSQL NOTIFY does not support parameterized payloads.
  // We must inline the payload as a string literal.
  // JSON uses double quotes, so we escape single quotes for SQL string literal.
  const escapedPayload = notifyPayload.replace(/'/g, "''");
  await pool.query(`NOTIFY pgbloom_events, '${escapedPayload}'`);
}

/**
 * Gets event history with filtering and pagination.
 */
export async function getEventHistory(
  pool: Pool,
  options: EventHistoryOptions = {}
): Promise<{ events: any[]; nextCursor?: string }> {
  const { type, from, to, limit = 100, cursor } = options;

  // Build WHERE clause dynamically
  const conditions = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(type);
  }

  if (from) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(from);
  }

  if (to) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(to);
  }

  // For pagination: if cursor is provided, get events after that event_id
  if (cursor) {
    conditions.push(`event_id > $${paramIndex++}`);
    values.push(cursor);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT id, event_id, type, payload, created_at, metadata
    FROM pgbloom_events
    ${whereClause}
    ORDER BY created_at ASC, id ASC
    LIMIT $${paramIndex}
  `;
  values.push(limit + 1); // Get one extra to check for next page

  const result = await pool.query(query, values);
  const rows = result.rows;

  // Check if there are more results
  const hasMore = rows.length > limit;
  const events = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? events[events.length - 1].event_id : undefined;

  // Parse the payload JSON back to objects
  const parsedEvents = events.map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    createdAt: new Date(row.created_at),
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
  }));

  return {
    events: parsedEvents,
    ...(nextCursor ? { nextCursor } : {}),
  };
}

/**
 * Gets a single event by its event_id.
 */
export async function getEventById(
  pool: Pool,
  eventId: string
): Promise<any | null> {
  const result = await pool.query(
    `SELECT id, event_id, type, payload, created_at, metadata
     FROM pgbloom_events
     WHERE event_id = $1`,
    [eventId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload,
    createdAt: new Date(row.created_at),
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
  };
}