import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("reflects selected state through aria-pressed", () => {
    render(<Chip selected>Any available</Chip>);

    expect(screen.getByRole("button", { name: "Any available" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("defaults to unselected", () => {
    render(<Chip>Ronke</Chip>);

    expect(screen.getByRole("button", { name: "Ronke" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
