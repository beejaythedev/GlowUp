import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("associates the label with the field", () => {
    render(<Input label="Phone number" />);

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  });

  it("marks the field invalid and describes the error", () => {
    render(<Input label="Phone number" error="Enter a valid Nigerian number" />);

    const input = screen.getByLabelText("Phone number");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid Nigerian number")).toBeInTheDocument();
  });
});
