import { describe, expect, it } from "vitest";
import { formatReminder24hMessage, formatReminder3hMessage } from "./reminderMessage";

const PARAMS = {
  customerFirstName: "Amaka",
  serviceName: "Knotless braids",
  branchName: "GlowUp Lekki",
  whenLabel: "Sat 31 Oct, 11:00 am",
  arriveByLabel: "10:50 am",
  bookingReference: "GU-4821",
};

describe("formatReminder24hMessage", () => {
  it("mentions the last chance to cancel for a refund", () => {
    const message = formatReminder24hMessage(PARAMS);
    expect(message).toContain("last chance to");
    expect(message).toContain("refund");
    expect(message).toContain("Amaka");
    expect(message).toContain("10:50 am");
    expect(message).toContain("GU-4821");
    expect(message).not.toContain("GlowUp GlowUp");
  });
});

describe("formatReminder3hMessage", () => {
  it("does not mention cancellation or refund", () => {
    const message = formatReminder3hMessage(PARAMS);
    expect(message).not.toContain("refund");
    expect(message).not.toContain("cancel");
    expect(message).toContain("Amaka");
    expect(message).toContain("10:50 am");
    expect(message).toContain("GU-4821");
    expect(message).not.toContain("GlowUp GlowUp");
  });
});
