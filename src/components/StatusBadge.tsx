import { STATUS_LABELS, STATUS_STYLES, isExpiringSoon, daysUntil } from "@/lib/poaDisplay";
import type { PowerOfAttorney } from "@/types";

export default function StatusBadge({ poa }: { poa: PowerOfAttorney }) {
  const expiringSoon = isExpiringSoon(poa);

  if (expiringSoon && poa.expiryDate) {
    const days = daysUntil(poa.expiryDate);
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
        style={{
          color: "var(--color-status-warning)",
          backgroundColor: "var(--color-status-warning-bg)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        تنتهي خلال {days} {days === 1 ? "يوم" : "أيام"}
      </span>
    );
  }

  const style = STATUS_STYLES[poa.status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
      style={{ color: style.text, backgroundColor: style.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[poa.status]}
    </span>
  );
}
