import type { PrismaClient } from "@/generated/prisma/client";
import { messageSender } from "@/server/messages";

export interface ProcessDueMessagesResult {
  sentCount: number;
}

/**
 * Sends every due, still-pending message (`/api/jobs/run`, M8-4). Claims
 * each one atomically (the `updateMany` only succeeds if it's still
 * `PENDING`) before sending, so two overlapping runs of this job — a slow
 * external scheduler firing twice, say — can't send the same message twice.
 */
export async function processDueMessages(
  db: Pick<PrismaClient, "message">,
  now: Date = new Date(),
): Promise<ProcessDueMessagesResult> {
  const due = await db.message.findMany({
    where: { status: "PENDING", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
  });

  let sentCount = 0;
  for (const message of due) {
    const claim = await db.message.updateMany({
      where: { id: message.id, status: "PENDING" },
      data: { status: "SENT", sentAt: now },
    });
    if (claim.count === 0) continue;

    await messageSender.send({ to: message.to, body: message.body });
    sentCount++;
  }

  return { sentCount };
}
