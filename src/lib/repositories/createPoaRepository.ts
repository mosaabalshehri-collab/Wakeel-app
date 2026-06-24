import type { DatabaseSync } from "node:sqlite";
import type { PowerOfAttorney, CreatePoaInput, UpdatePoaInput } from "@/types";

/**
 * طبقة الوصول لبيانات الوكالات (Repository Pattern)
 *
 * كل استعلامات SQL الخاصة بالوكالات معزولة هنا. أي API route
 * يحتاج بيانات الوكالات يمر عبر هذه الدوال فقط، ولا يكتب SQL مباشرة.
 * هذا يسهل لاحقاً استبدال SQLite بـ PostgreSQL دون تغيير أي شيء
 * خارج هذا الملف.
 *
 * مبنية كـ factory function (createPoaRepository) تأخذ اتصال قاعدة
 * بيانات بدل الاعتماد على singleton عام، عشان تقدر الاختبارات تمرر
 * اتصال SQLite في الذاكرة (:memory:) منفصل تماماً عن قاعدة بيانات
 * التطوير الفعلية. الاستخدام العادي بالتطبيق (عبر poaRepository.ts)
 * يبقى كما هو دون أي تغيير في كيفية الاستدعاء.
 *
 * الحذف هنا "ناعم" (soft delete) عبر عمود deleted_at بدل DELETE فعلي:
 * findAllByUser وfindById يستثنيان السجلات المحذوفة تلقائياً، فباقي
 * الكود (API routes، الواجهة) لا يحتاج أي وعي بوجود سلة محذوفات أصلاً
 * إلا الأماكن التي تتعامل معها صراحة (findDeletedByUser، restore،
 * hardDelete).
 */

interface PoaRow {
  id: number;
  user_id: number;
  poa_number: string;
  poa_type: string;
  principal_name: string;
  principal_id_number: string | null;
  principal_phone: string | null;
  agent_name: string;
  agent_id_number: string | null;
  agent_phone: string | null;
  scope_description: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  attachment_path: string | null;
  attachment_original_name: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PoaRow): PowerOfAttorney {
  return {
    id: row.id,
    userId: row.user_id,
    poaNumber: row.poa_number,
    poaType: row.poa_type,
    principalName: row.principal_name,
    principalIdNumber: row.principal_id_number,
    principalPhone: row.principal_phone,
    agentName: row.agent_name,
    agentIdNumber: row.agent_id_number,
    agentPhone: row.agent_phone,
    scopeDescription: row.scope_description,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    status: row.status as PowerOfAttorney["status"],
    notes: row.notes,
    attachmentPath: row.attachment_path,
    attachmentOriginalName: row.attachment_original_name,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** يحسب الحالة الفعلية بناءً على تاريخ الانتهاء (إن كانت سارية لكن منتهية فعلياً) */
function computeEffectiveStatus(poa: PowerOfAttorney): PowerOfAttorney {
  if (poa.status === "active" && poa.expiryDate) {
    const today = new Date().toISOString().slice(0, 10);
    if (poa.expiryDate < today) {
      return { ...poa, status: "expired" };
    }
  }
  return poa;
}

export interface PoaStats {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  expiringSoon: number; // خلال 30 يوم
}

// عدد الأيام التي تبقى فيها الوكالة المحذوفة بسلة المحذوفات قبل أن
// تصبح مؤهلة للحذف النهائي التلقائي (راجع purgeOldDeleted أدناه)
export const TRASH_RETENTION_DAYS = 30;

export function createPoaRepository(db: DatabaseSync) {
  function findAllByUser(userId: number): PowerOfAttorney[] {
    const stmt = db.prepare(
      `SELECT * FROM power_of_attorneys WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
    );
    const rows = stmt.all(userId) as unknown as PoaRow[];
    return rows.map(mapRow).map(computeEffectiveStatus);
  }

  function findById(id: number, userId: number): PowerOfAttorney | null {
    const stmt = db.prepare(
      `SELECT * FROM power_of_attorneys WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    );
    const row = stmt.get(id, userId) as unknown as PoaRow | undefined;
    return row ? computeEffectiveStatus(mapRow(row)) : null;
  }

  /** الوكالات المحذوفة (سلة المحذوفات)، الأحدث حذفاً أولاً */
  function findDeletedByUser(userId: number): PowerOfAttorney[] {
    const stmt = db.prepare(
      `SELECT * FROM power_of_attorneys WHERE user_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
    const rows = stmt.all(userId) as unknown as PoaRow[];
    return rows.map(mapRow).map(computeEffectiveStatus);
  }

  /** يبحث عن وكالة محذوفة بعينها (للاستخدام في الاستعادة) */
  function findDeletedById(id: number, userId: number): PowerOfAttorney | null {
    const stmt = db.prepare(
      `SELECT * FROM power_of_attorneys WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`
    );
    const row = stmt.get(id, userId) as unknown as PoaRow | undefined;
    return row ? computeEffectiveStatus(mapRow(row)) : null;
  }

  function existsByNumber(
    userId: number,
    poaNumber: string,
    excludeId?: number
  ): boolean {
    // لا يحتسب الوكالات المحذوفة ضمن فحص التكرار — رقم وكالة محذوف
    // متاح لإعادة الاستخدام (يطابق سلوك الفهرس الفريد الجزئي في
    // db.ts الذي يستثني deleted_at IS NOT NULL بنفس المنطق)
    const stmt = db.prepare(
      `SELECT 1 FROM power_of_attorneys
       WHERE user_id = ? AND poa_number = ? AND id != ? AND deleted_at IS NULL LIMIT 1`
    );
    const row = stmt.get(userId, poaNumber, excludeId ?? -1);
    return row !== undefined;
  }

  function create(userId: number, input: CreatePoaInput): PowerOfAttorney {
    const stmt = db.prepare(`
      INSERT INTO power_of_attorneys (
        user_id, poa_number, poa_type, principal_name, principal_id_number,
        principal_phone, agent_name, agent_id_number, agent_phone,
        scope_description, issue_date, expiry_date, status, notes,
        attachment_path, attachment_original_name, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const result = stmt.run(
      userId,
      input.poaNumber,
      input.poaType,
      input.principalName,
      input.principalIdNumber ?? null,
      input.principalPhone ?? null,
      input.agentName,
      input.agentIdNumber ?? null,
      input.agentPhone ?? null,
      input.scopeDescription ?? null,
      input.issueDate,
      input.expiryDate ?? null,
      input.status ?? "active",
      input.notes ?? null,
      input.attachmentPath ?? null,
      input.attachmentOriginalName ?? null
    );
    const newId = Number(result.lastInsertRowid);
    const created = findById(newId, userId);
    if (!created) throw new Error("فشل إنشاء الوكالة");
    return created;
  }

  function update(
    id: number,
    userId: number,
    input: UpdatePoaInput
  ): PowerOfAttorney | null {
    const existing = findById(id, userId);
    if (!existing) return null;

    // مهم: نتجاهل أي مفتاح قيمته undefined في input حتى لا يطغى
    // على القيمة الموجودة في existing (سلوك spread الافتراضي في JS
    // يستبدل المفتاح حتى لو كانت القيمة undefined صراحة)
    const cleanInput = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined)
    );
    const merged = { ...existing, ...cleanInput } as PowerOfAttorney;

    const stmt = db.prepare(`
      UPDATE power_of_attorneys SET
        poa_number = ?, poa_type = ?, principal_name = ?, principal_id_number = ?,
        principal_phone = ?, agent_name = ?, agent_id_number = ?, agent_phone = ?,
        scope_description = ?, issue_date = ?, expiry_date = ?, status = ?,
        notes = ?, attachment_path = ?, attachment_original_name = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);
    stmt.run(
      merged.poaNumber,
      merged.poaType,
      merged.principalName,
      merged.principalIdNumber ?? null,
      merged.principalPhone ?? null,
      merged.agentName,
      merged.agentIdNumber ?? null,
      merged.agentPhone ?? null,
      merged.scopeDescription ?? null,
      merged.issueDate,
      merged.expiryDate ?? null,
      merged.status,
      merged.notes ?? null,
      merged.attachmentPath ?? null,
      merged.attachmentOriginalName ?? null,
      id,
      userId
    );
    return findById(id, userId);
  }

  /** حذف ناعم: يضع deleted_at بدل حذف السجل فعلياً، فيمكن استعادته لاحقاً */
  function softDelete(id: number, userId: number): boolean {
    const stmt = db.prepare(
      `UPDATE power_of_attorneys SET deleted_at = datetime('now')
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  /** يستعيد وكالة من سلة المحذوفات. يفشل لو رقمها تعارض مع وكالة نشطة أخرى بنفس الرقم */
  function restore(id: number, userId: number): PowerOfAttorney | null {
    const deleted = findDeletedById(id, userId);
    if (!deleted) return null;

    if (existsByNumber(userId, deleted.poaNumber, id)) {
      throw new Error(
        "يوجد لديك وكالة نشطة بنفس الرقم، عدّل رقمها أولاً قبل الاستعادة"
      );
    }

    const stmt = db.prepare(
      `UPDATE power_of_attorneys SET deleted_at = NULL WHERE id = ? AND user_id = ?`
    );
    stmt.run(id, userId);
    return findById(id, userId);
  }

  /** حذف نهائي وفعلي من قاعدة البيانات — لا يمكن التراجع عنه. يُستخدم من سلة المحذوفات فقط */
  function hardDelete(id: number, userId: number): boolean {
    const stmt = db.prepare(
      `DELETE FROM power_of_attorneys WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`
    );
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  /**
   * يحذف نهائياً كل الوكالات التي تجاوز حذفها الناعم مدة الاحتفاظ
   * (TRASH_RETENTION_DAYS). يرجع قائمة مسارات المرفقات المرتبطة بها
   * (إن وجدت) ليتولى المستدعي حذف الملفات الفعلية من القرص — الـ
   * repository لا يتعامل مع نظام الملفات مباشرة.
   */
  function purgeOldDeleted(userId: number): string[] {
    const selectStmt = db.prepare(`
      SELECT attachment_path FROM power_of_attorneys
      WHERE user_id = ? AND deleted_at IS NOT NULL
        AND deleted_at <= datetime('now', '-${TRASH_RETENTION_DAYS} days')
    `);
    const rows = selectStmt.all(userId) as unknown as { attachment_path: string | null }[];
    const attachmentPaths = rows
      .map((r) => r.attachment_path)
      .filter((p): p is string => Boolean(p));

    const deleteStmt = db.prepare(`
      DELETE FROM power_of_attorneys
      WHERE user_id = ? AND deleted_at IS NOT NULL
        AND deleted_at <= datetime('now', '-${TRASH_RETENTION_DAYS} days')
    `);
    deleteStmt.run(userId);

    return attachmentPaths;
  }

  // خيارات تصفية قائمة الوكالات. كلها اختيارية.
  interface FindFilters {
    status?: string; // الحالة الفعلية المطلوبة: active | expired | cancelled
    type?: string; // نوع الوكالة
    search?: string; // بحث نصّي في رقم الوكالة واسم الموكِّل والوكيل
  }

  // يهرّب محارف LIKE الخاصة (% _ \) حتى يتعامل بحث المستخدم كنص حرفي
  // لا كنمط، مع استخدام ESCAPE '\' في الاستعلام
  function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  }

  /**
   * يجلب وكالات المستخدم مع تطبيق التصفية على مستوى قاعدة البيانات
   * مباشرة بدل جلب كل الصفوف وتصفيتها في الذاكرة. الحالة الفعلية
   * (active/expired) تُحسب في SQL بنفس منطق computeEffectiveStatus:
   * وكالة status='active' لكن تاريخ انتهائها مضى تُعدّ "منتهية".
   */
  function findByUserFiltered(
    userId: number,
    filters: FindFilters = {}
  ): PowerOfAttorney[] {
    const today = new Date().toISOString().slice(0, 10);
    const conditions: string[] = ["user_id = ?", "deleted_at IS NULL"];
    const args: unknown[] = [userId];

    if (filters.status === "active") {
      conditions.push(
        "status = 'active' AND (expiry_date IS NULL OR expiry_date >= ?)"
      );
      args.push(today);
    } else if (filters.status === "expired") {
      conditions.push(
        "(status = 'expired' OR (status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?))"
      );
      args.push(today);
    } else if (filters.status === "cancelled") {
      conditions.push("status = 'cancelled'");
    }

    if (filters.type) {
      conditions.push("poa_type = ?");
      args.push(filters.type);
    }

    if (filters.search) {
      const like = `%${escapeLike(filters.search.toLowerCase())}%`;
      conditions.push(
        `(LOWER(poa_number) LIKE ? ESCAPE '\\'
          OR LOWER(principal_name) LIKE ? ESCAPE '\\'
          OR LOWER(agent_name) LIKE ? ESCAPE '\\')`
      );
      args.push(like, like, like);
    }

    const stmt = db.prepare(
      `SELECT * FROM power_of_attorneys
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC`
    );
    const rows = stmt.all(...(args as never[])) as unknown as PoaRow[];
    return rows.map(mapRow).map(computeEffectiveStatus);
  }

  /** عدد وكالات المستخدم النشطة (غير المحذوفة) — يُستخدم لفرض حد لكل مستخدم */
  function countByUser(userId: number): number {
    const stmt = db.prepare(
      `SELECT COUNT(*) AS n FROM power_of_attorneys
       WHERE user_id = ? AND deleted_at IS NULL`
    );
    const row = stmt.get(userId) as unknown as { n: number };
    return row.n;
  }

  function getStats(userId: number): PoaStats {
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const todayStr = today.toISOString().slice(0, 10);
    const in30Str = in30Days.toISOString().slice(0, 10);

    // حساب الإحصائيات في استعلام واحد عبر SQL بدل جلب كل الصفوف
    // وعدّها في الذاكرة. منطق "expired" و"active" يطابق
    // computeEffectiveStatus بالضبط.
    const stmt = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' AND (expiry_date IS NULL OR expiry_date >= ?) THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'expired' OR (status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?) THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'active' AND expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ? THEN 1 ELSE 0 END) AS expiringSoon
      FROM power_of_attorneys
      WHERE user_id = ? AND deleted_at IS NULL
    `);
    const row = stmt.get(
      todayStr,
      todayStr,
      todayStr,
      in30Str,
      userId
    ) as unknown as {
      total: number;
      active: number | null;
      expired: number | null;
      cancelled: number | null;
      expiringSoon: number | null;
    };

    return {
      total: row.total,
      active: row.active ?? 0,
      expired: row.expired ?? 0,
      cancelled: row.cancelled ?? 0,
      expiringSoon: row.expiringSoon ?? 0,
    };
  }

  return {
    findAllByUser,
    findByUserFiltered,
    countByUser,
    findById,
    findDeletedByUser,
    findDeletedById,
    create,
    update,
    softDelete,
    restore,
    hardDelete,
    purgeOldDeleted,
    getStats,
    existsByNumber,
  };
}
