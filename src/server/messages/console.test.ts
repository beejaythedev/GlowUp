import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleMessageSender } from "./console";

describe("ConsoleMessageSender", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the recipient and body", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await new ConsoleMessageSender().send({ to: "08039998888", body: "You're booked." });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("08039998888"),
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("You're booked."));
  });
});
