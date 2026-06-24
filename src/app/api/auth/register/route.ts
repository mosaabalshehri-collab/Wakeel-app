import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/schemas";
import * as userRepo from "@/lib/repositories/userRepository";
import * as tokenRepo from "@/lib/repositories/verificationTokenRepository";
import { hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { sendEmail, buildVerificationEmail } from "@/lib/mailer";

// حد إنشاء الحسابات: 5 حسابات كل 15 دقيقة لكل IP، حماية من إنشاء
// حسابات وهمية بكثرة
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`register:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existing = userRepo.findByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "هذا البريد الإلكتروني مسجل مسبقاً" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = userRepo.create(name, email, passwordHash);
  } catch (error) {
    // تعارض UNIQUE على البريد الإلكتروني: يحصل نادراً في حالة سباق
    // (طلبان بنفس البريد بنفس اللحظة تجاوزا فحص findByEmail أعلاه معاً)
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مسجل مسبقاً" },
        { status: 409 }
      );
    }
    throw error;
  }

  const token = signToken({ userId: user.id, email: user.email });

  // إصدار وإرسال رابط تأكيد البريد الإلكتروني. لا نوقف عملية التسجيل
  // لو فشل الإرسال (مثلاً خدمة البريد غير مفعّلة بعد أثناء التطوير)
  // — المستخدم يقدر يطلب إعادة الإرسال لاحقاً من حسابه
  try {
    // إبطال أي توكنات تأكيد سابقة لنفس المستخدم قبل إصدار توكن جديد،
    // اتساقاً مع باقي تدفقات إصدار التوكنات (forgot-password وresend)
    tokenRepo.invalidatePrevious(user.id, "email_verify");
    const verifyToken = tokenRepo.create(user.id, "email_verify");
    const verifyUrl = `${request.nextUrl.origin}/verify-email?token=${verifyToken.token}`;
    const { subject, html } = buildVerificationEmail(verifyUrl);
    await sendEmail({ to: user.email, subject, html });
  } catch (error) {
    console.error("فشل إرسال بريد تأكيد البريد الإلكتروني:", error);
  }

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 أيام
  });
  return response;
}
