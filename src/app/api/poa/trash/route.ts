import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";

export const GET = withAuth((_request, auth) => {
  const poas = poaRepo.findDeletedByUser(auth.userId);
  return NextResponse.json({ poas, retentionDays: poaRepo.TRASH_RETENTION_DAYS });
});
