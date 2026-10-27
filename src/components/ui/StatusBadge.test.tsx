import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label passed in for a given status", () => {
    render(<StatusBadge status="waiting">Waiting 6 min</StatusBadge>);

    expect(screen.getByText("Waiting 6 min")).toBeInTheDocument();
  });
});
