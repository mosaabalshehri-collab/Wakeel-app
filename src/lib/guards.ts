import { NextResponse } from "next/server";
import * as userRepo from "@/lib/repositories/userRepository";
import * as poaRepo from "@/lib/repositories/poaRepository";

/**
 * حواجز (guards) مشتركة تُطبَّق على المسارات الحساسة.
 *
 * تأكيد البريد: كان النظام يصدر توكن تأكيد ويرسله، لكنه لا يفرض
 * التأكيد أبداً — أي مستخدم لم يؤكد بريده كان يستطيع استخدام كل شيء
 * عادي، فتصبح الميزة بلا أثر فعلي. هنا نفرضها على الإجراءات الكاتبة
 * (إنشاء وكالة، رفع ملف). الفرض اختياري عبر REQUIRE_EMAIL_VERIFICATION
 * حتى يبقى التشغيل المحلي (بدون خدمة بريد مربوطة) ممكناً دون أن
 * يحبس المطوّر نفسه خارج التطبيق.
 */
const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

// حد أقصى لعدد الوكالات النشطة لكل مستخدم، حماية من إساءة الاستخدام
// (مستخدم واحد يملأ قاعدة البيانات/القرص). قابل للضبط عبر البيئة.
export const MAX_POAS_PER_USER = Number(
  process.env.MAX_POAS_PER_USER ?? "500"
);

/**
 * يرجع NextResponse بخطأ 403 إذا كان تأكيد البريد مطلوباً والمستخدم
 * غير مؤكد، وإلا null (مسموح بالمتابعة).
 */
export function enforceEmailVerified(userId: number): NextResponse | null {
  if (!REQUIRE_EMAIL_VERIFICATION) return null;
  const user = userRepo.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "يجب تأكيد بريدك الإلكتروني أولاً قبل تنفيذ هذا الإجراء" },
      { status: 403 }
    );
  }
  return null;
}

/**
 * يرجع NextResponse بخطأ 403 إذا تجاوز المستخدم الحد الأقصى لعدد
 * الوكالات، وإلا null (مسموح بالإضافة).
 */
export function enforcePoaQuota(userId: number): NextResponse | null {
  const count = poaRepo.countByUser(userId);
  if (count >= MAX_POAS_PER_USER) {
    return NextResponse.json(
      {
        error: `بلغت الحد الأقصى لعدد الوكالات (${MAX_POAS_PER_USER}). احذف وكالات قديمة قبل الإضافة.`,
      },
      { status: 403 }
    );
  }
  return null;
}
