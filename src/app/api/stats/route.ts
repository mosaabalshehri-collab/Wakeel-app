import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as poaRepo from "@/lib/repositories/poaRepository";

export const GET = withAuth((_request, auth) => {
  const stats = poaRepo.getStats(auth.userId);
  return NextResponse.json({ stats });
});
