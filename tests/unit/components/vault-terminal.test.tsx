import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VaultTerminal } from "@/components/lab-visualizer/VaultTerminal";

describe("VaultTerminal", () => {
  it("renders the full command immediately when reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<VaultTerminal commands={["vault status"]} />);
    expect(screen.getByText(/vault status/)).toBeInTheDocument();
  });

  it("shows prompt character", () => {
    render(<VaultTerminal commands={["vault status"]} />);
    expect(screen.getAllByText("$").length).toBeGreaterThan(0);
  });

  it("renders multiple commands", () => {
    render(<VaultTerminal commands={["vault status", "vault login root"]} />);
    expect(screen.getAllByText("$").length).toBeGreaterThanOrEqual(1);
  });
});
