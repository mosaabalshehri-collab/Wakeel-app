import { db } from "../db";
import type { User } from "@/types";

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  email_verified: number;
  created_at: string;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
  };
}

export function findByEmail(email: string): User | null {
  const stmt = db.prepare(`SELECT * FROM users WHERE email = ?`);
  const row = stmt.get(email.toLowerCase().trim()) as unknown as
    | UserRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function findById(id: number): User | null {
  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const row = stmt.get(id) as unknown as UserRow | undefined;
  return row ? mapRow(row) : null;
}

export function create(
  name: string,
  email: string,
  passwordHash: string
): User {
  const stmt = db.prepare(
    `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`
  );
  const result = stmt.run(name.trim(), email.toLowerCase().trim(), passwordHash);
  const newId = Number(result.lastInsertRowid);
  const created = findById(newId);
  if (!created) throw new Error("فشل إنشاء المستخدم");
  return created;
}

export function markEmailVerified(userId: number): void {
  const stmt = db.prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`);
  stmt.run(userId);
}

export function updatePassword(userId: number, passwordHash: string): void {
  const stmt = db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);
  stmt.run(passwordHash, userId);
}
