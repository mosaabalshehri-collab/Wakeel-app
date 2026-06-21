"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import WakeelLogo from "@/components/WakeelLogo";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <WakeelLogo size={52} />
    </div>
  );
}
