import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { initSchema } from "../../db.ts";
import { createPoaRepository } from "../createPoaRepository.ts";

/**
 * اختبارات وحدة (unit tests) لمنطق إدارة الوكالات.
 *
 * كل اختبار يحصل على قاعدة بيانات SQLite جديدة بالكامل في الذاكرة
 * (":memory:")، منفصلة تماماً عن قاعدة بيانات التطوير الفعلية،
 * عن طريق createPoaRepository (انظر شرح نمط الـ factory هناك).
 *
 * يُشغَّل عبر: node --test --experimental-strip-types
 */

function createTestRepo() {
  const db = new DatabaseSync(":memory:");
  initSchema(db);
  // مستخدم تجريبي لاستخدامه بكل الاختبارات (الـ repo لا يتعامل مع جدول
  // users مباشرة، فقط يحتاج user_id صالح للفلترة)
  db.exec(
    `INSERT INTO users (id, name, email, password_hash) VALUES (1, 'Test', 't@t.com', 'x')`
  );
  db.exec(
    `INSERT INTO users (id, name, email, password_hash) VALUES (2, 'Other', 'o@o.com', 'x')`
  );
  return createPoaRepository(db);
}

const baseInput = {
  poaNumber: "123456789",
  poaType: "عامة",
  principalName: "عبدالله محمد",
  agentName: "موساب الشهري",
  issueDate: "2026-01-01",
};

describe("poaRepository.create", () => {
  test("ينشئ وكالة جديدة بالحقول الأساسية", () => {
    const repo = createTestRepo();
    const poa = repo.create(1, baseInput);

    assert.equal(poa.poaNumber, "123456789");
    assert.equal(poa.status, "active"); // الحالة الافتراضية
    assert.equal(poa.userId, 1);
    assert.equal(poa.principalIdNumber, null); // حقل اختياري غير مرسل
  });

  test("الوكالات الجديدة من مستخدم لا تظهر لمستخدم آخر", () => {
    const repo = createTestRepo();
    repo.create(1, baseInput);

    const userTwoPoas = repo.findAllByUser(2);
    assert.equal(userTwoPoas.length, 0);
  });
});

describe("poaRepository.update", () => {
  test("تعديل جزئي لا يمسح الحقول غير المرسلة (regression test)", () => {
    // هذا الاختبار يغطي bug حقيقي تم اكتشافه وإصلاحه أثناء التطوير:
    // التعديل الجزئي (PATCH) كان يمسح principalIdNumber/agentIdNumber/
    // expiryDate لمجرد أنها لم تُرسل في الطلب، بسبب أن spread في JS
    // يستبدل المفتاح حتى لو كانت القيمة undefined صراحة.
    const repo = createTestRepo();
    const created = repo.create(1, {
      ...baseInput,
      principalIdNumber: "1111111111",
      agentIdNumber: "2222222222",
      expiryDate: "2026-12-01",
      scopeDescription: "وصف تجريبي",
    });

    const updated = repo.update(created.id, 1, {
      status: "cancelled",
      notes: "تم الإلغاء",
    });

    assert.ok(updated);
    assert.equal(updated.status, "cancelled");
    assert.equal(updated.notes, "تم الإلغاء");
    // الحقول التالية ما كان المفروض تتغير أو تنمسح:
    assert.equal(updated.principalIdNumber, "1111111111");
    assert.equal(updated.agentIdNumber, "2222222222");
    assert.equal(updated.expiryDate, "2026-12-01");
    assert.equal(updated.scopeDescription, "وصف تجريبي");
  });

  test("يرجع null عند تعديل وكالة غير موجودة", () => {
    const repo = createTestRepo();
    const result = repo.update(999, 1, { status: "cancelled" });
    assert.equal(result, null);
  });

  test("مستخدم لا يقدر يعدّل وكالة مستخدم آخر", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);

    const result = repo.update(created.id, 2, { status: "cancelled" });
    assert.equal(result, null);

    // وتأكد إن الوكالة الأصلية ما تغيرت
    const stillOriginal = repo.findById(created.id, 1);
    assert.equal(stillOriginal?.status, "active");
  });
});

describe("poaRepository status computation", () => {
  test("وكالة سارية بتاريخ انتهاء بالماضي تظهر كمنتهية تلقائياً", () => {
    const repo = createTestRepo();
    const created = repo.create(1, {
      ...baseInput,
      expiryDate: "2020-01-01", // تاريخ بالماضي قطعاً
    });

    const found = repo.findById(created.id, 1);
    assert.equal(found?.status, "expired");
  });

  test("وكالة ملغاة تبقى ملغاة حتى لو انتهى تاريخها", () => {
    const repo = createTestRepo();
    const created = repo.create(1, {
      ...baseInput,
      expiryDate: "2020-01-01",
      status: "cancelled",
    });

    const found = repo.findById(created.id, 1);
    assert.equal(found?.status, "cancelled"); // ما تتحول لـ expired
  });
});

describe("poaRepository.existsByNumber", () => {
  test("يرجع true عند وجود وكالة بنفس الرقم لنفس المستخدم", () => {
    const repo = createTestRepo();
    repo.create(1, baseInput);

    assert.equal(repo.existsByNumber(1, baseInput.poaNumber), true);
  });

  test("يرجع false إذا كان الرقم مستخدم من مستخدم آخر فقط", () => {
    const repo = createTestRepo();
    repo.create(2, baseInput);

    assert.equal(repo.existsByNumber(1, baseInput.poaNumber), false);
  });

  test("يستثني الوكالة الحالية عند تمرير excludeId (لحالة التعديل)", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);

    // بدون استثناء: يجد نفسه فيرجع true
    assert.equal(repo.existsByNumber(1, baseInput.poaNumber), true);
    // مع استثناء معرّفه: ما يعتبر نفسه تكراراً
    assert.equal(
      repo.existsByNumber(1, baseInput.poaNumber, created.id),
      false
    );
  });
});

describe("poaRepository duplicate poa_number constraint", () => {
  test("قاعدة البيانات ترفض رقم وكالة مكرر لنفس المستخدم", () => {
    const repo = createTestRepo();
    repo.create(1, baseInput);

    assert.throws(() => repo.create(1, baseInput), /UNIQUE/);
  });

  test("نفس رقم الوكالة مسموح لمستخدمين مختلفين", () => {
    const repo = createTestRepo();
    repo.create(1, baseInput);

    assert.doesNotThrow(() => repo.create(2, baseInput));
  });
});

describe("poaRepository.getStats", () => {
  test("يحسب الإحصائيات بشكل صحيح", () => {
    const repo = createTestRepo();
    repo.create(1, { ...baseInput, poaNumber: "1" }); // سارية بلا تاريخ انتهاء
    repo.create(1, { ...baseInput, poaNumber: "2", expiryDate: "2020-01-01" }); // منتهية
    repo.create(1, { ...baseInput, poaNumber: "3", status: "cancelled" }); // ملغاة

    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    repo.create(1, {
      ...baseInput,
      poaNumber: "4",
      expiryDate: soon.toISOString().slice(0, 10),
    }); // قربت تنتهي

    const stats = repo.getStats(1);
    assert.equal(stats.total, 4);
    assert.equal(stats.active, 2); // "1" و "4" (سارية فعلياً بحسب التاريخ)
    assert.equal(stats.expired, 1);
    assert.equal(stats.cancelled, 1);
    assert.equal(stats.expiringSoon, 1);
  });

  test("مستخدم بدون وكالات يحصل على أصفار", () => {
    const repo = createTestRepo();
    const stats = repo.getStats(1);
    assert.deepEqual(stats, {
      total: 0,
      active: 0,
      expired: 0,
      cancelled: 0,
      expiringSoon: 0,
    });
  });
});

describe("poaRepository soft delete (الحذف الناعم)", () => {
  test("softDelete يخفي الوكالة من findAllByUser وfindById", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);

    const deleted = repo.softDelete(created.id, 1);
    assert.equal(deleted, true);

    assert.equal(repo.findAllByUser(1).length, 0);
    assert.equal(repo.findById(created.id, 1), null);
  });

  test("softDelete يرجع false لو الوكالة غير موجودة أو محذوفة مسبقاً", () => {
    const repo = createTestRepo();
    assert.equal(repo.softDelete(999, 1), false);

    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);
    // محاولة حذف نفس الوكالة مرة ثانية يجب أن تفشل (deleted_at IS NULL
    // شرط بالـ WHERE)
    assert.equal(repo.softDelete(created.id, 1), false);
  });

  test("مستخدم لا يقدر يحذف وكالة مستخدم آخر", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);

    assert.equal(repo.softDelete(created.id, 2), false);
    assert.ok(repo.findById(created.id, 1)); // لازالت موجودة وغير محذوفة
  });

  test("رقم وكالة محذوفة يصبح متاحاً لإعادة الاستخدام فوراً (regression test)", () => {
    // هذا اختبار تراجع حرج: القيد الفريد الأصلي UNIQUE(user_id, poa_number)
    // كان سيمنع إعادة استخدام رقم وكالة محذوفة ناعماً إلى الأبد، لأن
    // السجل القديم يبقى موجوداً فعلياً في قاعدة البيانات. الحل هو فهرس
    // فريد جزئي (راجع db.ts: idx_poa_unique_number_per_user) يستثني
    // الصفوف المحذوفة.
    const repo = createTestRepo();
    const first = repo.create(1, baseInput);
    repo.softDelete(first.id, 1);

    assert.doesNotThrow(() => repo.create(1, baseInput));
  });

  test("existsByNumber لا يحتسب الوكالات المحذوفة", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);

    assert.equal(repo.existsByNumber(1, baseInput.poaNumber), false);
  });

  test("findDeletedByUser يرجع فقط الوكالات المحذوفة لنفس المستخدم", () => {
    const repo = createTestRepo();
    const kept = repo.create(1, { ...baseInput, poaNumber: "kept" });
    const deleted = repo.create(1, { ...baseInput, poaNumber: "deleted" });
    repo.softDelete(deleted.id, 1);

    const trash = repo.findDeletedByUser(1);
    assert.equal(trash.length, 1);
    assert.equal(trash[0].id, deleted.id);
    assert.equal(repo.findById(kept.id, 1)?.id, kept.id); // لم يتأثر
  });
});

describe("poaRepository.restore (الاستعادة من سلة المحذوفات)", () => {
  test("يستعيد وكالة محذوفة بنجاح", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);

    const restored = repo.restore(created.id, 1);
    assert.ok(restored);
    assert.equal(restored?.deletedAt, null);
    assert.equal(repo.findAllByUser(1).length, 1);
  });

  test("يرجع null عند محاولة استعادة وكالة غير موجودة في سلة المحذوفات", () => {
    const repo = createTestRepo();
    assert.equal(repo.restore(999, 1), null);

    // وكالة موجودة لكن غير محذوفة أصلاً
    const created = repo.create(1, baseInput);
    assert.equal(repo.restore(created.id, 1), null);
  });

  test("يرفض الاستعادة لو رقمها يتعارض مع وكالة نشطة أخرى بنفس الرقم", () => {
    const repo = createTestRepo();
    const original = repo.create(1, baseInput);
    repo.softDelete(original.id, 1);
    // إنشاء وكالة جديدة بنفس الرقم (مسموح لأن الأصلية محذوفة)
    repo.create(1, baseInput);

    assert.throws(
      () => repo.restore(original.id, 1),
      /وكالة نشطة بنفس الرقم/
    );
  });

  test("مستخدم لا يقدر يستعيد وكالة مستخدم آخر", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);

    assert.equal(repo.restore(created.id, 2), null);
  });
});

describe("poaRepository.hardDelete (الحذف النهائي)", () => {
  test("يحذف الوكالة فعلياً من قاعدة البيانات", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);

    const result = repo.hardDelete(created.id, 1);
    assert.equal(result, true);
    assert.equal(repo.findDeletedByUser(1).length, 0);
  });

  test("يرفض حذف وكالة لم تُحذف ناعماً أولاً (حماية من تجاوز سلة المحذوفات)", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);

    // hardDelete يشترط deleted_at IS NOT NULL — وكالة نشطة (غير محذوفة)
    // لا يمكن حذفها نهائياً مباشرة، يجب أن تمر بـ softDelete أولاً
    const result = repo.hardDelete(created.id, 1);
    assert.equal(result, false);
    assert.ok(repo.findById(created.id, 1)); // لا تزال موجودة وسارية
  });

  test("بعد الحذف النهائي، رقم الوكالة متاح حتى لو لم يُستعَد", () => {
    const repo = createTestRepo();
    const created = repo.create(1, baseInput);
    repo.softDelete(created.id, 1);
    repo.hardDelete(created.id, 1);

    assert.doesNotThrow(() => repo.create(1, baseInput));
  });
});
