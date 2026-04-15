"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { Ticket } from "lucide-react";

interface Data {
  label: string;
  state: NodeState;
}

function Component({ data }: NodeProps) {
  const d = data as unknown as Data;
  return (
    <div
      className={cn(
        "flex min-w-[80px] flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-200",
        d.state === "active"
          ? "border-rose-400 bg-rose-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-60",
      )}
    >
      <Handle type="source" position={Position.Bottom} />
      <Ticket className="size-3.5" aria-hidden />
      <span>{d.label}</span>
    </div>
  );
}
export const TokenNode = memo(Component);
