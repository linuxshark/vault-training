import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardObjective } from "@/lib/dashboard";

export function ObjectiveCard({ obj }: { obj: DashboardObjective }) {
  return (
    <Link
      href={`/domains/${obj.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-state hover:border-accent/50"
    >
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Objetivo {obj.id}
        </div>
        <div className="text-sm font-medium text-accent">{Math.round(obj.percent)}%</div>
      </div>
      <h3 className="text-md font-semibold leading-tight text-text">{obj.title}</h3>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full bg-accent transition-all duration-state"
          style={{ width: `${obj.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {obj.masteredCount}/{obj.taskCount} dominados
        </span>
        <ArrowRight className="size-3.5 opacity-0 transition-opacity duration-micro group-hover:opacity-100" />
      </div>
    </Link>
  );
}
