import { db } from "@/lib/db";
import { formatLagosClockTime, formatLagosDateLabel } from "@/lib/lagosTime";

export const metadata = { title: "Messages (dev) — GlowUp Salons" };

// Reads live message state on every request.
export const instant = false;

/** What the console sender has logged, and what's still waiting to (M8-4) — there's no real SMS provider to check instead. */
export default async function DevMessagesPage() {
  const messages = await db.message.findMany({
    orderBy: { scheduledFor: "desc" },
    take: 100,
    include: { booking: { include: { customer: true, service: true } } },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-8">
      <h1 className="text-xl font-bold">Messages</h1>
      <p className="text-sm text-text-muted">
        Every message the console sender has sent or is waiting to send — newest scheduled time first. There&apos;s
        no real SMS provider in this practice project (CLAUDE.md), so this is the only record.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-text-muted">
              <th className="px-3.5 py-3">Scheduled for</th>
              <th className="px-3.5 py-3">Type</th>
              <th className="px-3.5 py-3">Customer</th>
              <th className="px-3.5 py-3">Status</th>
              <th className="px-3.5 py-3">Sent at</th>
              <th className="px-3.5 py-3">Body</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id} className="border-t border-border align-top">
                <td className="whitespace-nowrap px-3.5 py-3 font-semibold">
                  {formatLagosDateLabel(message.scheduledFor)}, {formatLagosClockTime(message.scheduledFor)}
                </td>
                <td className="whitespace-nowrap px-3.5 py-3">{message.type}</td>
                <td className="whitespace-nowrap px-3.5 py-3">
                  {message.booking.customer.name} · {message.to}
                </td>
                <td className="whitespace-nowrap px-3.5 py-3">
                  <StatusPill status={message.status} />
                </td>
                <td className="whitespace-nowrap px-3.5 py-3 text-text-muted">
                  {message.sentAt ? `${formatLagosDateLabel(message.sentAt)}, ${formatLagosClockTime(message.sentAt)}` : "—"}
                </td>
                <td className="max-w-[360px] px-3.5 py-3 text-text-muted">{message.body}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3.5 py-6 text-center text-text-muted">
                  No messages yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "PENDING" | "SENT" | "CANCELLED" }) {
  const styles = {
    PENDING: "bg-warning-tint text-warning-text",
    SENT: "bg-success-tint text-success-text",
    CANCELLED: "bg-disabled-bg text-disabled-text",
  }[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>{status}</span>;
}
