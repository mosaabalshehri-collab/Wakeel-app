import { NextResponse } from "next/server";
import { withAuth } from "@/lib/withAuth";
import * as activityRepo from "@/lib/repositories/activityRepository";

export const GET = withAuth((request, auth) => {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 100) : 50;

  const entries = activityRepo.findRecentByUser(auth.userId, limit);
  return NextResponse.json({ entries });
});
