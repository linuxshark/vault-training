// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { ServerNode } from "@/components/lab-visualizer/nodes/ServerNode";
import { ClientNode } from "@/components/lab-visualizer/nodes/ClientNode";
import { AuthNode } from "@/components/lab-visualizer/nodes/AuthNode";
import { EngineNode } from "@/components/lab-visualizer/nodes/EngineNode";
import { PolicyNode } from "@/components/lab-visualizer/nodes/PolicyNode";
import { TokenNode } from "@/components/lab-visualizer/nodes/TokenNode";

const baseProps = {
  id: "n",
  selected: false,
  isConnectable: false,
  xPos: 0,
  yPos: 0,
  zIndex: 0,
  dragging: false,
  type: "custom",
};

function wrap(ui: React.ReactNode) {
  return <ReactFlowProvider>{ui}</ReactFlowProvider>;
}

describe("lab-visualizer nodes", () => {
  it("ServerNode renders label and status", () => {
    const { getByText } = render(
      wrap(<ServerNode {...baseProps} data={{ label: "Vault", state: "active" }} />),
    );
    expect(getByText("Vault")).toBeInTheDocument();
  });

  it("ClientNode renders", () => {
    const { getByText } = render(
      wrap(<ClientNode {...baseProps} data={{ label: "Cliente", state: "idle" }} />),
    );
    expect(getByText("Cliente")).toBeInTheDocument();
  });

  it("AuthNode renders method name", () => {
    const { getByText } = render(
      wrap(<AuthNode {...baseProps} data={{ label: "userpass", state: "active" }} />),
    );
    expect(getByText("userpass")).toBeInTheDocument();
  });

  it("EngineNode renders engine name", () => {
    const { getByText } = render(
      wrap(<EngineNode {...baseProps} data={{ label: "kv", state: "active" }} />),
    );
    expect(getByText("kv")).toBeInTheDocument();
  });

  it("PolicyNode renders", () => {
    const { getByText } = render(
      wrap(<PolicyNode {...baseProps} data={{ label: "Policy", state: "idle" }} />),
    );
    expect(getByText("Policy")).toBeInTheDocument();
  });

  it("TokenNode renders", () => {
    const { getByText } = render(
      wrap(<TokenNode {...baseProps} data={{ label: "Token", state: "idle" }} />),
    );
    expect(getByText("Token")).toBeInTheDocument();
  });
});
