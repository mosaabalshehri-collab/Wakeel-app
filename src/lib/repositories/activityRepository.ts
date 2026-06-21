import { db } from "../db";
import type { ActivityLogEntry } from "@/types";

interface LogRow {
  id: number;
  user_id: number;
  poa_id: number | null;
  action: string;
  details: string | null;
  created_at: string;
}

function mapRow(row: LogRow): ActivityLogEntry {
  return {
    id: row.id,
    userId: row.user_id,
    poaId: row.poa_id,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  };
}

export type ActivityAction = "create" | "update" | "delete";

export function log(
  userId: number,
  action: ActivityAction,
  poaId: number | null,
  details?: string
): void {
  const stmt = db.prepare(
    `INSERT INTO activity_log (user_id, poa_id, action, details) VALUES (?, ?, ?, ?)`
  );
  stmt.run(userId, poaId, action, details ?? null);
}

export function findRecentByUser(
  userId: number,
  limit = 20
): ActivityLogEntry[] {
  const stmt = db.prepare(
    `SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  );
  const rows = stmt.all(userId, limit) as unknown as LogRow[];
  return rows.map(mapRow);
}
