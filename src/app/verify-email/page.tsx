"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import WakeelLogo from "@/components/WakeelLogo";
import SealPattern from "@/components/SealPattern";
import ThemeToggle from "@/components/ThemeToggle";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "رابط التأكيد غير صالح");

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "تعذر تأكيد البريد الإلكتروني");
          return;
        }
        setStatus("success");
        setMessage(data.message ?? "تم تأكيد بريدك الإلكتروني بنجاح");
      })
      .catch(() => {
        setStatus("error");
        setMessage("تعذر الاتصال بالخادم");
      });
  }, [token]);

  return (
    <div
      className="rounded-2xl border p-6 text-center shadow-sm"
      style={{
        backgroundColor: "var(--color-paper-raised)",
        borderColor: "var(--color-border)",
      }}
    >
      {status === "loading" && (
        <p className="text-sm text-stone-500">جارٍ تأكيد بريدك الإلكتروني...</p>
      )}
      {status === "success" && (
        <>
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
            {message}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg px-5 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            الذهاب للوحة التحكم
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: "var(--color-status-expired-bg)",
              color: "var(--color-status-expired)",
            }}
          >
            ✕
          </div>
          <p className="text-sm" style={{ color: "var(--color-ink)" }}>
            {message}
          </p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
            تأكيد البريد الإلكتروني
          </h1>
        </div>

        <Suspense fallback={<p className="text-center text-sm text-stone-400">جارٍ التحميل...</p>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  );
}
