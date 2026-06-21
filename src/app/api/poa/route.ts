import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";
import * as activityRepo from "@/lib/repositories/activityRepository";
import { createPoaSchema } from "@/lib/validation/schemas";

export const GET = withAuth((request, auth) => {
  const poas = poaRepo.findAllByUser(auth.userId);

  // فلترة اختيارية عبر query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search")?.toLowerCase();

  let filtered = poas;
  if (status) filtered = filtered.filter((p) => p.status === status);
  if (type) filtered = filtered.filter((p) => p.poaType === type);
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.poaNumber.toLowerCase().includes(search) ||
        p.principalName.toLowerCase().includes(search) ||
        p.agentName.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({ poas: filtered });
});

export const POST = withAuth(async (request, auth) => {
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
