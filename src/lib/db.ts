/**
 * طبقة الاتصال بقاعدة البيانات
 *
 * نستخدم node:sqlite (المدمجة في Node.js 22+) كقاعدة بيانات SQL حقيقية
 * بدون أي اعتماديات native خارجية.
 *
 * ملاحظة للترقية المستقبلية إلى PostgreSQL:
 * كل التعامل مع قاعدة البيانات معزول في مجلد src/lib/repositories/
 * لذلك التبديل لمحرك آخر (مثل Prisma + PostgreSQL) يتطلب فقط
 * إعادة كتابة هذا الملف وملفات الـ repositories دون التأثير
 * على باقي التطبيق (API routes أو واجهات المستخدم).
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "wakeel.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

declare global {
  var __wakeelDb: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

// نستخدم singleton عشان ما نفتح اتصال جديد كل مرة (مهم خصوصاً في وضع التطوير مع hot-reload)
export const db: DatabaseSync = global.__wakeelDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  global.__wakeelDb = db;
}

export function initSchema(database: DatabaseSync = db) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS power_of_attorneys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      poa_number TEXT NOT NULL,
      poa_type TEXT NOT NULL,
      principal_name TEXT NOT NULL,
      principal_id_number TEXT,
      principal_phone TEXT,
      agent_name TEXT NOT NULL,
      agent_id_number TEXT,
      agent_phone TEXT,
      scope_description TEXT,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      attachment_path TEXT,
      attachment_original_name TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- فهرس فريد جزئي (partial unique index) بدل قيد UNIQUE عادي على
    -- العمود مباشرة: يفرض تفرّد رقم الوكالة لكل مستخدم فقط بين
    -- الوكالات غير المحذوفة. بدون "WHERE deleted_at IS NULL"، حذف
    -- وكالة ناعماً (soft delete) كان سيمنع المستخدم نهائياً من إعادة
    -- استخدام نفس الرقم لاحقاً، رغم أن السجل القديم محذوف فعلياً من
    -- منظوره.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_poa_unique_number_per_user
      ON power_of_attorneys(user_id, poa_number)
      WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      poa_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- توكنات تأكيد البريد الإلكتروني واسترجاع كلمة المرور. النوع
    -- (purpose) يميز بين الاستخدامين بنفس الجدول بدل تكرار البنية.
    CREATE TABLE IF NOT EXISTS verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      purpose TEXT NOT NULL CHECK (purpose IN ('email_verify', 'password_reset')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_poa_user ON power_of_attorneys(user_id);
    CREATE INDEX IF NOT EXISTS idx_poa_status ON power_of_attorneys(status);
    CREATE INDEX IF NOT EXISTS idx_poa_expiry ON power_of_attorneys(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_poa_deleted ON power_of_attorneys(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_token ON verification_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_tokens(user_id, purpose);
  `);
}

initSchema();
