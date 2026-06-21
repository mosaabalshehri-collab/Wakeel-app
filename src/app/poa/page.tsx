"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { formatDateArabic, isExpiringSoon } from "@/lib/poaDisplay";
import { SearchIcon, PlusIcon, EditIcon, TrashIcon, EmptyStateIllustration } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import type { PowerOfAttorney } from "@/types";

const POA_TYPES = ["عامة", "خاصة", "بيع", "بيع عقار", "إدارة أعمال", "أخرى"];

// "expiring_soon" ليست حالة فعلية في قاعدة البيانات (status عمود حقيقي
// قيمه active/expired/cancelled فقط) — هي حالة محسوبة (سارية + تنتهي
// خلال 30 يوماً)، فلا تُرسل للـ API كـ status، بل تُفلتر محلياً بعد
// وصول البيانات عبر نفس isExpiringSoon المستخدمة في لوحة التحكم.
const EXPIRING_SOON_VALUE = "expiring_soon";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "كل الحالات" },
  { value: "active", label: "سارية" },
  { value: EXPIRING_SOON_VALUE, label: "قربت تنتهي" },
  { value: "expired", label: "منتهية" },
  { value: "cancelled", label: "ملغاة" },
];

export default function PoaListPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();
  const [poas, setPoas] = useState<PowerOfAttorney[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAnyPoa, setHasAnyPoa] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PowerOfAttorney | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  const loadPoas = useCallback(() => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    // "قربت تنتهي" تُحسب محلياً، فنرسل status=active للـ API (الوكالة
    // المنتهية قريباً هي بالضرورة سارية) ثم نفلتر بـ isExpiringSoon بعدها
    if (status === EXPIRING_SOON_VALUE) {
      params.set("status", "active");
    } else if (status) {
      params.set("status", status);
    }
    if (type) params.set("type", type);
    fetch(`/api/poa?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        let list: PowerOfAttorney[] = data.poas ?? [];
        if (status === EXPIRING_SOON_VALUE) {
          list = list.filter((p) => isExpiringSoon(p));
        }
        setPoas(list);
        if (!search && !status && !type) setHasAnyPoa(list.length > 0);
      })
      .finally(() => setLoading(false));
  }, [user, search, status, type]);

  useEffect(() => {
    const timeout = setTimeout(loadPoas, 250); // debounce بسيط للبحث
    return () => clearTimeout(timeout);
  }, [loadPoas]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/poa/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("تعذر حذف الوكالة", "error");
        return;
      }
      showToast(`تم نقل وكالة رقم ${deleteTarget.poaNumber} لسلة المحذوفات`);
      setDeleteTarget(null);
      loadPoas();
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setDeleting(false);
    }
  }

  const hasActiveFilters = Boolean(search || status || type);

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
              الوكالات
            </h1>
            {!loading && hasAnyPoa && (
              <p className="mt-0.5 text-sm text-stone-500">
                {poas.length} {poas.length === 1 ? "وكالة" : "وكالات"}
                {hasActiveFilters && " مطابقة للفلتر"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/poa/trash"
              className="flex h-10 w-10 items-center justify-center rounded-lg border transition hover:bg-stone-50"
              style={{ borderColor: "var(--color-border)", color: "var(--color-ink)" }}
              aria-label="سلة المحذوفات"
              title="سلة المحذوفات"
            >
              <TrashIcon size={16} />
            </Link>
            <Link
              href="/poa/new"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <PlusIcon size={16} />
              وكالة جديدة
            </Link>
          </div>
        </div>

        {/* أدوات البحث والفلترة - تظهر فقط لو عنده وكالات أصلاً */}
        {(hasAnyPoa || hasActiveFilters) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-stone-400">
                <SearchIcon size={16} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم الوكالة، اسم الموكِّل، أو الوكيل..."
                className="w-full rounded-lg border py-2 ps-9 pe-3 text-sm outline-none"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "var(--color-paper-raised)",
                }}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-paper-raised)" }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-paper-raised)" }}
            >
              <option value="">كل الأنواع</option>
              {POA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <ListSkeleton />
        ) : poas.length === 0 ? (
          hasActiveFilters ? (
            <NoResultsState
              onClear={() => {
                setSearch("");
                setStatus("");
                setType("");
              }}
            />
          ) : (
            <EmptyPoaState />
          )
        ) : (
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "var(--color-border)" }}
          >
            {poas.map((poa, i) => (
              <div
                key={poa.id}
                className="flex flex-col gap-3 px-4 py-4 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  backgroundColor: "var(--color-paper-raised)",
                  borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      backgroundColor: "var(--color-primary-light)",
                      color: "var(--color-primary-dark)",
                    }}
                  >
                    {poa.principalName.trim().charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="tabular text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                        {poa.poaNumber}
                      </p>
                      <span
                        className="rounded-md px-2 py-0.5 text-xs"
                        style={{ backgroundColor: "var(--color-surface)", color: "#78716c" }}
                      >
                        {poa.poaType}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-stone-600">
                      {poa.principalName} ← {poa.agentName}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      صدرت {formatDateArabic(poa.issueDate)}
                      {poa.expiryDate && ` · تنتهي ${formatDateArabic(poa.expiryDate)}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <StatusBadge poa={poa} />
                  <Link
                    href={`/poa/${poa.id}/edit`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100"
                    style={{ color: "var(--color-primary-dark)" }}
                    aria-label="تعديل"
                  >
                    <EditIcon size={16} />
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(poa)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-stone-100"
                    style={{ color: "var(--color-status-expired)" }}
                    aria-label="حذف"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* تأكيد الحذف */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-paper-raised)" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              حذف الوكالة؟
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              راح تحذف وكالة رقم {deleteTarget.poaNumber} نهائياً. هذا الإجراء ما ينرجع.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
                style={{ borderColor: "var(--color-border)" }}
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--color-status-expired)" }}
              >
                {deleting ? "جارٍ الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPoaState() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <EmptyStateIllustration size={110} />
      <h2 className="mt-5 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
        ما عندك وكالات مسجلة بعد
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-stone-500">
        ابدأ بتسجيل أول وكالة شرعية لمتابعة حالتها وتاريخ انتهائها
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

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--color-surface)", color: "#a8a29e" }}
      >
        <SearchIcon size={24} />
      </div>
      <h2 className="mt-4 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
        ما فيه نتائج مطابقة
      </h2>
      <p className="mt-1 text-sm text-stone-500">جرّب تغيير كلمات البحث أو الفلاتر</p>
      <button
        onClick={onClear}
        className="mt-4 text-sm font-medium"
        style={{ color: "var(--color-primary-dark)" }}
      >
        مسح الفلاتر
      </button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--color-border)" }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[88px]"
          style={{
            backgroundColor: "var(--color-paper-raised)",
            borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
          }}
        />
      ))}
    </div>
  );
}
