import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders its label and responds to clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Book now</Button>);

    const button = screen.getByRole("button", { name: "Book now" });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Book now
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Book now" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
