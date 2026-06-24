import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { withAuth } from "@/lib/withAuth";
import { enforceEmailVerified } from "@/lib/guards";

// أمان أساسي لرفع الملفات: حد أقصى للحجم ونوع ملفات محدد
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 ميجابايت
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export const POST = withAuth(async (request, auth) => {
  const verifyBlock = enforceEmailVerified(auth.userId);
  if (verifyBlock) return verifyBlock;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "حجم الملف يجب ألا يتجاوز 5 ميجابايت" },
      { status: 400 }
    );
  }

  const extension = ALLOWED_MIME_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "نوع الملف غير مدعوم. الأنواع المسموحة: PDF، JPG، PNG" },
      { status: 400 }
    );
  }

  await mkdir(UPLOADS_DIR, { recursive: true });

  // اسم ملف عشوائي تماماً (لا نعتمد على اسم الملف الأصلي) لمنع أي
  // محاولة path traversal أو تخمين مسارات ملفات مستخدمين آخرين
  const randomName = `${auth.userId}-${crypto.randomBytes(16).toString("hex")}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, randomName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return NextResponse.json({
    attachmentPath: randomName,
    originalName: file.name,
  });
});
