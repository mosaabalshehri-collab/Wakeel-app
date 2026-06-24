/**
 * Rate limiting بسيط بالذاكرة (in-memory) لحماية مسارات المصادقة من
 * هجمات التخمين (brute force).
 *
 * هذا حل مناسب لخادم Node.js واحد (single instance) — وهو وضع هذا
 * المشروع. عند النشر على بنية متعددة الخوادم (serverless/multi-instance)،
 * يجب استبداله بحل مشترك بين الخوادم مثل Redis، لأن كل خادم هنا يحتفظ
 * بعدّاد منفصل في ذاكرته الخاصة.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// تنظيف دوري للسجلات المنتهية حتى لا تتراكم في الذاكرة إلى الأبد
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * يتحقق من حد المحاولات لمفتاح معيّن (مثلاً IP أو IP+email) ويزيد العداد.
 * @param key معرّف فريد للمصدر (مثلاً عنوان IP)
 * @param maxAttempts العدد الأقصى من المحاولات المسموحة خلال النافذة الزمنية
 * @param windowSeconds طول النافذة الزمنية بالثواني
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): RateLimitResult {
  cleanupExpired();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * يستخرج عنوان IP العميل لاستخدامه في مفتاح الـ rate limiting.
 *
 * تحذير أمني: رؤوس مثل x-forwarded-for يستطيع العميل تزويرها بنفسه،
 * فيرسل قيمة مختلفة كل طلب ويتجاوز حد المحاولات. لذلك نثق بها فقط
 * عندما نعرف أن التطبيق منشور خلف بروكسي/منصة موثوقة تعيد كتابة هذا
 * الرأس (مثل Vercel أو Nginx مضبوط بشكل صحيح) — ويُفعّل ذلك صراحة
 * عبر متغير البيئة TRUST_PROXY=true.
 *
 * إن لم يكن TRUST_PROXY مفعّلاً، نتجاهل الرؤوس القابلة للتزوير
 * ونرجع مفتاحاً ثابتاً، فيصبح الحد عاماً (أصرم) بدل أن يكون قابلاً
 * للالتفاف عبر تزوير IP. الأمان هنا أهم من الدقة.
 */
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

export function getClientIp(request: Request): string {
  if (!TRUST_PROXY) {
    // لا نثق بأي رأس قابل للتزوير. مفتاح ثابت = حد عام صارم.
    return "shared";
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
