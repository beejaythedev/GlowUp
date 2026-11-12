import { describe, expect, it } from "vitest";
import { formatPhoneDepositMessage } from "./phoneDepositMessage";

describe("formatPhoneDepositMessage", () => {
  it("includes the pay link, deposit amount and reference", () => {
    const message = formatPhoneDepositMessage({
      customerFirstName: "Kemi",
      serviceName: "Relaxer and styling",
      branchName: "GlowUp Lekki",
      whenLabel: "Sat 31 Oct, 2:00 pm",
      depositLabel: "₦2,400",
      bookingReference: "GU-7731",
      payUrl: "http://localhost:3000/book/pay?bookingId=abc123",
    });

    expect(message).toContain("Kemi");
    expect(message).toContain("Relaxer and styling");
    expect(message).toContain("₦2,400");
    expect(message).toContain("http://localhost:3000/book/pay?bookingId=abc123");
    expect(message).toContain("GU-7731");
    expect(message).not.toContain("GlowUp GlowUp");
  });
});
