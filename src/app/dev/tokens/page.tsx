import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design tokens — dev",
};

type ColorToken = {
  name: string;
  bg: string;
  text?: string;
  use: string;
};

const colorTokens: ColorToken[] = [
  {
    name: "brand-navy",
    bg: "bg-brand-navy",
    text: "text-white",
    use: "Brand areas, staff top nav, dark summary cards",
  },
  {
    name: "primary",
    bg: "bg-primary",
    text: "text-white",
    use: 'Buttons, links, selected items, "in service"',
  },
  {
    name: "primary-dark",
    bg: "bg-primary-dark",
    text: "text-white",
    use: "Hover, text on primary-tint",
  },
  {
    name: "primary-tint",
    bg: "bg-primary-tint",
    text: "text-primary-dark",
    use: 'Selected chips and cards, "booked"',
  },
  {
    name: "accent",
    bg: "bg-accent",
    text: "text-white",
    use: "Avatars, owner badge, one highlight per screen",
  },
  {
    name: "now-line",
    bg: "bg-now-line",
    text: "text-white",
    use: "The current-time line on the schedule",
  },
  { name: "bg", bg: "bg-bg", text: "text-text", use: "Page background" },
  { name: "surface", bg: "bg-surface", text: "text-text", use: "Cards" },
  {
    name: "border",
    bg: "bg-border",
    text: "text-text",
    use: "Card borders, dividers",
  },
  {
    name: "border-strong",
    bg: "bg-border-strong",
    text: "text-text",
    use: "Inputs, secondary buttons",
  },
  { name: "text", bg: "bg-text", text: "text-white", use: "Main text" },
  {
    name: "text-muted",
    bg: "bg-text-muted",
    text: "text-white",
    use: "Labels, secondary text",
  },
  {
    name: "nav-muted",
    bg: "bg-nav-muted",
    text: "text-brand-navy",
    use: "Secondary text on navy",
  },
  {
    name: "success-tint",
    bg: "bg-success-tint",
    text: "text-success-text",
    use: "Deposit paid, checked in early, on track",
  },
  {
    name: "success-text",
    bg: "bg-success-text",
    text: "text-white",
    use: "Text on success-tint",
  },
  {
    name: "warning-tint",
    bg: "bg-warning-tint",
    text: "text-warning-text",
    use: "Waiting, needs attention",
  },
  {
    name: "warning-text",
    bg: "bg-warning-text",
    text: "text-white",
    use: "Text on warning-tint",
  },
  {
    name: "warning-border",
    bg: "bg-warning-border",
    text: "text-text",
    use: "Border on warning blocks",
  },
  {
    name: "danger-text",
    bg: "bg-danger-text",
    text: "text-white",
    use: "No-show, destructive actions",
  },
  {
    name: "danger-border",
    bg: "bg-danger-border",
    text: "text-white",
    use: "Border on danger blocks",
  },
  {
    name: "disabled-bg",
    bg: "bg-disabled-bg",
    text: "text-disabled-text",
    use: "Taken slots, busy stylists",
  },
  {
    name: "disabled-text",
    bg: "bg-disabled-text",
    text: "text-white",
    use: "Text on disabled-bg",
  },
];

const radiusTokens = [
  { name: "card", className: "rounded-card", note: "16-20px — cards" },
  { name: "input", className: "rounded-input", note: "14-16px — inputs" },
  {
    name: "full",
    className: "rounded-full",
    note: "Pills — buttons and chips",
  },
];

const weights = [
  { label: "400 Regular", className: "font-normal" },
  { label: "500 Medium", className: "font-medium" },
  { label: "600 Semibold", className: "font-semibold" },
  { label: "700 Bold", className: "font-bold" },
  { label: "800 Extrabold", className: "font-extrabold" },
];

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-text">
        Design tokens
      </h1>
      <p className="mt-2 text-text-muted">
        Every token from docs/DESIGN.md. Components must use these classes,
        never raw hex values.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-text">Colors</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colorTokens.map((token) => (
            <div
              key={token.name}
              className="rounded-card border border-border bg-surface p-4"
            >
              <div
                className={`flex h-16 items-center rounded-input px-3 ${token.bg} ${token.text ?? ""}`}
              >
                {token.name}
              </div>
              <p className="mt-2 text-sm text-text-muted">{token.use}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-text">
          Type — Plus Jakarta Sans
        </h2>
        <div className="mt-4 space-y-2 rounded-card border border-border bg-surface p-4">
          {weights.map((weight) => (
            <p key={weight.label} className={`text-lg ${weight.className}`}>
              {weight.label}: GlowUp Salons booking
            </p>
          ))}
          <p className="text-[11px] text-text-muted">
            Smallest allowed size, 11px — never go below this.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-text">Radii</h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {radiusTokens.map((radius) => (
            <div
              key={radius.name}
              className={`flex h-20 w-40 items-center justify-center border border-border-strong bg-primary-tint text-sm text-primary-dark ${radius.className}`}
            >
              {radius.note}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-text">Touch targets</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button className="h-11 min-w-11 rounded-full bg-primary px-6 font-semibold text-white">
            44px minimum
          </button>
          <button className="h-14 min-w-14 rounded-full bg-primary px-8 font-semibold text-white">
            52-60px — primary on phones
          </button>
        </div>
      </section>
    </main>
  );
}
