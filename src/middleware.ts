import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * حماية المسارات على مستوى الخادم (Edge middleware).
 *
 * قبل هذا الملف كانت الحماية كلها client-side: كل صفحة محمية تتحقق
 * من المستخدم داخل useEffect وتعيد التوجيه بعد تحميلها في المتصفح،
 * ما يسبب "ومضة" من المحتوى المحمي للزائر غير المسجّل. هذا الـ
 * middleware يفحص توكن المصادقة على مستوى الـ edge — قبل أن تصل
 * الصفحة للمتصفح أصلاً — فيعيد التوجيه فوراً دون أي ومضة.
 *
 * ملاحظة: التحقق الفعلي الحاسم أمنياً يبقى في طبقة الـ API عبر
 * withAuth (الذي يفحص كل طلب بيانات). هذا الـ middleware طبقة دفاع
 * إضافية لتجربة المستخدم وحماية المسارات، وليس بديلاً عنها.
 *
 * نستخدم jose بدل jsonwebtoken لأن الأخير يعتمد على وحدات Node
 * الأصلية غير المتاحة في بيئة الـ Edge التي يعمل بها الـ middleware.
 */

const AUTH_COOKIE_NAME = "wakeel_token";

// المسارات التي تتطلب تسجيل دخول
const PROTECTED_PREFIXES = ["/dashboard", "/poa", "/activity"];

// مسارات الضيوف فقط: لو كان المستخدم مسجّلاً نعيده للوحة التحكم
const GUEST_ONLY_PATHS = ["/login", "/register"];

function getSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  if (!secret || secret.length < 32) {
    if (isProduction) return null; // إنتاج بلا سر صالح: نعامل الجميع كغير مصرّح
    return new TextEncoder().encode(
      "dev-only-insecure-secret-do-not-use-in-production"
    );
  }
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await isAuthenticated(request);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtected && !authed) {
    const loginUrl = new URL("/login", request.url);
    // نحفظ المسار المقصود لإعادة التوجيه إليه بعد تسجيل الدخول
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isGuestOnly = GUEST_ONLY_PATHS.includes(pathname);
  if (isGuestOnly && authed) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

/**
 * نطبّق الـ middleware على كل المسارات عدا ملفات Next الداخلية
 * والأصول الثابتة وملفات الـ API (المحمية أصلاً عبر withAuth).
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
