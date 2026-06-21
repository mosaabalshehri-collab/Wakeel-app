import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/schemas";
import * as userRepo from "@/lib/repositories/userRepository";
import { verifyPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// حد محاولات تسجيل الدخول: 10 محاولات كل 5 دقائق لكل IP، حماية من
// هجمات التخمين (brute force) على كلمات المرور
const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 5 * 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة جداً، حاول مرة أخرى بعد قليل" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const user = userRepo.findByEmail(email);
  if (!user) {
    return NextResponse.json(
      { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  }

  const token = signToken({ userId: user.id, email: user.email });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
