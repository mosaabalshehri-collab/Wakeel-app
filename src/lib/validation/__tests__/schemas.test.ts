import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createPoaSchema, updatePoaSchema } from "../schemas.ts";

/**
 * اختبارات وحدة لتحقق التواريخ المتقاطع (expiryDate >= issueDate).
 *
 * هذا يغطي bug حقيقي تم اكتشافه أثناء التطوير: لم يكن هناك أي تحقق
 * يمنع تسجيل وكالة بتاريخ انتهاء قبل تاريخ إصدارها. الإصلاح يشمل
 * مستويين: تحقق على مستوى الـ schema هنا (يكتشف الحالة الواضحة عند
 * إرسال الحقلين معاً)، وتحقق إضافي على مستوى الـ API route نفسه
 * (يتحقق من القيم المدمجة مع البيانات المخزّنة، لتغطية حالة PATCH
 * الجزئي حيث يُرسل حقل واحد فقط).
 */

const baseInput = {
  poaNumber: "123456789",
  poaType: "عامة",
  principalName: "عبدالله محمد",
  principalIdNumber: "1234567890",
  principalPhone: "0512345678",
  agentName: "موساب الشهري",
  agentIdNumber: "0987654321",
  agentPhone: "0598765432",
  issueDate: "2026-06-01",
  expiryDate: "2026-12-01",
};

describe("createPoaSchema required fields", () => {
  test("يرفض وكالة بدون تاريخ انتهاء (صار إجبارياً)", () => {
    const withoutExpiry: Record<string, unknown> = { ...baseInput };
    delete withoutExpiry.expiryDate;
    const result = createPoaSchema.safeParse(withoutExpiry);
    assert.equal(result.success, false);
  });

  test("يرفض رقم هوية أقل من 10 أرقام", () => {
    const result = createPoaSchema.safeParse({
      ...baseInput,
      principalIdNumber: "123",
    });
    assert.equal(result.success, false);
  });

  test("يرفض رقم جوال أقل من 10 أرقام", () => {
    const result = createPoaSchema.safeParse({
      ...baseInput,
      agentPhone: "0512",
    });
    assert.equal(result.success, false);
  });

  test("يقبل بيانات كاملة وصحيحة", () => {
    const result = createPoaSchema.safeParse(baseInput);
    assert.equal(result.success, true);
  });
});

describe("createPoaSchema date validation", () => {
  test("يقبل تاريخ انتهاء بعد تاريخ الإصدار", () => {
    const result = createPoaSchema.safeParse({
      ...baseInput,
      expiryDate: "2026-12-01",
    });
    assert.equal(result.success, true);
  });

  test("يقبل تاريخ انتهاء يساوي تاريخ الإصدار (حالة حدّية)", () => {
    const result = createPoaSchema.safeParse({
      ...baseInput,
      expiryDate: "2026-06-01",
    });
    assert.equal(result.success, true);
  });

  test("يرفض تاريخ انتهاء قبل تاريخ الإصدار", () => {
    const result = createPoaSchema.safeParse({
      ...baseInput,
      expiryDate: "2026-01-01",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(
        result.error.issues[0].message,
        /تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار/
      );
    }
  });
});

describe("updatePoaSchema date validation", () => {
  test("يقبل تعديل لا يلمس أي تاريخ", () => {
    const result = updatePoaSchema.safeParse({ notes: "ملاحظة جديدة" });
    assert.equal(result.success, true);
  });

  test("يقبل إرسال expiryDate فقط بدون issueDate (لا يمكن التحقق هنا، يُترك لطبقة الـ API)", () => {
    // هذا سيناريو متعمد: الـ schema وحده لا يملك سياق issueDate
    // المخزّن، فلا يرفض هذه الحالة. التحقق الفعلي يحصل بعدها في
    // route handler الذي يدمج القيمة مع البيانات الموجودة.
    const result = updatePoaSchema.safeParse({ expiryDate: "2020-01-01" });
    assert.equal(result.success, true);
  });

  test("يرفض إرسال الحقلين معاً بتعارض واضح", () => {
    const result = updatePoaSchema.safeParse({
      issueDate: "2026-06-01",
      expiryDate: "2026-01-01",
    });
    assert.equal(result.success, false);
  });

  test("يقبل إرسال الحقلين معاً بترتيب صحيح", () => {
    const result = updatePoaSchema.safeParse({
      issueDate: "2026-01-01",
      expiryDate: "2026-06-01",
    });
    assert.equal(result.success, true);
  });
});
