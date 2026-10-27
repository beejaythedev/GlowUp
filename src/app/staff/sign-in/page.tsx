import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import { roleHomePath } from "@/server/auth/roleHome";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Staff sign in — GlowUp Salons",
};

// Reads the session cookie on every request, to skip sign-in if already in.
export const instant = false;

export default async function StaffSignInPage() {
  const staff = await getCurrentStaff();
  if (staff) {
    redirect(roleHomePath(staff.role));
  }

  return <SignInForm />;
}
