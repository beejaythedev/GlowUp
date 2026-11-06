import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatLagosClockTime, lagosDateParts, lagosInstant } from "@/lib/lagosTime";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { buildDayReportCsv } from "@/server/managerToday";
import { canAccessStaffSection } from "@/server/permissions";
import { fetchBranchDayBookings, toManagerBookings } from "../managerData";

export async function GET() {
  const staff = await getCurrentStaff();
  if (!staff) return new NextResponse("Not signed in.", { status: 401 });
  if (!canAccessStaffSection(staff, "manager") || !staff.branchId) {
    return new NextResponse("Not allowed.", { status: 403 });
  }

  const branch = await db.branch.findUnique({ where: { id: staff.branchId } });
  if (!branch) return new NextResponse("Branch not found.", { status: 404 });

  const now = new Date();
  const today = lagosDateParts(now);
  const dayStart = lagosInstant(today.year, today.month, today.day, 0, 0);
  const dayEnd = lagosInstant(today.year, today.month, today.day, 24, 0);

  const stylists = await db.staff.findMany({
    where: { branchId: branch.id, role: "STYLIST", status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  const rows = await fetchBranchDayBookings(stylists.map((s) => s.id), dayStart, dayEnd);
  const bookings = toManagerBookings(rows, stylists).filter((b) => b.status !== "CANCELLED");

  const csv = buildDayReportCsv(bookings, formatLagosClockTime);
  const fileDate = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${branch.name.replace(/\s+/g, "-")}-${fileDate}.csv"`,
    },
  });
}
