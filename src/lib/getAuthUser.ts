import { NextRequest } from "next/server";
import { verifyToken, AUTH_COOKIE_NAME, type TokenPayload } from "./auth";

/** يستخرج بيانات المستخدم المسجل دخوله من الكوكي، أو null إن لم يكن مسجلاً */
export function getAuthUser(request: NextRequest): TokenPayload | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
