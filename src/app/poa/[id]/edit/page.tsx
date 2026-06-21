"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import PoaForm from "@/components/PoaForm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import type { PowerOfAttorney } from "@/types";

export default function EditPoaPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading: userLoading } = useCurrentUser();
  const [poa, setPoa] = useState<PowerOfAttorney | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/poa/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => setPoa(data.poa))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [user, params.id]);

  if (userLoading || !user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-400">جارٍ التحميل...</p>
      </div>
    );
  }

  if (notFound || !poa) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-sm text-stone-500">الوكالة غير موجودة.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
          تعديل وكالة رقم {poa.poaNumber}
        </h1>
        <PoaForm poa={poa} />
      </main>
    </div>
  );
}
