"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { signOut } from "@/app/staff/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { maskPhone } from "@/lib/bookingReference";
import type { StaffRole, StaffStatus } from "@/generated/prisma/enums";
import { formatRoleLabel, formatStaffStatusLabel } from "@/server/staffAccess";
import {
  addStaffMember,
  removeStaffAccess,
  resetStaffPassword,
  restoreStaffAccess,
  updateStaffRoleAndBranch,
  type StaffActionState,
} from "./staffActions";

export interface StaffRow {
  id: string;
  name: string;
  role: StaffRole;
  branchId: string | null;
  branchName: string;
  phone: string;
  status: StaffStatus;
}

export interface BranchOption {
  id: string;
  name: string;
}

export interface StaffAccessViewProps {
  ownerName: string;
  ownerId: string;
  staff: StaffRow[];
  branches: BranchOption[];
}

const CREATABLE_ROLES: { value: StaffRole; label: string }[] = [
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "BRANCH_MANAGER", label: "Branch manager" },
  { value: "STYLIST", label: "Stylist" },
];

export function StaffAccessView({ ownerName, ownerId, staff, branches }: StaffAccessViewProps) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [addFormOpen, setAddFormOpen] = useState(false);

  const visibleStaff = branchFilter === "all" ? staff : staff.filter((s) => s.branchId === branchFilter);

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-6 py-3 text-white">
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="text-xl font-extrabold tracking-tight">GlowUp</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-brand-navy">Owner</span>
          <Link href="/staff/owner" className="text-sm text-nav-muted hover:text-white">
            Overview
          </Link>
          <span className="text-sm font-bold text-white">Staff and access</span>
          <Link href="/staff/owner/settings" className="text-sm text-nav-muted hover:text-white">
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{ownerName}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-brand-navy">
            {ownerName.charAt(0).toUpperCase()}
          </span>
          <form action={signOut}>
            <button type="submit" className="text-[13px] text-nav-muted hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto flex max-w-[1360px] flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] font-extrabold tracking-tight">Staff and access</h1>
            <p className="text-sm text-text-muted">Choose who can sign in and what each person can see</p>
          </div>
          <Button onClick={() => setAddFormOpen((open) => !open)} type="button">
            + Add staff member
          </Button>
        </div>

        {addFormOpen && <AddStaffForm branches={branches} onDone={() => setAddFormOpen(false)} />}

        <div className="flex flex-wrap items-start gap-5">
          <section className="min-w-0 flex-[999_1_560px] rounded-card border border-border bg-surface p-1.5 pb-1.5">
            <div className="flex flex-wrap gap-1.5 px-3.5 py-2.5">
              <FilterChip label="All branches" selected={branchFilter === "all"} onClick={() => setBranchFilter("all")} />
              {branches.map((branch) => (
                <FilterChip
                  key={branch.id}
                  label={branch.name.replace("GlowUp ", "")}
                  selected={branchFilter === branch.id}
                  onClick={() => setBranchFilter(branch.id)}
                />
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-text-muted">
                    <th className="px-3.5 py-3">Name</th>
                    <th className="px-3.5 py-3">Role</th>
                    <th className="px-3.5 py-3">Branch</th>
                    <th className="px-3.5 py-3">Phone</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.map((member) => (
                    <StaffMemberRow key={member.id} member={member} branches={branches} ownerId={ownerId} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-card border border-border bg-surface p-5">
            <h2 className="text-[17px] font-extrabold">What each role can see</h2>
            <RoleExplainer title="Stylist" description="Only their own appointments, today and tomorrow." />
            <RoleExplainer title="Receptionist" description="Their branch's schedule. Can add, move and check in bookings." />
            <RoleExplainer title="Branch manager" description="Everything for their own branch, including deposits and reports." />
            <RoleExplainer title="Owner" description="All four branches, staff access and settings." />
          </aside>
        </div>
      </main>
    </div>
  );
}

function RoleExplainer({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-bold">{title}</span>
      <span className="text-[13px] leading-relaxed text-text-muted">{description}</span>
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-bold ${
        selected ? "bg-brand-navy text-white" : "border border-border-strong text-text"
      }`}
    >
      {label}
    </button>
  );
}

const addStaffInitialState: StaffActionState = {};

function AddStaffForm({ branches, onDone }: { branches: BranchOption[]; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(addStaffMember, addStaffInitialState);
  const succeededRef = useRef(false);

  useEffect(() => {
    if (state !== addStaffInitialState && !state.error && !succeededRef.current) {
      succeededRef.current = true;
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-5">
      <h2 className="text-base font-extrabold">Add staff member</h2>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-danger-text">
          {state.error}
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <Input label="Name" name="name" required />
        <Input label="Phone number" name="phone" type="tel" placeholder="0803 123 4567" required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text-muted" htmlFor="add-staff-role">
            Role
          </label>
          <select id="add-staff-role" name="role" required className="h-[52px] rounded-input border border-border-strong bg-surface px-4 text-base text-text">
            {CREATABLE_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text-muted" htmlFor="add-staff-branch">
            Branch
          </label>
          <select id="add-staff-branch" name="branchId" required className="h-[52px] rounded-input border border-border-strong bg-surface px-4 text-base text-text">
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add staff member"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

const editInitialState: StaffActionState = {};
const resetInitialState: StaffActionState = {};
const accessInitialState: StaffActionState = {};

function StaffMemberRow({
  member,
  branches,
  ownerId,
}: {
  member: StaffRow;
  branches: BranchOption[];
  ownerId: string;
}) {
  const [editing, setEditing] = useState(false);
  const isSelf = member.id === ownerId;
  const isRemoved = member.status === "REMOVED";

  const [editState, editAction, editPending] = useActionState(updateStaffRoleAndBranch, editInitialState);
  const [resetState, resetAction, resetPending] = useActionState(resetStaffPassword, resetInitialState);
  const accessAction = isRemoved ? restoreStaffAccess : removeStaffAccess;
  const [accessState, accessActionDispatch, accessPending] = useActionState(accessAction, accessInitialState);

  if (editing) {
    return (
      <tr className="border-b border-border bg-primary-tint/30">
        <td className="px-3.5 py-3 font-bold">{member.name}</td>
        <td colSpan={5} className="px-3.5 py-3">
          <form action={editAction} onSubmit={() => setEditing(false)} className="flex flex-wrap items-center gap-2.5">
            <input type="hidden" name="staffId" value={member.id} />
            {editState.error && <p className="w-full text-sm font-semibold text-danger-text">{editState.error}</p>}
            <select name="role" defaultValue={member.role} className="h-11 rounded-input border border-border-strong bg-surface px-3 text-sm">
              {CREATABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <select name="branchId" defaultValue={member.branchId ?? ""} className="h-11 rounded-input border border-border-strong bg-surface px-3 text-sm">
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={editPending} className="text-sm font-bold text-primary disabled:opacity-50">
              {editPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-text-muted">
              Cancel
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border">
      <td className="px-3.5 py-3 font-bold">{member.name}</td>
      <td className="px-3.5 py-3">
        <RoleBadge role={member.role} />
      </td>
      <td className="px-3.5 py-3">{member.branchName}</td>
      <td className="px-3.5 py-3">{maskPhone(member.phone)}</td>
      <td className={`px-3.5 py-3 font-semibold ${statusTextClass(member.status)}`}>{formatStaffStatusLabel(member.status)}</td>
      <td className="px-3.5 py-3 text-right text-sm">
        {isSelf ? (
          <span className="text-text-muted">—</span>
        ) : isRemoved ? (
          <form action={accessActionDispatch} className="inline">
            <input type="hidden" name="staffId" value={member.id} />
            <button type="submit" disabled={accessPending} className="font-semibold text-primary disabled:opacity-50">
              {accessPending ? "Restoring…" : "Restore"}
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setEditing(true)} className="font-semibold text-primary">
              Edit
            </button>
            <span className="text-text-muted">·</span>
            <form action={resetAction} className="inline">
              <input type="hidden" name="staffId" value={member.id} />
              <button type="submit" disabled={resetPending} className="font-semibold text-primary disabled:opacity-50">
                {resetPending ? "Sending…" : member.status === "INVITED" ? "Resend invite" : "Reset password"}
              </button>
            </form>
            <span className="text-text-muted">·</span>
            <form action={accessActionDispatch} className="inline">
              <input type="hidden" name="staffId" value={member.id} />
              <button type="submit" disabled={accessPending} className="font-semibold text-danger-text disabled:opacity-50">
                {accessPending ? "Removing…" : "Remove"}
              </button>
            </form>
          </div>
        )}
        {(editState.error || resetState.error || accessState.error) && (
          <p className="mt-1 text-xs font-semibold text-danger-text">
            {editState.error || resetState.error || accessState.error}
          </p>
        )}
      </td>
    </tr>
  );
}

function statusTextClass(status: StaffStatus): string {
  if (status === "ACTIVE") return "text-success-text";
  if (status === "INVITED") return "text-warning-text";
  return "text-text-muted";
}

function RoleBadge({ role }: { role: StaffRole }) {
  const styles: Record<StaffRole, string> = {
    RECEPTIONIST: "bg-primary-tint text-primary-dark",
    BRANCH_MANAGER: "bg-brand-navy text-white",
    STYLIST: "bg-disabled-bg text-disabled-text",
    OWNER: "bg-accent text-brand-navy",
  };
  return <span className={`rounded-[10px] px-2.5 py-1 text-xs font-bold ${styles[role]}`}>{formatRoleLabel(role)}</span>;
}
