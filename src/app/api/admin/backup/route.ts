import { NextRequest, NextResponse } from "next/server";
import { runScheduledBackup, listBackups } from "@/lib/backup";

/**
 * نقطة نهاية إدارية لتشغيل النسخ الاحتياطي وعرض قائمتها.
 *
 * هذه عملية على مستوى النظام كاملاً (تشمل بيانات كل المستخدمين)،
 * فحمايتها بـ withAuth العادي (الذي يتحقق فقط من وجود تسجيل دخول
 * لأي مستخدم عادي) غير كافية — أي مستخدم كان سيقدر يشغّل نسخاً
 * احتياطية بشكل متكرر (استنزاف موارد) أو يطّلع على معلومات لا تخصه
 * (حجم قاعدة البيانات، توقيت آخر نسخة). لذلك تُحمى بمفتاح سري إداري
 * منفصل تماماً عن نظام مصادقة المستخدمين العاديين، يُمرَّر عبر رأس
 * Authorization، ويُقارَن بمتغير البيئة BACKUP_SECRET.
 *
 * الاستخدام المتوقع: استدعاء دوري (يومي مثلاً) من خدمة جدولة خارجية
 * (cron job، GitHub Actions scheduled workflow، أو خدمة مثل
 * cron-job.org) تستهدف هذا المسار مع رأس Authorization الصحيح.
 * لا يوجد جدولة داخلية في كود التطبيق نفسه — Next.js في وضع الخادم
 * العادي (وليس serverless functions مجدولة) لا يوفر آلية cron مدمجة
 * موثوقة، وتشغيل setInterval داخل العملية يفشل بصمت عند أي إعادة
 * تشغيل للخادم.
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.BACKUP_SECRET;
  // لو لم يُضبط السر أصلاً (وضع التطوير الافتراضي)، نرفض الوصول
  // بدل السماح بدون حماية — الأمان الافتراضي يجب أن يكون "مرفوض"
  if (!secret) return false;
  const provided = request.headers.get("authorization");
  return provided === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const result = runScheduledBackup();
    return NextResponse.json({ backup: result });
  } catch (error) {
    console.error("فشل أخذ نسخة احتياطية:", error);
    return NextResponse.json(
      { error: "تعذر أخذ نسخة احتياطية" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const backups = listBackups();
  return NextResponse.json({ backups });
}
