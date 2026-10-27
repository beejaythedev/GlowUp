import { describe, expect, it } from "vitest";
import { formatConfirmationMessage } from "./confirmationMessage";

describe("formatConfirmationMessage", () => {
  it("includes the arrive-by time and booking reference", () => {
    const message = formatConfirmationMessage({
      customerFirstName: "Amaka",
      serviceName: "Knotless braids",
      branchName: "GlowUp Lekki",
      whenLabel: "Sat 31 Oct, 11:00 am",
      arriveByLabel: "10:50 am",
      depositLabel: "₦5,000",
      bookingReference: "GU-4821",
    });

    expect(message).toContain("Please arrive by 10:50 am");
    expect(message).toContain("GU-4821");
    expect(message).toContain("Amaka");
    expect(message).toContain("Knotless braids");
    expect(message).not.toContain("GlowUp GlowUp");
  });
});
