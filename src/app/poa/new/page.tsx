"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import PoaForm from "@/components/PoaForm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export default function NewPoaPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-400">جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
          إضافة وكالة جديدة
        </h1>
        <PoaForm />
      </main>
    </div>
  );
}
