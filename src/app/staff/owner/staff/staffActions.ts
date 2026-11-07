"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeNigerianPhone } from "@/lib/phone";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { hashPassword } from "@/server/auth/password";
import { generateTempPassword } from "@/server/auth/tempPassword";
import { messageSender } from "@/server/messages";
import { canManageStaffMember } from "@/server/staffAccess";

export interface StaffActionState {
  error?: string;
}

const STAFF_PATH = "/staff/owner/staff";
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function requireOwner() {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "OWNER") return null;
  return staff;
}

function tempPasswordMessage(body: string, phone: string): Promise<void> {
  return messageSender.send({ to: phone, body });
}

const addStaffSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  phone: z.string().trim().transform((value, ctx) => {
    const normalized = normalizeNigerianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian phone number." });
      return z.NEVER;
    }
    return normalized;
  }),
  role: z.enum(["STYLIST", "RECEPTIONIST", "BRANCH_MANAGER"]),
  branchId: z.string().min(1, "Choose a branch."),
});

export async function addStaffMember(_prevState: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: "You're not allowed to do that." };

  const parsed = addStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const { name, phone, role, branchId } = parsed.data;

  const existing = await db.staff.findUnique({ where: { phone } });
  if (existing) return { error: "Someone is already registered with that phone number." };

  const tempPassword = generateTempPassword();
  await db.staff.create({
    data: {
      name,
      phone,
      role,
      branchId,
      passwordHash: hashPassword(tempPassword),
      status: "INVITED",
    },
  });

  await tempPasswordMessage(
    `Welcome to GlowUp! Sign in at your branch's staff app with phone ${phone} and this temporary password: ${tempPassword}`,
    phone,
  );

  revalidatePath(STAFF_PATH);
  return {};
}

const updateRoleBranchSchema = z.object({
  staffId: z.string().min(1),
  role: z.enum(["STYLIST", "RECEPTIONIST", "BRANCH_MANAGER"]),
  branchId: z.string().min(1, "Choose a branch."),
});

export async function updateStaffRoleAndBranch(
  _prevState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: "You're not allowed to do that." };

  const parsed = updateRoleBranchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const { staffId, role, branchId } = parsed.data;

  if (!canManageStaffMember(staffId, owner.id)) return { error: "You can't change your own access from here." };

  await db.staff.update({ where: { id: staffId }, data: { role, branchId } });

  revalidatePath(STAFF_PATH);
  return {};
}

const staffIdSchema = z.object({ staffId: z.string().min(1) });

export async function resetStaffPassword(_prevState: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: "You're not allowed to do that." };

  const parsed = staffIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: GENERIC_ERROR };

  const staff = await db.staff.findUnique({ where: { id: parsed.data.staffId } });
  if (!staff) return { error: "Staff member not found." };
  if (!canManageStaffMember(staff.id, owner.id)) return { error: "You can't reset your own password from here." };

  const tempPassword = generateTempPassword();
  await db.staff.update({
    where: { id: staff.id },
    data: {
      passwordHash: hashPassword(tempPassword),
      failedSignInAttempts: 0,
      lockedUntil: null,
    },
  });

  const isFirstInvite = staff.status === "INVITED";
  await tempPasswordMessage(
    isFirstInvite
      ? `Welcome to GlowUp! Sign in at your branch's staff app with phone ${staff.phone} and this temporary password: ${tempPassword}`
      : `Your GlowUp staff password has been reset. New temporary password: ${tempPassword}`,
    staff.phone,
  );

  revalidatePath(STAFF_PATH);
  return {};
}

export async function removeStaffAccess(_prevState: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: "You're not allowed to do that." };

  const parsed = staffIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: GENERIC_ERROR };
  if (!canManageStaffMember(parsed.data.staffId, owner.id)) return { error: "You can't remove your own access." };

  await db.staff.update({ where: { id: parsed.data.staffId }, data: { status: "REMOVED" } });

  revalidatePath(STAFF_PATH);
  return {};
}

export async function restoreStaffAccess(_prevState: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const owner = await requireOwner();
  if (!owner) return { error: "You're not allowed to do that." };

  const parsed = staffIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: GENERIC_ERROR };
  if (!canManageStaffMember(parsed.data.staffId, owner.id)) return { error: "You can't restore your own access." };

  await db.staff.update({
    where: { id: parsed.data.staffId },
    data: { status: "ACTIVE", failedSignInAttempts: 0, lockedUntil: null },
  });

  revalidatePath(STAFF_PATH);
  return {};
}
