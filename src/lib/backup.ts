/**
 * نسخ احتياطي لقاعدة البيانات.
 *
 * المشروع يستخدم SQLite بملف واحد (data/wakeel.db) — لا توجد آلية
 * نسخ احتياطي تلقائية من قاعدة البيانات نفسها كما في الخوادم
 * المُدارة (مثل RDS أو Supabase)، فقدان هذا الملف الواحد (تلف قرص،
 * خطأ بشري، فشل خادم) يعني فقدان كل بيانات كل المستخدمين نهائياً
 * بدون أي طريقة استرجاع. هذا الملف يوفر الحد الأدنى الضروري من
 * الحماية ضد هذا السيناريو.
 *
 * الآلية: أمر SQL المدمج `VACUUM INTO` (وليس نسخ الملف مباشرة عبر
 * fs.copyFile) — هذا مهم لأن VACUUM INTO ينتج لقطة (snapshot) كاملة
 * ومتسقة من قاعدة البيانات حتى لو كانت هناك عملية كتابة جارية وقت
 * أخذ النسخة، بينما نسخ الملف الخام معرّض لإنتاج نسخة تالفة في تلك
 * الحالة.
 *
 * النسخ تُحفظ في data/backups/ (خارج Git عبر .gitignore)، بأسماء
 * تحمل الطابع الزمني، مع الاحتفاظ بعدد محدود فقط (BACKUP_RETENTION_COUNT)
 * لتفادي نمو غير محدود لحجم القرص.
 */
import { db } from "./db";
import path from "node:path";
import fs from "node:fs";

const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
export const BACKUP_RETENTION_COUNT = 14;

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function backupFileName(date: Date): string {
  // طابع زمني آمن لاستخدامه كاسم ملف (بدون : أو فواصل تسبب مشاكل
  // على بعض أنظمة الملفات)
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `wakeel-backup-${stamp}.db`;
}

export interface BackupResult {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

/** يأخذ نسخة احتياطية فورية من قاعدة البيانات الحالية */
export function createBackup(): BackupResult {
  ensureBackupsDir();
  const now = new Date();
  const fileName = backupFileName(now);
  const filePath = path.join(BACKUPS_DIR, fileName);

  // SQLite لا يقبل علامات اقتباس مفردة داخل المسار بهذا الشكل البسيط؛
  // نتأكد أن مسارنا الداخلي (مبني من process.cwd() ثابت) لا يحتويها
  db.exec(`VACUUM INTO '${filePath.replace(/'/g, "''")}'`);

  const stats = fs.statSync(filePath);
  return {
    fileName,
    filePath,
    sizeBytes: stats.size,
    createdAt: now.toISOString(),
  };
}

export interface BackupInfo {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

/** يرجع قائمة النسخ الاحتياطية الموجودة، الأحدث أولاً */
export function listBackups(): BackupInfo[] {
  ensureBackupsDir();
  const files = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith("wakeel-backup-") && f.endsWith(".db"));

  return files
    .map((fileName) => {
      const stats = fs.statSync(path.join(BACKUPS_DIR, fileName));
      return {
        fileName,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * يحذف أقدم النسخ الاحتياطية إن تجاوز عددها BACKUP_RETENTION_COUNT.
 * يُستدعى عادة مباشرة بعد createBackup() لمنع تراكم غير محدود.
 */
export function pruneOldBackups(): string[] {
  const backups = listBackups();
  const toDelete = backups.slice(BACKUP_RETENTION_COUNT);
  for (const backup of toDelete) {
    fs.unlinkSync(path.join(BACKUPS_DIR, backup.fileName));
  }
  return toDelete.map((b) => b.fileName);
}

/** ياخذ نسخة احتياطية جديدة ثم ينظف الأقدم منها — الدالة المخصصة للاستخدام الدوري */
export function runScheduledBackup(): BackupResult {
  const result = createBackup();
  pruneOldBackups();
  return result;
}
