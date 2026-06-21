"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WakeelLogo from "@/components/WakeelLogo";
import SealPattern from "@/components/SealPattern";
import ThemeToggle from "@/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقين");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

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
            إنشاء حساب جديد
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            ابدأ بتسجيل ومتابعة وكالاتك
          </p>
        </div>

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
              الاسم
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="اسمك الكامل"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="name@example.com"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              كلمة المرور
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
            {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          عندك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--color-primary-dark)" }}>
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}
