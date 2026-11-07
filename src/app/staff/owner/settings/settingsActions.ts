"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/server/auth/currentStaff";
import {
  ARRIVE_EARLY_MINUTES_OPTIONS,
  CHECK_IN_PROMPT_MINUTES_OPTIONS,
  DEPOSIT_PERCENT_OPTIONS,
  FREE_CANCELLATION_HOURS_OPTIONS,
  PREP_MINUTES_OPTIONS,
} from "@/server/ownerSettings";

export interface SettingsActionState {
  error?: string;
}

const SETTINGS_PATH = "/staff/owner/settings";

const saveSettingsSchema = z.object({
  depositPercent: z.coerce.number().refine((v) => DEPOSIT_PERCENT_OPTIONS.includes(v as 10 | 20 | 30)),
  freeCancellationHours: z.coerce.number().refine((v) => FREE_CANCELLATION_HOURS_OPTIONS.includes(v as 12 | 24 | 48)),
  arriveEarlyMinutes: z.coerce.number().refine((v) => ARRIVE_EARLY_MINUTES_OPTIONS.includes(v as 0 | 5 | 10 | 15)),
  checkInPromptAfterMinutes: z.coerce.number().refine((v) => CHECK_IN_PROMPT_MINUTES_OPTIONS.includes(v as 10 | 15 | 20)),
  serviceIds: z.array(z.string().min(1)),
  prepMinutesByService: z.array(z.coerce.number().refine((v) => PREP_MINUTES_OPTIONS.includes(v as 0 | 5 | 10 | 15 | 20))),
});

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function saveOwnerSettings(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "OWNER") return { error: "You're not allowed to do that." };

  const parsed = saveSettingsSchema.safeParse({
    depositPercent: formData.get("depositPercent"),
    freeCancellationHours: formData.get("freeCancellationHours"),
    arriveEarlyMinutes: formData.get("arriveEarlyMinutes"),
    checkInPromptAfterMinutes: formData.get("checkInPromptAfterMinutes"),
    serviceIds: formData.getAll("serviceId"),
    prepMinutesByService: formData.getAll("prepMinutes"),
  });
  if (!parsed.success) return { error: GENERIC_ERROR };

  const { serviceIds, prepMinutesByService, ...settings } = parsed.data;
  if (serviceIds.length !== prepMinutesByService.length) return { error: GENERIC_ERROR };

  await db.$transaction([
    db.settings.updateMany({ data: settings }),
    ...serviceIds.map((serviceId, index) =>
      db.service.update({ where: { id: serviceId }, data: { prepMinutes: prepMinutesByService[index] } }),
    ),
  ]);

  revalidatePath(SETTINGS_PATH);
  return {};
}
