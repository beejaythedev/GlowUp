export interface ConfirmationMessageParams {
  customerFirstName: string;
  serviceName: string;
  branchName: string;
  whenLabel: string;
  arriveByLabel: string;
  depositLabel: string;
  bookingReference: string;
}

/** The SMS body sent once a deposit is confirmed (docs/PRD.md, S5 — "please arrive early"). */
export function formatConfirmationMessage(params: ConfirmationMessageParams): string {
  const {
    customerFirstName, serviceName, branchName, whenLabel,
    arriveByLabel, depositLabel, bookingReference,
  } = params;

  return (
    `Hi ${customerFirstName}, you're booked at ${branchName} for ${serviceName} ` +
    `on ${whenLabel}. Please arrive by ${arriveByLabel} so we can start on time. ` +
    `Deposit paid: ${depositLabel}. Ref ${bookingReference}.`
  );
}
