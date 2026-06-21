"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import WakeelLogo from "@/components/WakeelLogo";
import SealPattern from "@/components/SealPattern";
import ThemeToggle from "@/components/ThemeToggle";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div
        className="rounded-2xl border p-6 text-center shadow-sm"
        style={{
          backgroundColor: "var(--color-paper-raised)",
          borderColor: "var(--color-border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-status-expired)" }}>
          رابط استرجاع كلمة المرور غير صالح
        </p>
        <Link
          href="/forgot-password"
          className="mt-3 inline-block text-sm font-semibold"
          style={{ color: "var(--color-primary-dark)" }}
        >
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border p-6 text-center shadow-sm"
        style={{
          backgroundColor: "var(--color-paper-raised)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--color-status-active-bg)",
            color: "var(--color-status-active)",
          }}
        >
          ✓
        </div>
        <p className="text-sm" style={{ color: "var(--color-ink)" }}>
          تم تحديث كلمة المرور بنجاح، جارٍ تحويلك لصفحة تسجيل الدخول...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        backgroundColor: "var(--color-paper-raised)",
        borderColor: "var(--color-border)",
      }}
    >
      {error && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-sm"
          style={{
            color: "var(--color-status-expired)",
            backgroundColor: "var(--color-status-expired-bg)",
          }}
        >
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-stone-700">
          كلمة المرور الجديدة
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
          style={{ borderColor: "var(--color-border)" }}
          placeholder="6 أحرف على الأقل"
        />
      </div>

      <div className="mb-6">
        <label className="mb-1.5 block text-sm font-medium text-stone-700">
          تأكيد كلمة المرور
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
          style={{ borderColor: "var(--color-border)" }}
          placeholder="أعد إدخال كلمة المرور"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {loading ? "جارٍ الحفظ..." : "تحديث كلمة المرور"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main
      className="dotted-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <SealPattern side="right" />
      <SealPattern side="left" />

      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <WakeelLogo size={52} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-ink)" }}>
            تعيين كلمة مرور جديدة
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            اختر كلمة مرور جديدة لحسابك
          </p>
        </div>

        <Suspense fallback={<p className="text-center text-sm text-stone-400">جارٍ التحميل...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
