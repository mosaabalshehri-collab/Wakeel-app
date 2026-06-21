"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { formatDateArabic } from "@/lib/poaDisplay";
import { RestoreIcon, TrashIcon, ArrowLeftIcon } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import type { PowerOfAttorney } from "@/types";

export default function TrashPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: userLoading } = useCurrentUser();
  const [poas, setPoas] = useState<PowerOfAttorney[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  // نلتقط "الآن" مرة واحدة عند كل تحميل ناجح للبيانات بدل استدعاء
  // Date.now() مباشرة أثناء الـ render (دالة غير نقية/impure تنتج
  // قيمة مختلفة في كل إعادة رسم، وهو ما ترفضه قاعدة react-hooks/purity
  // بحق — استخدامها أثناء render يجعل ناتج المكوّن غير قابل للتنبؤ)
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PowerOfAttorney | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  const loadTrash = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/poa/trash");
      const data = await res.json();
      setPoas(data.poas ?? []);
      if (data.retentionDays) setRetentionDays(data.retentionDays);
      setLoadedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // استدعاء دالة async من effect عبر IIFE هو النمط الموصى به في
    // وثائق React للتعامل مع جلب بيانات يعتمد على تغيّر dependency
    // (هنا: loadTrash نفسها، المرتبطة بـ user) — بخلاف استدعاء setState
    // متزامن مباشر بجسم الـ effect دون أي عملية async بينهما
    void (async () => {
      await loadTrash();
    })();
  }, [loadTrash]);

  async function handleRestore(poa: PowerOfAttorney) {
    setActionError(null);
    setRestoringId(poa.id);
    try {
      const res = await fetch(`/api/poa/trash/${poa.id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "تعذر استعادة الوكالة");
        showToast(data.error ?? "تعذر استعادة الوكالة", "error");
        return;
      }
      showToast(`تمت استعادة وكالة رقم ${poa.poaNumber}`);
      loadTrash();
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setRestoringId(null);
    }
  }

  async function confirmPermanentDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/poa/trash/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast("تعذر حذف الوكالة نهائياً", "error");
        return;
      }
      showToast(`تم حذف وكالة رقم ${deleteTarget.poaNumber} نهائياً`);
      setDeleteTarget(null);
      loadTrash();
    } catch {
      showToast("تعذر الاتصال بالخادم", "error");
    } finally {
      setDeleting(false);
    }
  }

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
            <Link
              href="/poa"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-700"
            >
              <ArrowLeftIcon size={12} />
              رجوع للوكالات
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
              سلة المحذوفات
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              الوكالات المحذوفة تُحفظ هنا لمدة {retentionDays} يوماً قبل حذفها نهائياً
            </p>
          </div>
        </div>

        {actionError && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{
              color: "var(--color-status-expired)",
              backgroundColor: "var(--color-status-expired-bg)",
            }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">جارٍ التحميل...</p>
        ) : poas.length === 0 ? (
          <div
            className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--color-surface)", color: "#a8a29e" }}
            >
              <TrashIcon size={24} />
            </div>
            <h2 className="mt-4 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              سلة المحذوفات فارغة
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              أي وكالة تحذفها راح تظهر هنا مؤقتاً قبل حذفها نهائياً
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: "var(--color-border)" }}
          >
            {poas.map((poa, i) => {
              const deletedDaysAgo = poa.deletedAt
                ? Math.floor(
                    (loadedAt - new Date(poa.deletedAt.replace(" ", "T") + "Z").getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 0;
              const daysLeft = Math.max(0, retentionDays - deletedDaysAgo);

              return (
                <div
                  key={poa.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    backgroundColor: "var(--color-paper-raised)",
                    borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                  }}
                >
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
                      حُذفت {formatDateArabic(poa.deletedAt)} ·{" "}
                      {daysLeft > 0
                        ? `يُحذف نهائياً خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`
                        : "مؤهلة للحذف النهائي"}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleRestore(poa)}
                      disabled={restoringId === poa.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-stone-50 disabled:opacity-60"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-primary-dark)" }}
                    >
                      <RestoreIcon size={14} />
                      {restoringId === poa.id ? "جارٍ الاستعادة..." : "استعادة"}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(poa)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-stone-100"
                      style={{ color: "var(--color-status-expired)" }}
                      aria-label="حذف نهائي"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: "var(--color-paper-raised)" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              حذف نهائي؟
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              راح تحذف وكالة رقم {deleteTarget.poaNumber} نهائياً، بما في ذلك
              الملف المرفق (إن وجد). هذا الإجراء لا يمكن التراجع عنه إطلاقاً.
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
                onClick={confirmPermanentDelete}
                disabled={deleting}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--color-status-expired)" }}
              >
                {deleting ? "جارٍ الحذف..." : "حذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
