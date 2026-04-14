"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode } from "./nodes/ServerNode";
import { ClientNode } from "./nodes/ClientNode";
import { AuthNode } from "./nodes/AuthNode";
import { EngineNode } from "./nodes/EngineNode";
import { PolicyNode } from "./nodes/PolicyNode";
import { TokenNode } from "./nodes/TokenNode";
import type { NodeRef, NodeState } from "@/lib/lab-visualizer/types";
import { BASE_POSITIONS, positionFor } from "@/lib/lab-visualizer/scene-layout";

const NODE_TYPES: NodeTypes = {
  server: ServerNode as unknown as NodeTypes[string],
  client: ClientNode as unknown as NodeTypes[string],
  auth: AuthNode as unknown as NodeTypes[string],
  engine: EngineNode as unknown as NodeTypes[string],
  policy: PolicyNode as unknown as NodeTypes[string],
  token: TokenNode as unknown as NodeTypes[string],
};

function refToKind(ref: NodeRef): keyof typeof NODE_TYPES {
  if (ref.startsWith("auth:")) return "auth";
  if (ref.startsWith("engine:")) return "engine";
  return ref as "server" | "client" | "policy" | "token";
}

function refLabel(ref: NodeRef): string {
  if (ref === "server") return "Vault Server";
  if (ref === "client") return "Cliente";
  if (ref === "token") return "Token";
  if (ref === "policy") return "Policy";
  if (ref.startsWith("auth:")) return ref.slice(5);
  if (ref.startsWith("engine:")) return ref.slice(7);
  return ref;
}

export function VaultScene({
  visible,
  active,
}: {
  visible: NodeRef[];
  active: NodeRef[];
}) {
  const nodes = useMemo<Node[]>(
    () =>
      visible.map((ref) => {
        const kind = refToKind(ref);
        const state: NodeState = active.includes(ref) ? "active" : "idle";
        return {
          id: ref,
          type: kind,
          position: positionFor(ref),
          data: { label: refLabel(ref), state },
        };
      }),
    [visible, active],
  );

  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = [];
    if (visible.includes("client") && visible.includes("server")) {
      list.push({
        id: "e-client-server",
        source: "client",
        target: "server",
        animated: active.includes("client") && active.includes("server"),
      });
    }
    visible
      .filter((r): r is `engine:${string}` => r.startsWith("engine:"))
      .forEach((eng) => {
        list.push({
          id: `e-server-${eng}`,
          source: "server",
          target: eng,
          animated: active.includes("server") && active.includes(eng),
        });
      });
    visible
      .filter((r): r is `auth:${string}` => r.startsWith("auth:"))
      .forEach((auth) => {
        list.push({
          id: `e-server-${auth}`,
          source: "server",
          target: auth,
          animated: active.includes("server") && active.includes(auth),
        });
      });
    return list;
  }, [visible, active]);

  return (
    <div className="h-[360px] w-full rounded-lg border border-border-subtle bg-bg" aria-label="Diagrama Vault">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        panOnDrag
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// helper re-exported for LabVisualizer to derive `visible` from steps
export function deriveVisible(allAffects: NodeRef[][]): NodeRef[] {
  const set = new Set<NodeRef>(["client", "server"]);
  allAffects.forEach((arr) => arr.forEach((r) => set.add(r)));
  return Array.from(set).filter(
    (r) => BASE_POSITIONS[r] !== undefined || r === "client" || r === "server",
  );
}
