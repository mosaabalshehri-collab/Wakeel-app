"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { formatDateArabic, isExpiringSoon } from "@/lib/poaDisplay";
import {
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PlusIcon,
  EmptyStateIllustration,
} from "@/components/icons";
import type { PowerOfAttorney } from "@/types";
import type { PoaStats } from "@/lib/repositories/poaRepository";

const todayLabel = new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [stats, setStats] = useState<PoaStats | null>(null);
  const [recentPoas, setRecentPoas] = useState<PowerOfAttorney[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/poa").then((r) => r.json()),
    ])
      .then(([statsData, poaData]) => {
        setStats(statsData.stats);
        setRecentPoas(poaData.poas ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const expiringSoon = recentPoas.filter((p) => isExpiringSoon(p));
  const latestPoas = [...recentPoas]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const isEmpty = !loading && recentPoas.length === 0;

  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-400">جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-stone-400">{todayLabel}</p>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
              أهلاً، {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-stone-500">إليك نظرة عامة على وكالاتك</p>
          </div>
          <Link
            href="/poa/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <PlusIcon size={16} />
            وكالة جديدة
          </Link>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : isEmpty ? (
          <EmptyDashboard />
        ) : (
          <>
            {/* بطاقات الإحصائيات */}
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="إجمالي الوكالات"
                value={stats?.total ?? 0}
                icon={<FolderIcon size={22} />}
                tone="ink"
              />
              <StatCard
                label="سارية"
                value={stats?.active ?? 0}
                icon={<CheckCircleIcon size={22} />}
                tone="active"
              />
              <StatCard
                label="قربت تنتهي"
                value={stats?.expiringSoon ?? 0}
                icon={<ClockIcon size={22} />}
                tone="warning"
              />
              <StatCard
                label="منتهية"
                value={stats?.expired ?? 0}
                icon={<XCircleIcon size={22} />}
                tone="expired"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* تنبيهات الوكالات اللي قربت تنتهي */}
              <div className="lg:col-span-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    تحتاج متابعة قريباً
                  </h2>
                  {expiringSoon.length > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        color: "var(--color-status-warning)",
                        backgroundColor: "var(--color-status-warning-bg)",
                      }}
                    >
                      {expiringSoon.length}
                    </span>
                  )}
                </div>

                {expiringSoon.length > 0 ? (
                  <div
                    className="overflow-hidden rounded-2xl border"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    {expiringSoon.map((poa, i) => (
                      <Link
                        key={poa.id}
                        href={`/poa/${poa.id}/edit`}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-stone-50"
                        style={{
                          backgroundColor: "var(--color-paper-raised)",
                          borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                        }}
                      >
                        <div className="min-w-0">
                          <p className="tabular text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                            وكالة رقم {poa.poaNumber}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-stone-500">
                            {poa.principalName} ← {poa.agentName} · تنتهي{" "}
                            {formatDateArabic(poa.expiryDate)}
                          </p>
                        </div>
                        <StatusBadge poa={poa} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-dashed p-5"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "var(--color-status-active-bg)",
                        color: "var(--color-status-active)",
                      }}
                    >
                      <CheckCircleIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                        كل شي تمام
                      </p>
                      <p className="text-xs text-stone-500">
                        ما فيه وكالات تحتاج متابعة خلال الـ 30 يوم القادمة
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* آخر الوكالات المضافة */}
              <div className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    آخر الوكالات
                  </h2>
                  <Link
                    href="/poa"
                    className="text-xs font-medium"
                    style={{ color: "var(--color-primary-dark)" }}
                  >
                    عرض الكل
                  </Link>
                </div>
                <div
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {latestPoas.map((poa, i) => (
                    <Link
                      key={poa.id}
                      href={`/poa/${poa.id}/edit`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-stone-50"
                      style={{
                        backgroundColor: "var(--color-paper-raised)",
                        borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                      }}
                    >
                      <div className="min-w-0">
                        <p className="tabular text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                          {poa.poaNumber}
                        </p>
                        <p className="truncate text-xs text-stone-500">{poa.principalName}</p>
                      </div>
                      <StatusBadge poa={poa} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "ink" | "active" | "warning" | "expired";
}) {
  const palette: Record<typeof tone, { fg: string; bg: string }> = {
    ink: { fg: "var(--color-primary-dark)", bg: "var(--color-primary-light)" },
    active: { fg: "var(--color-status-active)", bg: "var(--color-status-active-bg)" },
    warning: { fg: "var(--color-status-warning)", bg: "var(--color-status-warning-bg)" },
    expired: { fg: "var(--color-status-expired)", bg: "var(--color-status-expired-bg)" },
  };
  const { fg, bg } = palette[tone];

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        backgroundColor: "var(--color-paper-raised)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: bg, color: fg }}
        >
          {icon}
        </div>
      </div>
      <p className="tabular mt-3 text-3xl font-bold" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <EmptyStateIllustration size={120} />
      <h2 className="mt-5 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        ما عندك وكالات مسجلة بعد
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">
        سجّل أول وكالة شرعية عشان تقدر تتابع حالتها وتاريخ انتهائها أول
        بأول، بدل الرجوع لمنصة ناجز كل مرة
      </p>
      <Link
        href="/poa/new"
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <PlusIcon size={16} />
        تسجيل أول وكالة
      </Link>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] rounded-2xl border"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-paper-raised)" }}
          />
        ))}
      </div>
      <div
        className="h-40 rounded-2xl border"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-paper-raised)" }}
      />
    </div>
  );
}
