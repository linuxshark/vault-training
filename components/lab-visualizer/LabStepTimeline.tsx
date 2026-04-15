"use client";
import { cn } from "@/lib/utils";

export function LabStepTimeline({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (i: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            aria-label={`Ir a paso ${i + 1}`}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "h-2.5 w-6 rounded-full transition-all",
              i === current && "bg-accent",
              i < current && "bg-text-muted",
              i > current && "bg-border-subtle hover:bg-text-muted",
            )}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs text-text-muted">
        paso {current + 1}/{total}
      </span>
    </div>
  );
}
