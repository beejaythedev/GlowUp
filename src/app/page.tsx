export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-bg px-6 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-text">
        GlowUp Salons
      </h1>
      <p className="mt-2 max-w-sm text-text-muted">
        Booking v1 is under construction. See{" "}
        <a href="/dev/tokens" className="font-medium text-primary">
          /dev/tokens
        </a>{" "}
        for the design system.
      </p>
    </main>
  );
}
