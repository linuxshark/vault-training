"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { User } from "lucide-react";

interface Data {
  label: string;
  state: NodeState;
}

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[100px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
        d.state === "active"
          ? "border-blue-400 bg-blue-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-70",
      )}
    >
      <User className="size-4" aria-hidden />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
export const ClientNode = memo(Component);
