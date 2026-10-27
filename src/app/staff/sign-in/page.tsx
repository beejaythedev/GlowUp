import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Staff sign in — GlowUp Salons",
};

// Reads the session cookie on every request, to skip sign-in if already in.
export const instant = false;

export default async function StaffSignInPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token && verifySessionToken(token)) {
    redirect("/staff");
  }

  return <SignInForm />;
}
