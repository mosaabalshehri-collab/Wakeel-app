"use client";

import { useEffect } from "react";

/**
 * يحذّر المستخدم قبل إغلاق التبويب أو تحديث الصفحة أو مغادرة الموقع
 * بالكامل، طالما isDirty صحيحة (يوجد تعديلات غير محفوظة).
 *
 * يغطي هذا الـ hook حالة "مغادرة الموقع" فقط (عبر beforeunload —
 * مدعوم بشكل موثوق في كل المتصفحات). لا يغطي التنقل الداخلي بين
 * صفحات Next.js (مثل الضغط على رابط بالهيدر أو زر "رجوع")، لأن
 * App Router في Next.js لا يوفر حتى الآن واجهة رسمية لاعتراض التنقل
 * الداخلي (بخلاف Pages Router القديم الذي وفّر router.events). لتغطية
 * أزرار التنقل الداخلي الصريحة (مثل "إلغاء")، يجب التعامل معها يدوياً
 * في المكوّن نفسه (راجع PoaForm.tsx: handleCancel يتحقق من isDirty
 * قبل router.back()).
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // بعض المتصفحات (خصوصاً Chrome) تتطلب تعيين returnValue صراحة
      // لإظهار حوار التأكيد الافتراضي للمتصفح؛ القيمة المُعادة لا
      // تُعرض فعلياً للمستخدم (المتصفحات الحديثة تستخدم نصاً عاماً
      // ثابتاً لأسباب أمنية)، لكن وجودها مطلوب لتفعيل الحوار أصلاً.
      e.returnValue = "";
      return "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
