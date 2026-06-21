import { NextRequest, NextResponse } from "next/server";
import * as userRepo from "@/lib/repositories/userRepository";
import * as tokenRepo from "@/lib/repositories/verificationTokenRepository";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const token = typeof body === "object" && body && "token" in body ? String(body.token) : "";
  if (!token) {
    return NextResponse.json({ error: "الرمز مطلوب" }, { status: 400 });
  }

  const validToken = tokenRepo.findValidByToken(token, "email_verify");
  if (!validToken) {
    return NextResponse.json(
      { error: "رابط التأكيد غير صالح أو منتهي الصلاحية" },
      { status: 400 }
    );
  }

  userRepo.markEmailVerified(validToken.userId);
  tokenRepo.markUsed(validToken.id);

  return NextResponse.json({ message: "تم تأكيد بريدك الإلكتروني بنجاح" });
}
