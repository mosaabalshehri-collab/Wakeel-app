"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import WakeelLogo from "@/components/WakeelLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleResendVerification() {
    setResendState("sending");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      setResendState(res.ok ? "sent" : "error");
    } catch {
      setResendState("error");
    }
  }

  function navStyle(active: boolean) {
    return {
      color: active ? "var(--color-primary-dark)" : "#5B5B5B",
      backgroundColor: active ? "var(--color-primary-light)" : "transparent",
      fontWeight: active ? 600 : 500,
    };
  }

  return (
    <header
      className="border-b"
      style={{
        backgroundColor: "var(--color-paper-raised)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <WakeelLogo size={30} />
            <span className="text-lg font-bold" style={{ color: "var(--color-ink)" }}>
              وكيل
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm transition"
              style={navStyle(pathname === "/dashboard")}
            >
              لوحة التحكم
            </Link>
            <Link
              href="/poa"
              className="rounded-lg px-3 py-1.5 text-sm transition"
              style={navStyle(pathname.startsWith("/poa"))}
            >
              الوكالات
            </Link>
            <Link
              href="/activity"
              className="rounded-lg px-3 py-1.5 text-sm transition"
              style={navStyle(pathname === "/activity")}
            >
              سجل النشاط
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <span className="hidden text-sm text-stone-500 sm:inline">{user.name}</span>
          )}
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-700"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* شريط تنبيه يظهر فقط للمستخدم الذي لم يؤكد بريده الإلكتروني */}
      {user && !user.emailVerified && (
        <div
          className="border-t px-4 py-2 text-sm sm:px-6"
          style={{
            backgroundColor: "#FEF3C7",
            borderColor: "#FDE68A",
            color: "#92400E",
          }}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <span>بريدك الإلكتروني غير مؤكد. أكّد بريدك لتفعيل كل المزايا.</span>
            {resendState === "sent" ? (
              <span className="font-medium">تم إرسال رابط التأكيد ✓</span>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendState === "sending"}
                className="rounded-md px-3 py-1 font-medium underline disabled:opacity-60"
              >
                {resendState === "sending"
                  ? "جارٍ الإرسال..."
                  : resendState === "error"
                  ? "تعذّر الإرسال، حاول مجدداً"
                  : "إعادة إرسال رابط التأكيد"}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
