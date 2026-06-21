import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as userRepo from "@/lib/repositories/userRepository";
import * as tokenRepo from "@/lib/repositories/verificationTokenRepository";
import { sendEmail, buildVerificationEmail } from "@/lib/mailer";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_ATTEMPTS = 3;
const WINDOW_SECONDS = 15 * 60;

export const POST = withAuth(async (request, auth) => {
  const rateLimit = checkRateLimit(
    `resend-verification:${auth.userId}`,
    MAX_ATTEMPTS,
    WINDOW_SECONDS
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "محاولات كثيرة جداً، حاول مرة أخرى بعد قليل" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const user = userRepo.findById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ message: "بريدك الإلكتروني مؤكد بالفعل" });
  }

  tokenRepo.invalidatePrevious(user.id, "email_verify");
  const token = tokenRepo.create(user.id, "email_verify");
  const verifyUrl = `${request.nextUrl.origin}/verify-email?token=${token.token}`;
  const { subject, html } = buildVerificationEmail(verifyUrl);

  try {
    await sendEmail({ to: user.email, subject, html });
  } catch (error) {
    console.error("فشل إرسال بريد تأكيد البريد الإلكتروني:", error);
    return NextResponse.json({ error: "تعذر إرسال البريد الإلكتروني" }, { status: 500 });
  }

  return NextResponse.json({ message: "تم إرسال رابط التأكيد إلى بريدك الإلكتروني" });
});
