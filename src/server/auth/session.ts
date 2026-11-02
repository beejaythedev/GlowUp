import { createHmac, timingSafeEqual } from "node:crypto";
import type { StaffRole } from "@/generated/prisma/enums";

export const SESSION_COOKIE_NAME = "glowup_staff_session";
/** "Keep me signed in" vs a browser-session-only cookie. */
export const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_SESSION_SECONDS = 24 * 60 * 60;

export interface SessionPayload {
  staffId: string;
  role: StaffRole;
  branchId: string | null;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(
  staff: { id: string; role: StaffRole; branchId: string | null },
  options: { rememberMe: boolean; now?: Date } = { rememberMe: false },
): string {
  const now = options.now ?? new Date();
  const ttlSeconds = options.rememberMe ? REMEMBERED_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const payload: SessionPayload = {
    staffId: staff.id,
    role: staff.role,
    branchId: staff.branchId,
    expiresAt: now.getTime() + ttlSeconds * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Verifies the signature and expiry. Never throws on malformed input. */
export function verifySessionToken(token: string, now: Date = new Date()): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || payload.expiresAt < now.getTime()) return null;
    if (typeof payload.staffId !== "string" || typeof payload.role !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
