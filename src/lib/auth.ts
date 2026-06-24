import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/**
 * يقرأ سر توقيع الـ JWT من البيئة.
 *
 * أمان حرج: في بيئة الإنتاج لا نسمح إطلاقاً بسر افتراضي. لو كان
 * JWT_SECRET غير مضبوط أو قصيراً جداً، التطبيق يرفض الإقلاع (fail
 * fast) بدل أن يعمل بسر معروف للعالم — وهي حالة كان يمكن فيها لأي
 * شخص تزوير توكن صالح لأي مستخدم. في وضع التطوير فقط نستخدم سراً
 * افتراضياً ثابتاً لتسهيل التشغيل المحلي، مع طباعة تحذير.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret || secret.length < 32) {
    if (isProduction) {
      throw new Error(
        "JWT_SECRET غير مضبوط أو قصير جداً (مطلوب 32 حرفاً على الأقل). " +
          "التطبيق لن يعمل في الإنتاج بسر افتراضي. اضبط متغير البيئة JWT_SECRET."
      );
    }
    console.warn(
      "⚠️  JWT_SECRET غير مضبوط — يُستخدم سر تطوير افتراضي. لا تستخدم هذا في الإنتاج."
    );
    return "dev-only-insecure-secret-do-not-use-in-production";
  }

  return secret;
}

// نحلّ السر بشكل كسول (lazy) عند أول استخدام فعلي، لا عند تحميل
// الوحدة. السبب: أمر next build يعمل بـ NODE_ENV=production ويستورد
// وحدات المسارات، فلو رمينا الخطأ وقت التحميل لفشل البناء في أي
// بيئة CI لا يتوفر فيها JWT_SECRET. بهذا الشكل يبقى البناء سليماً،
// بينما أول طلب مصادقة فعلي في الإنتاج بلا سر صالح يفشل فوراً.
let cachedSecret: string | null = null;
function getJwtSecret(): string {
  if (cachedSecret === null) {
    cachedSecret = resolveJwtSecret();
  }
  return cachedSecret;
}

const TOKEN_EXPIRY = "7d";
export const AUTH_COOKIE_NAME = "wakeel_token";

export interface TokenPayload {
  userId: number;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}
