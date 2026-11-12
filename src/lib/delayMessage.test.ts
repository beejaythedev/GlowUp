import { describe, expect, it } from "vitest";
import { formatDelayMessage } from "./delayMessage";

const BASE = {
  customerFirstName: "Amaka",
  stylistName: "Ronke",
  serviceName: "Knotless braids",
  branchName: "GlowUp Lekki",
  originalWhenLabel: "11:00 am",
  bookingReference: "GU-4821",
  choiceUrl: "http://localhost:3000/book/delay?bookingId=abc123",
};

describe("formatDelayMessage", () => {
  it("offers both choices when both are available", () => {
    const message = formatDelayMessage({ ...BASE, laterWhenLabel: "1:00 pm", otherStylistAvailable: true });
    expect(message).toContain("a later time with Ronke (1:00 pm)");
    expect(message).toContain("11:00 am with another stylist");
    expect(message).toContain(BASE.choiceUrl);
    expect(message).toContain("GU-4821");
  });

  it("offers only the same-stylist option when that's the only one available", () => {
    const message = formatDelayMessage({ ...BASE, laterWhenLabel: "1:00 pm", otherStylistAvailable: false });
    expect(message).toContain("a later time with Ronke");
    expect(message).not.toContain("with another stylist");
  });

  it("offers only the other-stylist option when that's the only one available", () => {
    const message = formatDelayMessage({ ...BASE, laterWhenLabel: null, otherStylistAvailable: true });
    expect(message).not.toContain("a later time with Ronke");
    expect(message).toContain("11:00 am with another stylist");
  });

  it("asks the customer to call when neither option is available", () => {
    const message = formatDelayMessage({ ...BASE, laterWhenLabel: null, otherStylistAvailable: false });
    expect(message).toContain("Please call us");
    expect(message).not.toContain(BASE.choiceUrl);
  });
});
