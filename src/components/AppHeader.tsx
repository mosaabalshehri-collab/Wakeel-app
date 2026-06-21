"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import WakeelLogo from "@/components/WakeelLogo";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
    </header>
  );
}
