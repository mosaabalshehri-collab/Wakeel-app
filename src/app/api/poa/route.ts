import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";
import * as activityRepo from "@/lib/repositories/activityRepository";
import { createPoaSchema } from "@/lib/validation/schemas";
import { enforceEmailVerified, enforcePoaQuota } from "@/lib/guards";

export const GET = withAuth((request, auth) => {
  // التصفية تتم على مستوى قاعدة البيانات (لا في الذاكرة): نمرر
  // معاملات الاستعلام مباشرة إلى الـ repository فيبني SQL مناسباً
  // ويعيد فقط الصفوف المطلوبة.
  const { searchParams } = new URL(request.url);
  const poas = poaRepo.findByUserFiltered(auth.userId, {
    status: searchParams.get("status") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ poas });
});

export const POST = withAuth(async (request, auth) => {
  // حاجز تأكيد البريد (إن كان مفعّلاً) ثم حد عدد الوكالات لكل مستخدم
  const verifyBlock = enforceEmailVerified(auth.userId);
  if (verifyBlock) return verifyBlock;

  const quotaBlock = enforcePoaQuota(auth.userId);
  if (quotaBlock) return quotaBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const parsed = createPoaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (poaRepo.existsByNumber(auth.userId, data.poaNumber)) {
    return NextResponse.json(
      { error: "يوجد لديك وكالة مسجلة مسبقاً بنفس الرقم" },
      { status: 409 }
    );
  }

  const poa = poaRepo.create(auth.userId, {
    ...data,
    principalIdNumber: data.principalIdNumber || undefined,
    principalPhone: data.principalPhone || undefined,
    agentIdNumber: data.agentIdNumber || undefined,
    agentPhone: data.agentPhone || undefined,
    scopeDescription: data.scopeDescription || undefined,
    expiryDate: data.expiryDate || undefined,
    notes: data.notes || undefined,
  });

  activityRepo.log(auth.userId, "create", poa.id, `إضافة وكالة رقم ${poa.poaNumber}`);

  return NextResponse.json({ poa }, { status: 201 });
});
