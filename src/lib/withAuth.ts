import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "./getAuthUser";
import type { TokenPayload } from "./auth";

/**
 * يغلف أي API route handler بفحص مصادقة إجباري.
 *
 * بدل تكرار "تحقق من المستخدم ثم ارجع 401" يدوياً في كل دالة (نمط
 * كان مكرراً سابقاً عبر 8 دوال مختلفة)، هذا الغلاف يضمن أن أي handler
 * مكتوب بهذا النمط *لا يمكن* أن يُستدعى منطقه الفعلي بدون مستخدم
 * مُصادَق عليه — الفحص جزء من البنية، وليس خطوة يمكن نسيانها عند
 * إضافة route جديد.
 *
 * الاستخدام بدون معاملات مسار ديناميكية:
 *   export const GET = withAuth((request, auth) => {
 *     // auth.userId متوفر هنا دائماً ومضمون
 *   });
 *
 * مع معاملات مسار ديناميكية (مثل [id]):
 *   interface RouteParams { params: Promise<{ id: string }> }
 *   export const PATCH = withAuth<RouteParams>((request, auth, context) => {
 *     const { id } = await context.params;
 *   });
 *
 * ملاحظة: Context تُجعل اختيارية (?) لتطابق توقع Next.js لتوقيع route
 * handlers، حتى للمسارات التي لا تحتاج معاملات ديناميكية.
 */
export function withAuth<Context = unknown>(
  handler: (
    request: NextRequest,
    auth: TokenPayload,
    context: Context
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, context?: Context) => {
    const auth = getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return handler(request, auth, context as Context);
  };
}
