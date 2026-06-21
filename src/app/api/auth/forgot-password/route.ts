import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import * as userRepo from "@/lib/repositories/userRepository";
import * as tokenRepo from "@/lib/repositories/verificationTokenRepository";
import { sendEmail, buildPasswordResetEmail } from "@/lib/mailer";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// حد طلبات استرجاع كلمة المرور: 5 طلبات كل 15 دقيقة لكل IP
const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`forgot-password:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
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

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const user = userRepo.findByEmail(parsed.data.email);

  // مهم أمنياً: نرجع نفس الرسالة سواء كان البريد موجوداً أو لا، حتى
  // لا نتيح اكتشاف (user enumeration) أي بريد مسجل في النظام عبر هذا
  // المسار. الإرسال الفعلي يحصل فقط لو كان المستخدم موجوداً.
  if (user) {
    tokenRepo.invalidatePrevious(user.id, "password_reset");
    const token = tokenRepo.create(user.id, "password_reset");
    const resetUrl = `${request.nextUrl.origin}/reset-password?token=${token.token}`;
    const { subject, html } = buildPasswordResetEmail(resetUrl);
    try {
      await sendEmail({ to: user.email, subject, html });
    } catch (error) {
      console.error("فشل إرسال بريد استرجاع كلمة المرور:", error);
      // لا نُفصح عن فشل الإرسال للمستخدم لنفس سبب عدم الإفصاح عن
      // وجود البريد من عدمه أعلاه
    }
  }

  return NextResponse.json({
    message: "إذا كان البريد الإلكتروني مسجلاً لدينا، ستصلك رسالة لاسترجاع كلمة المرور",
  });
}
