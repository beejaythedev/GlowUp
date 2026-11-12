import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processDueMessages } from "@/server/messageJob";

/**
 * Called every 10 minutes by a free external scheduler (docs/TECH_STACK.md
 * — Vercel Hobby cron only runs daily, so this can't rely on that). Protected
 * by a shared secret rather than real auth, since nothing here is staff- or
 * customer-specific.
 */
async function run(request: Request) {
  const secret = request.headers.get("x-jobs-secret");
  if (!secret || secret !== process.env.JOBS_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueMessages(db);
  return NextResponse.json({ sent: result.sentCount });
}

export const GET = run;
export const POST = run;
