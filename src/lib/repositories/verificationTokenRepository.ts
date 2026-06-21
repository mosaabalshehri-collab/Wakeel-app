import crypto from "node:crypto";
import { db } from "../db";

export type TokenPurpose = "email_verify" | "password_reset";

interface TokenRow {
  id: number;
  user_id: number;
  token: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface VerificationToken {
  id: number;
  userId: number;
  token: string;
  purpose: TokenPurpose;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

function mapRow(row: TokenRow): VerificationToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    purpose: row.purpose as TokenPurpose,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

const TOKEN_TTL_HOURS: Record<TokenPurpose, number> = {
  email_verify: 24,
  password_reset: 1,
};

/** ينشئ توكن جديد عشوائي (32 بايت = 64 حرف hex) لغرض معيّن */
export function create(userId: number, purpose: TokenPurpose): VerificationToken {
  const token = crypto.randomBytes(32).toString("hex");
  const ttlHours = TOKEN_TTL_HOURS[purpose];
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(
    `INSERT INTO verification_tokens (user_id, token, purpose, expires_at) VALUES (?, ?, ?, ?)`
  );
  const result = stmt.run(userId, token, purpose, expiresAt);
  const newId = Number(result.lastInsertRowid);

  const created = findById(newId);
  if (!created) throw new Error("فشل إنشاء رمز التحقق");
  return created;
}

function findById(id: number): VerificationToken | null {
  const stmt = db.prepare(`SELECT * FROM verification_tokens WHERE id = ?`);
  const row = stmt.get(id) as unknown as TokenRow | undefined;
  return row ? mapRow(row) : null;
}

export function findValidByToken(
  token: string,
  purpose: TokenPurpose
): VerificationToken | null {
  const stmt = db.prepare(
    `SELECT * FROM verification_tokens
     WHERE token = ? AND purpose = ? AND used_at IS NULL AND expires_at > datetime('now')`
  );
  const row = stmt.get(token, purpose) as unknown as TokenRow | undefined;
  return row ? mapRow(row) : null;
}

export function markUsed(id: number): void {
  const stmt = db.prepare(
    `UPDATE verification_tokens SET used_at = datetime('now') WHERE id = ?`
  );
  stmt.run(id);
}

/** يبطل كل التوكنات السابقة غير المستخدمة لنفس المستخدم والغرض، قبل إصدار توكن جديد */
export function invalidatePrevious(userId: number, purpose: TokenPurpose): void {
  const stmt = db.prepare(
    `UPDATE verification_tokens SET used_at = datetime('now')
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL`
  );
  stmt.run(userId, purpose);
}
