import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";
import * as activityRepo from "@/lib/repositories/activityRepository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  let restored;
  try {
    restored = poaRepo.restore(poaId, auth.userId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر استعادة الوكالة";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (!restored) {
    return NextResponse.json(
      { error: "الوكالة غير موجودة في سلة المحذوفات" },
      { status: 404 }
    );
  }

  activityRepo.log(
    auth.userId,
    "update",
    restored.id,
    `استعادة وكالة رقم ${restored.poaNumber} من سلة المحذوفات`
  );

  return NextResponse.json({ poa: restored });
});
