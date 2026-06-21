import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as userRepo from "@/lib/repositories/userRepository";

export const GET = withAuth((_request, auth) => {
  const user = userRepo.findById(auth.userId);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  });
});
