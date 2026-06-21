"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { PlusIcon, EditIcon, TrashIcon, ActivityIcon } from "@/components/icons";
import type { ActivityLogEntry } from "@/types";

const ACTION_META: Record<
  string,
  { label: string; fg: string; bg: string; icon: (size: number) => React.ReactNode }
> = {
  create: {
    label: "إضافة",
    fg: "var(--color-status-active)",
    bg: "var(--color-status-active-bg)",
    icon: (size) => <PlusIcon size={size} />,
  },
  update: {
    label: "تعديل",
    fg: "var(--color-status-warning)",
    bg: "var(--color-status-warning-bg)",
    icon: (size) => <EditIcon size={size} />,
  },
  delete: {
    label: "حذف",
    fg: "var(--color-status-expired)",
    bg: "var(--color-status-expired-bg)",
    icon: (size) => <TrashIcon size={size} />,
  },
};

const timeFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  hour: "numeric",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** قيم SQLite تأتي بصيغة "YYYY-MM-DD HH:MM:SS" بتوقيت UTC */
function parseTimestamp(isoLike: string): Date {
  return new Date(isoLike.replace(" ", "T") + "Z");
}

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "اليوم";
  if (sameDay(date, yesterday)) return "أمس";
  return dayFormatter.format(date);
}

export default function ActivityPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/activity?limit=50")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, [user]);

  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-400">جارٍ التحميل...</p>
      </div>
    );
  }

  // تجميع السجلات حسب اليوم
  const groups: { label: string; items: ActivityLogEntry[] }[] = [];
  for (const entry of entries) {
    const label = dayLabel(parseTimestamp(entry.createdAt));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(entry);
    } else {
      groups.push({ label, items: [entry] });
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            سجل النشاط
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            كل عملية إضافة أو تعديل أو حذف على وكالاتك، بترتيب زمني
          </p>
        </div>

        {loading ? (
          <TimelineSkeleton />
        ) : entries.length === 0 ? (
          <EmptyActivityState />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-3 text-xs font-semibold text-stone-400">{group.label}</p>
                <div className="relative">
                  {/* خط زمني عمودي يربط بين النقاط */}
                  <div
                    className="absolute bottom-0 top-0 start-[15px] w-px"
                    style={{ backgroundColor: "var(--color-border)" }}
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    {group.items.map((entry) => {
                      const meta = ACTION_META[entry.action] ?? {
                        label: entry.action,
                        fg: "#78716c",
                        bg: "var(--color-surface)",
                        icon: () => null,
                      };
                      return (
                        <div key={entry.id} className="relative flex gap-3 py-2.5">
                          <div
                            className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                            style={{ backgroundColor: meta.bg, color: meta.fg }}
                          >
                            {meta.icon(14)}
                          </div>
                          <div className="min-w-0 flex-1 pt-1">
                            <div className="flex flex-wrap items-center gap-x-2">
                              <span className="text-sm font-semibold" style={{ color: meta.fg }}>
                                {meta.label}
                              </span>
                              <span className="tabular text-xs text-stone-400">
                                {timeFormatter.format(parseTimestamp(entry.createdAt))}
                              </span>
                            </div>
                            {entry.details && (
                              <p className="mt-0.5 text-sm text-stone-600">{entry.details}</p>
                            )}
                            {entry.poaId && (
                              <Link
                                href={`/poa/${entry.poaId}/edit`}
                                className="mt-0.5 inline-block text-xs font-medium hover:underline"
                                style={{ color: "var(--color-primary-dark)" }}
                              >
                                عرض الوكالة
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyActivityState() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-primary-light)", color: "var(--color-primary-dark)" }}
      >
        <ActivityIcon size={28} />
      </div>
      <h2 className="mt-4 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        ما فيه أي نشاط بعد
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">
        بمجرد ما تضيف أو تعدّل أو تحذف وكالة، راح يظهر هنا سجل كامل بكل
        العمليات
      </p>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-24 rounded" style={{ backgroundColor: "var(--color-border)" }} />
            <div className="h-3 w-48 rounded" style={{ backgroundColor: "var(--color-border)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
