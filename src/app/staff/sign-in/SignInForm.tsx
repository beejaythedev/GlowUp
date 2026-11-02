"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <CustomerShell>
      <header className="flex items-center justify-between px-6 pt-5">
        <Link
          href="/"
          aria-label="Back"
          className="-ml-3 flex h-11 w-11 items-center justify-center text-text"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="inline-flex min-h-7 items-center rounded-full bg-brand-navy px-3 text-xs font-bold tracking-wide text-white">
          STAFF
        </span>
      </header>

      <div className="flex flex-col gap-2.5 px-6 pt-8">
        <div
          aria-hidden="true"
          className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="6" cy="7" r="3" />
            <circle cx="6" cy="17" r="3" />
            <path d="M8.5 8.5L20 18M8.5 15.5L20 6" />
          </svg>
        </div>
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
          Welcome back
        </h1>
        <p className="text-[15px] leading-relaxed text-text-muted">
          Sign in to see today&apos;s schedule. For receptionists, stylists, managers and
          the owner.
        </p>
      </div>

      <form action={formAction} className="flex flex-1 flex-col gap-4 px-6 pt-7">
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="username"
          placeholder="0803 000 0000"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="staff-password" className="text-sm font-semibold text-text-muted">
            Password
          </label>
          <div className="flex h-[52px] items-center rounded-input border border-border-strong bg-surface pr-1.5 pl-4">
            <input
              id="staff-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base text-text outline-none"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((shown) => !shown)}
              className="flex h-11 w-11 items-center justify-center text-text-muted"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>

        <label className="flex min-h-11 items-center gap-2.5 text-sm text-text">
          {/* An unchecked checkbox sends nothing at all, so a hidden "false"
              goes first — the checked box's "true" comes after it in the
              form data and wins. */}
          <input type="hidden" name="rememberMe" value="false" />
          <input
            type="checkbox"
            name="rememberMe"
            value="true"
            defaultChecked
            className="h-5 w-5 accent-primary"
          />
          Keep me signed in on this device
        </label>

        <p className="text-[13px] leading-relaxed text-text-muted">
          Forgot your password? Ask your branch manager to reset it.
        </p>

        {state.error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {state.error}
          </p>
        )}

        <div className="flex-1" />

        <footer className="flex flex-col gap-3.5 pb-7">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <div className="text-center text-[13px] text-text-muted">
            Customers don&apos;t need an account.{" "}
            <Link href="/book" className="font-bold text-primary">
              Book now
            </Link>
          </div>
        </footer>
      </form>
    </CustomerShell>
  );
}
