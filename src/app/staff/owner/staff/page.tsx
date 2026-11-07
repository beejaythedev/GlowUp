import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffSection } from "@/server/auth/requireStaffSection";
import { StaffAccessView } from "./StaffAccessView";

export const metadata: Metadata = {
  title: "Staff and access — GlowUp Salons",
};

// Reads live staff/invite status on every request.
export const instant = false;

export default async function StaffAccessPage() {
  const owner = await requireStaffSection("owner");

  const [staff, branches] = await Promise.all([
    db.staff.findMany({ orderBy: { createdAt: "asc" } }),
    db.branch.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const branchName = (branchId: string | null) => branches.find((b) => b.id === branchId)?.name ?? "—";

  return (
    <StaffAccessView
      ownerName={owner.name}
      ownerId={owner.id}
      staff={staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        branchId: s.branchId,
        branchName: branchName(s.branchId),
        phone: s.phone,
        status: s.status,
      }))}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
