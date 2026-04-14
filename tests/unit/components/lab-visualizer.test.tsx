import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LabVisualizer } from "@/components/lab-visualizer/LabVisualizer";
import type { LabStep } from "@/lib/lab-visualizer/types";

vi.mock("@/components/lab-visualizer/VaultScene", () => ({
  VaultScene: (props: { visible: string[]; active: string[] }) => (
    <div data-testid="scene">
      visible:{props.visible.join(",")} active:{props.active.join(",")}
    </div>
  ),
  deriveVisible: (affects: string[][]) =>
    Array.from(new Set(["client", "server", ...affects.flat()])),
}));

const steps: LabStep[] = [
  { index: 0, commands: ["vault status"], output: null, affects: ["server"], caption: null },
  { index: 1, commands: ["vault login root"], output: null, affects: ["client", "server", "token"], caption: null },
];

describe("LabVisualizer", () => {
  it("renders empty state when steps=[]", () => {
    render(<LabVisualizer steps={[]} />);
    expect(screen.getByText(/no contiene comandos parseables/i)).toBeInTheDocument();
  });

  it("renders first step on mount", async () => {
    render(<LabVisualizer steps={steps} />);
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("scene")).toHaveTextContent("active:server");
    });
  });

  it("advances on next click", async () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.click(screen.getByLabelText("Siguiente"));
    expect(screen.getByText(/paso 2\/2/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("scene")).toHaveTextContent("active:client,server,token");
    });
  });

  it("goes back on prev click", () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.click(screen.getByLabelText("Siguiente"));
    fireEvent.click(screen.getByLabelText("Anterior"));
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
  });

  it("arrow keys move steps", () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/paso 2\/2/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
  });
});
