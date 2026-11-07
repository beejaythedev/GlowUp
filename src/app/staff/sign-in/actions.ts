"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeNigerianPhone } from "@/lib/phone";
import { evaluateSignInAttempt } from "@/server/auth/lockout";
import { roleHomePath } from "@/server/auth/roleHome";
import {
  createSessionToken,
  REMEMBERED_SESSION_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";

const signInSchema = z.object({
  phone: z.string().trim().transform((value, ctx) => {
    const normalized = normalizeNigerianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter your phone number and password." });
      return z.NEVER;
    }
    return normalized;
  }),
  password: z.string().min(1, "Enter your phone number and password."),
  rememberMe: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export interface SignInState {
  error?: string;
}

// Same wording whether the phone isn't registered or the password is wrong —
// never tell an attacker which half of the pair was right.
const GENERIC_ERROR = "Phone number or password is incorrect.";

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const { phone, password, rememberMe } = parsed.data;

  const staff = await db.staff.findUnique({ where: { phone } });
  if (!staff || staff.status === "REMOVED") {
    return { error: GENERIC_ERROR };
  }

  const result = evaluateSignInAttempt({
    passwordHash: staff.passwordHash,
    failedSignInAttempts: staff.failedSignInAttempts,
    lockedUntil: staff.lockedUntil,
    passwordAttempt: password,
  });

  if (result.outcome === "LOCKED") {
    return {
      error: "Too many failed attempts. Ask your branch manager, or try again in 15 minutes.",
    };
  }

  if (result.outcome === "WRONG_PASSWORD") {
    await db.staff.update({
      where: { id: staff.id },
      data: {
        failedSignInAttempts: result.failedSignInAttempts,
        lockedUntil: result.lockedUntil,
      },
    });
    // This attempt is the one that just triggered the lock — say so, rather
    // than the generic error, so the staff member knows to stop trying.
    if (result.lockedUntil) {
      return {
        error: "Too many failed attempts. Ask your branch manager, or try again in 15 minutes.",
      };
    }
    return { error: GENERIC_ERROR };
  }

  await db.staff.update({
    where: { id: staff.id },
    data: {
      failedSignInAttempts: 0,
      lockedUntil: null,
      // First real sign-in with the temp password confirms the invite was
      // received (docs/ROADMAP.md, M7-3) — otherwise "Invite sent" would
      // never change even once someone's actually using the account.
      ...(staff.status === "INVITED" ? { status: "ACTIVE" as const } : {}),
    },
  });

  const token = createSessionToken(staff, { rememberMe });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBERED_SESSION_SECONDS } : {}),
  });

  redirect(roleHomePath(staff.role));
}
