"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WakeelLogo from "@/components/WakeelLogo";
import SealPattern from "@/components/SealPattern";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
            تسجيل الدخول
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            أدخل بياناتك للوصول إلى وكالاتك
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
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{
                borderColor: "var(--color-border)",
              }}
              placeholder="name@example.com"
            />
          </div>

          <div className="mb-2">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              كلمة المرور
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2"
              style={{ borderColor: "var(--color-border)" }}
              placeholder="••••••••"
            />
          </div>

          <div className="mb-6 text-left">
            <Link
              href="/forgot-password"
              className="text-xs font-medium"
              style={{ color: "var(--color-primary-dark)" }}
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          ما عندك حساب؟{" "}
          <Link href="/register" className="font-semibold" style={{ color: "var(--color-primary-dark)" }}>
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </main>
  );
}
