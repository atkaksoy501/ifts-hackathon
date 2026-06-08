import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeliveryDashboard } from "./DeliveryDashboard.js";

describe("DeliveryDashboard", () => {
  it("renders core Module 1 surfaces", () => {
    render(<DeliveryDashboard />);

    expect(screen.getByText("Predictive Sizing + Blockage Advisor")).toBeInTheDocument();
    expect(screen.getByText("Sync Sağlığı")).toBeInTheDocument();
    expect(screen.getByText("ICTFT-201")).toBeInTheDocument();
  });
});
