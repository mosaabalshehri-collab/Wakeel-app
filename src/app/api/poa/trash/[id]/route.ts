import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";
import * as activityRepo from "@/lib/repositories/activityRepository";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const DELETE = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const existing = poaRepo.findDeletedById(poaId, auth.userId);
  if (!existing) {
    return NextResponse.json(
      { error: "الوكالة غير موجودة في سلة المحذوفات" },
      { status: 404 }
    );
  }

  poaRepo.hardDelete(poaId, auth.userId);

  // حذف الملف المرفق فعلياً من القرص إن وجد. لا نوقف الطلب لو فشل
  // الحذف الفعلي (مثلاً الملف غير موجود أصلاً) — السجل في قاعدة
  // البيانات حُذف بنجاح، وهذا هو الجزء الأهم بالنسبة للمستخدم
  if (existing.attachmentPath) {
    try {
      await unlink(path.join(UPLOADS_DIR, existing.attachmentPath));
    } catch {
      // الملف غير موجود أو تعذر حذفه — لا يؤثر على نجاح الطلب
    }
  }

  activityRepo.log(
    auth.userId,
    "delete",
    null,
    `حذف وكالة رقم ${existing.poaNumber} نهائياً من سلة المحذوفات`
  );

  return NextResponse.json({ success: true });
});
