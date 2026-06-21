import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import * as userRepo from "@/lib/repositories/userRepository";
import * as tokenRepo from "@/lib/repositories/verificationTokenRepository";
import { hashPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`reset-password:${ip}`, MAX_ATTEMPTS, WINDOW_SECONDS);
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

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const validToken = tokenRepo.findValidByToken(token, "password_reset");
  if (!validToken) {
    return NextResponse.json(
      { error: "رابط استرجاع كلمة المرور غير صالح أو منتهي الصلاحية" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  userRepo.updatePassword(validToken.userId, passwordHash);
  tokenRepo.markUsed(validToken.id);

  return NextResponse.json({ message: "تم تحديث كلمة المرور بنجاح" });
}
