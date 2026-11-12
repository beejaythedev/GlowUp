export interface DelayMessageParams {
  customerFirstName: string;
  stylistName: string;
  serviceName: string;
  branchName: string;
  originalWhenLabel: string;
  laterWhenLabel: string | null;
  otherStylistAvailable: boolean;
  bookingReference: string;
  choiceUrl: string;
}

/**
 * Sent when a requested stylist is running over and this booking may start
 * late (docs/ROADMAP.md, M8-5). Only offers the options that are actually
 * available — a wording with no real choices behind it would be worse than
 * reception just calling.
 */
export function formatDelayMessage(params: DelayMessageParams): string {
  const {
    customerFirstName, stylistName, serviceName, branchName,
    originalWhenLabel, laterWhenLabel, otherStylistAvailable, bookingReference, choiceUrl,
  } = params;

  const intro =
    `Hi ${customerFirstName}, ${stylistName} is running a little behind, so your ${serviceName} ` +
    `at ${branchName} (${originalWhenLabel}) may start late.`;

  const options: string[] = [];
  if (laterWhenLabel) options.push(`a later time with ${stylistName} (${laterWhenLabel})`);
  if (otherStylistAvailable) options.push(`${originalWhenLabel} with another stylist`);

  const offer =
    options.length > 0
      ? ` We can offer ${options.join(" or ")} — choose here: ${choiceUrl}`
      : " Please call us to rearrange.";

  return `${intro}${offer} Ref ${bookingReference}.`;
}
