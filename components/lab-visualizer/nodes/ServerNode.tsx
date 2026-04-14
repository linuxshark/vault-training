"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { Lock } from "lucide-react";

interface Data {
  label: string;
  state: NodeState;
}

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[120px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
        "bg-bg-elevated text-text",
        d.state === "active"
          ? "border-accent shadow-[0_0_24px_theme(colors.accent)]"
          : "border-border-subtle opacity-70",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Lock className="size-4" aria-hidden />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
export const ServerNode = memo(Component);
