import Link from "next/link";
import { Check, Circle, Dot } from "lucide-react";
import type { Status } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface SidebarObjective {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  tasks: {
    slug: string;
    title: string;
    status: Status;
  }[];
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "MASTERED") return <Check className="size-3.5 text-green" />;
  if (status === "REVIEWED") return <Check className="size-3.5 text-amber" />;
  if (status === "READING") return <Dot className="size-4 text-blue" />;
  return <Circle className="size-3 text-text-dim" />;
}

export function SidebarNav({
  objectives,
  activeObjective,
  activeTask,
}: {
  objectives: SidebarObjective[];
  activeObjective?: string;
  activeTask?: string;
}) {
  return (
    <nav
      aria-label="Objetivos"
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-border-subtle bg-surface px-3 py-4"
    >
      {objectives.map((obj) => (
        <div key={obj.id}>
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            {obj.id} · {obj.title}
          </div>
          <ul className="mt-1 space-y-0.5">
            {obj.tasks.map((task) => {
              const isActive = activeObjective === obj.slug && activeTask === task.slug;
              return (
                <li key={task.slug}>
                  <Link
                    href={`/domains/${obj.slug}/${task.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors duration-micro",
                      isActive
                        ? "border-l-2 border-accent bg-accent/10 pl-1.5 text-accent"
                        : "text-text hover:bg-surface-2",
                    )}
                  >
                    <StatusIcon status={task.status} />
                    <span className="truncate">{task.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
