import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Staff — GlowUp Salons",
};

// Reads the session cookie and the signed-in staff member on every request.
export const instant = false;

/**
 * Placeholder landing page proving sign-in works end to end. M4-2 replaces
 * this with the real role-based destinations (reception/stylist/manager/owner).
 */
export default async function StaffHomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session) redirect("/staff/sign-in");

  const staff = await db.staff.findUnique({ where: { id: session.staffId } });
  if (!staff || staff.status === "REMOVED") redirect("/staff/sign-in");

  return (
    <CustomerShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">You&apos;re signed in, {staff.name}</h1>
        <p className="text-sm text-text-muted">
          Role: {staff.role}
          {staff.branchId ? ` · Branch-scoped` : " · All branches"}
        </p>
        <p className="max-w-xs text-sm text-text-muted">
          The real reception, stylist, manager and owner home screens arrive in later
          milestones.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </CustomerShell>
  );
}
