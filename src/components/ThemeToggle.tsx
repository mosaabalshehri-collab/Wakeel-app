"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";
import {
  getStoredTheme,
  resolveIsDark,
  setStoredTheme,
  type ThemePreference,
} from "@/lib/theme";

/**
 * زر تبديل بسيط بين الوضع الفاتح والداكن.
 *
 * يعرض الحالة الفعلية الحالية (وليس التفضيل المخزَّن) — يعني لو
 * المستخدم على "تلقائي" والنظام داكن حالياً، الزر يعرض أيقونة القمر
 * ويتيح التبديل الصريح للفاتح. بعد أول ضغطة، يصبح التفضيل يدوياً
 * ومحفوظاً، ويتجاوز إعداد النظام من حينها.
 *
 * نبدأ بـ isDark = null دائماً (حتى على المتصفح) لضمان تطابق أول
 * render مع ما يولّده السيرفر تماماً، ثم نقرأ القيمة الفعلية من DOM
 * داخل useEffect بعد التركيب (مزامنة مع نظام خارجي حقيقي — وهذا تحديداً
 * الاستخدام الموصى به لـ useEffect، خلافاً لحساب قيمة من state متاح
 * أصلاً أثناء render). تجاهل هذا النمط (مثل استخدام lazy initializer
 * يقرأ document مباشرة) يسبب hydration mismatch حقيقي عند التنقل بين
 * الصفحات عبر client-side navigation، لأن سكربت تهيئة الثيم في
 * layout.tsx لا يُعاد تنفيذه عند كل تنقل.
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // استثناء مقصود لقاعدة react-hooks/set-state-in-effect: هذا تحديداً
    // هو نمط "قراءة حالة من نظام خارجي بعد التركيب" الذي توصي به وثائق
    // React نفسها للـ effects (https://react.dev/learn/you-might-not-need-an-effect)
    // — لا بديل آمن له هنا لأن قراءة document.documentElement.classList
    // مباشرة أثناء أول render (عبر lazy initializer) تسبب hydration
    // mismatch حقيقي عند التنقل بين الصفحات عبر client-side navigation
    // (سكربت تهيئة الثيم في layout.tsx لا يُعاد تنفيذه في كل تنقل).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const current: ThemePreference = getStoredTheme();
    const currentlyDark = resolveIsDark(current);
    const next: ThemePreference = currentlyDark ? "light" : "dark";
    setStoredTheme(next);
    setIsDark(!currentlyDark);
  }

  if (isDark === null) {
    // عنصر نائب بنفس الأبعاد لتفادي قفزة بالتخطيط (layout shift)
    return <div className="h-9 w-9" aria-hidden="true" />;
  }

  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 dark:hover:bg-white/5"
      aria-label={isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
    >
      {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  );
}
