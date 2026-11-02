import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./session";
import type { Staff } from "@/generated/prisma/client";

/** The signed-in staff member for this request, or null if not signed in (or removed). */
export async function getCurrentStaff(): Promise<Staff | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) return null;

  const staff = await db.staff.findUnique({ where: { id: session.staffId } });
  if (!staff || staff.status === "REMOVED") return null;
  return staff;
}
