"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toggle({ summary, children }: { summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 rounded-md border border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-text transition-colors duration-micro hover:bg-surface-2"
      >
        <span>{summary}</span>
        <ChevronDown
          className={cn("size-4 transition-transform duration-state", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-border-subtle px-3 py-3">{children}</div>}
    </div>
  );
}
