import { verifyPassword } from "./password";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface SignInAttemptInput {
  passwordHash: string;
  failedSignInAttempts: number;
  lockedUntil: Date | null;
  passwordAttempt: string;
  now?: Date;
}

export type SignInAttemptResult =
  | { outcome: "LOCKED"; retryAt: Date }
  | { outcome: "WRONG_PASSWORD"; failedSignInAttempts: number; lockedUntil: Date | null }
  | { outcome: "SUCCESS" };

/**
 * Pure sign-in decision, separate from the DB write and password check's own
 * crypto cost. An active lock refuses even the correct password — otherwise
 * a lock wouldn't actually stop repeated attempts. Reaching MAX_ATTEMPTS sets
 * a 15-minute lock and resets the counter, so it starts fresh once the lock
 * expires.
 */
export function evaluateSignInAttempt(input: SignInAttemptInput): SignInAttemptResult {
  const now = input.now ?? new Date();

  if (input.lockedUntil && input.lockedUntil > now) {
    return { outcome: "LOCKED", retryAt: input.lockedUntil };
  }

  if (verifyPassword(input.passwordAttempt, input.passwordHash)) {
    return { outcome: "SUCCESS" };
  }

  const failedSignInAttempts = input.failedSignInAttempts + 1;
  if (failedSignInAttempts >= MAX_ATTEMPTS) {
    return {
      outcome: "WRONG_PASSWORD",
      failedSignInAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000),
    };
  }
  return { outcome: "WRONG_PASSWORD", failedSignInAttempts, lockedUntil: null };
}
