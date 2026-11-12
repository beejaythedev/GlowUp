export interface PhoneDepositMessageParams {
  customerFirstName: string;
  serviceName: string;
  branchName: string;
  whenLabel: string;
  depositLabel: string;
  bookingReference: string;
  payUrl: string;
}

/** Sent when reception books by phone (docs/ROADMAP.md, M8-3) — no hold timer, so no rush wording. */
export function formatPhoneDepositMessage(params: PhoneDepositMessageParams): string {
  const { customerFirstName, serviceName, branchName, whenLabel, depositLabel, bookingReference, payUrl } = params;

  return (
    `Hi ${customerFirstName}, thanks for booking ${serviceName} at ${branchName} on ${whenLabel}. ` +
    `Please pay your ${depositLabel} deposit to confirm: ${payUrl} ` +
    `Ref ${bookingReference}.`
  );
}
