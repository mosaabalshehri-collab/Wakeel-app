/**
 * إدارة وضع العرض (فاتح/داكن/تلقائي حسب النظام).
 *
 * التفضيل اليدوي يُحفظ في localStorage تحت المفتاح THEME_STORAGE_KEY.
 * إن لم يوجد تفضيل محفوظ، يُتبع إعداد النظام (prefers-color-scheme)
 * تلقائياً عبر media query — بدون أي قيمة محفوظة، فلو غيّر المستخدم
 * إعداد نظام التشغيل لاحقاً ينعكس ذلك مباشرة دون أي إجراء منه.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "wakeel-theme";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** يحسب ما إذا كان يجب تفعيل الوضع الداكن فعلياً بناءً على التفضيل المحفوظ */
export function resolveIsDark(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return getSystemPrefersDark();
}

export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(preference);
  document.documentElement.classList.toggle("dark", isDark);
}

export function setStoredTheme(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  if (preference === "system") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  applyTheme(preference);
}

/**
 * سكربت نصي يُحقن inline في <head> (راجع layout.tsx) لتطبيق الوضع
 * الصحيح قبل أول رسم للصفحة، تفادياً لوميض المحتوى بالوضع الخاطئ
 * (FOUC) الذي يحصل لو انتظرنا React/useEffect ليقوم بذلك.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;
