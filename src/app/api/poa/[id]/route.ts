import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";
import * as activityRepo from "@/lib/repositories/activityRepository";
import { updatePoaSchema } from "@/lib/validation/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const poa = poaRepo.findById(poaId, auth.userId);
  if (!poa) {
    return NextResponse.json({ error: "الوكالة غير موجودة" }, { status: 404 });
  }

  return NextResponse.json({ poa });
});

export const PATCH = withAuth(async (request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بيانات الطلب غير صالحة" }, { status: 400 });
  }

  const parsed = updatePoaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // نجلب الوكالة الحالية أولاً عشان نتحقق من التواريخ على القيم
  // الفعلية بعد الدمج، لا على بيانات الطلب فقط — لأن طلب PATCH قد
  // يرسل expiryDate بدون issueDate (أو العكس)، فالتحقق على مستوى
  // الـ schema وحده غير كافٍ لاكتشاف تعارض مع القيمة المخزّنة فعلاً
  const existing = poaRepo.findById(poaId, auth.userId);
  if (!existing) {
    return NextResponse.json({ error: "الوكالة غير موجودة" }, { status: 404 });
  }

  const effectiveIssueDate = data.issueDate ?? existing.issueDate;
  const effectiveExpiryDate =
    data.expiryDate !== undefined ? data.expiryDate : existing.expiryDate;

  if (
    effectiveExpiryDate &&
    effectiveIssueDate &&
    effectiveExpiryDate < effectiveIssueDate
  ) {
    return NextResponse.json(
      { error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ الإصدار أو يساويه" },
      { status: 400 }
    );
  }

  if (
    data.poaNumber &&
    poaRepo.existsByNumber(auth.userId, data.poaNumber, poaId)
  ) {
    return NextResponse.json(
      { error: "يوجد لديك وكالة مسجلة مسبقاً بنفس الرقم" },
      { status: 409 }
    );
  }

  const updated = poaRepo.update(poaId, auth.userId, {
    ...data,
    principalIdNumber: data.principalIdNumber || undefined,
    principalPhone: data.principalPhone || undefined,
    agentIdNumber: data.agentIdNumber || undefined,
    agentPhone: data.agentPhone || undefined,
    scopeDescription: data.scopeDescription || undefined,
    expiryDate: data.expiryDate || undefined,
    notes: data.notes || undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: "الوكالة غير موجودة" }, { status: 404 });
  }

  activityRepo.log(
    auth.userId,
    "update",
    updated.id,
    `تعديل وكالة رقم ${updated.poaNumber}`
  );

  return NextResponse.json({ poa: updated });
});

export const DELETE = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = poaRepo.findById(poaId, auth.userId);
  if (!existing) {
    return NextResponse.json({ error: "الوكالة غير موجودة" }, { status: 404 });
  }

  poaRepo.softDelete(poaId, auth.userId);
  activityRepo.log(
    auth.userId,
    "delete",
    null,
    `حذف وكالة رقم ${existing.poaNumber}`
  );

  return NextResponse.json({ success: true });
});
