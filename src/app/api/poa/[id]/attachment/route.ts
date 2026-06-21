import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * يخدم ملف مرفق وكالة معيّنة، بعد التحقق من أن طالب الملف هو فعلاً
 * مالك الوكالة. هذا التحقق هو سبب عدم تقديم الملفات مباشرة من
 * مجلد public — أي شخص يعرف اسم الملف كان سيقدر يصل له بدون هذا الفحص.
 */
export const GET = withAuth(async (_request, auth, { params }: RouteParams) => {
  const { id } = await params;
  const poaId = Number(id);
  if (!Number.isInteger(poaId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  const poa = poaRepo.findById(poaId, auth.userId);
  if (!poa || !poa.attachmentPath) {
    return NextResponse.json({ error: "لا يوجد ملف مرفق" }, { status: 404 });
  }

  const extension = poa.attachmentPath.split(".").pop() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension] ?? "application/octet-stream";

  try {
    const filePath = path.join(UPLOADS_DIR, poa.attachmentPath);
    const fileBuffer = await readFile(filePath);
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          poa.attachmentOriginalName ?? "attachment"
        )}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 });
  }
});
