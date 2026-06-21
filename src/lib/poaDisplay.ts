import type { PowerOfAttorney, PoaStatus } from "@/types";

export const STATUS_LABELS: Record<PoaStatus, string> = {
  active: "سارية",
  expired: "منتهية",
  cancelled: "ملغاة",
};

export const STATUS_STYLES: Record<PoaStatus, { text: string; bg: string }> = {
  active: { text: "var(--color-status-active)", bg: "var(--color-status-active-bg)" },
  expired: { text: "var(--color-status-expired)", bg: "var(--color-status-expired-bg)" },
  cancelled: { text: "var(--color-status-cancelled)", bg: "var(--color-status-cancelled-bg)" },
};

/** هل الوكالة قربت تنتهي خلال المدة المحددة (افتراضياً 30 يوم)؟ */
export function isExpiringSoon(poa: PowerOfAttorney, days = 30): boolean {
  if (poa.status !== "active" || !poa.expiryDate) return false;
  const today = new Date();
  const expiry = new Date(poa.expiryDate);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const arabicNumerals = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDateArabic(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return arabicNumerals.format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
