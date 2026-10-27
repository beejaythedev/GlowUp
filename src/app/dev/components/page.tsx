"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Chip } from "@/components/ui/Chip";
import { CustomerShell } from "@/components/layout/CustomerShell";
import { StaffShell } from "@/components/layout/StaffShell";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-text">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function PreviewFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border">
      <div className="border-b border-border bg-bg px-4 py-2 text-xs font-semibold text-text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ComponentsPage() {
  const [selectedChip, setSelectedChip] = useState("any");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-text">
        Base components
      </h1>
      <p className="mt-2 text-text-muted">
        Every shared component from docs/ROADMAP.md M0-5. All touch targets
        are at least 44px and every control is reachable and operable with a
        keyboard.
      </p>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Primary · md</Button>
          <Button size="lg">Primary · lg</Button>
          <Button variant="secondary">Secondary · md</Button>
          <Button variant="secondary" size="lg">
            Secondary · lg
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <h3 className="text-lg font-bold text-text">Knotless braids</h3>
          <p className="mt-1 text-sm text-text-muted">
            4–5 hrs · ₦5,000 deposit
          </p>
        </Card>
      </Section>

      <Section title="Input">
        <div className="flex max-w-sm flex-col gap-4">
          <Input label="Phone number" placeholder="0803 000 0000" type="tel" />
          <Input
            label="Phone number"
            defaultValue="0803"
            error="Enter a valid Nigerian number"
          />
          <Input
            label="Name"
            hint="As it should appear on the booking"
            placeholder="Chioma Okafor"
          />
        </div>
      </Section>

      <Section title="StatusBadge">
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="booked">Booked</StatusBadge>
          <StatusBadge status="checkedInEarly">Checked in, early</StatusBadge>
          <StatusBadge status="waiting">Waiting 6 min</StatusBadge>
          <StatusBadge status="inService">In service</StatusBadge>
          <StatusBadge status="done">Done</StatusBadge>
          <StatusBadge status="noShow">No-show</StatusBadge>
          <StatusBadge status="requested">Requested</StatusBadge>
        </div>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "any", label: "Any available" },
            { id: "blessing", label: "Blessing" },
            { id: "zainab", label: "Zainab" },
            { id: "ronke", label: "Ronke" },
          ].map((option) => (
            <Chip
              key={option.id}
              selected={selectedChip === option.id}
              onClick={() => setSelectedChip(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="CustomerShell">
        <PreviewFrame label="Phone layout, 844px tall">
          <div className="h-[520px] overflow-y-auto bg-bg">
            <CustomerShell>
              <div className="flex-1 p-6">
                <p className="text-sm font-semibold text-text-muted">
                  GlowUp
                </p>
                <h3 className="mt-2 text-2xl font-extrabold tracking-tight">
                  Book an appointment
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Content stays centered at phone width even on a wide
                  screen.
                </p>
              </div>
            </CustomerShell>
          </div>
        </PreviewFrame>
      </Section>

      <Section title="StaffShell">
        <PreviewFrame label="Top nav, desktop/tablet">
          <StaffShell
            roleLabel="Reception"
            branchName="Lekki branch"
            staffName="Ada"
            signOutHref="#"
          >
            <p className="text-text-muted">
              Page content renders below the top nav, centered up to
              1360px.
            </p>
          </StaffShell>
        </PreviewFrame>
      </Section>
    </main>
  );
}
