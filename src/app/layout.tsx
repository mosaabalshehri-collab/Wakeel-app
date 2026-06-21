import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "وكيل | إدارة الوكالات الشرعية",
  description: "منصة لتسجيل ومتابعة الوكالات الشرعية المسجلة في ناجز",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* يُطبَّق قبل أول رسم للصفحة لتفادي وميض الوضع الخاطئ (FOUC).
            next/script بإستراتيجية beforeInteractive هي الطريقة
            الموصى بها في Next.js App Router لحقن سكربت ينفّذ قبل أي
            تفاعل، بدل وسم <script> خام الذي يولّد تحذيراً صريحاً من
            React عند استخدامه مباشرة داخل مكوّن. */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
