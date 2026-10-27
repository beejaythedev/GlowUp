/** A short reference customers can read over the phone, e.g. "GU-R3F8KZ". Derived from the booking id — no extra column needed. */
export function formatBookingReference(bookingId: string): string {
  return `GU-${bookingId.slice(-6).toUpperCase()}`;
}

/** "0803 ••• 4521" — hides the middle of a local Nigerian number for display. */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 4)} ••• ${phone.slice(-4)}`;
}
