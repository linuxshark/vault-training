import { cn } from "@/lib/utils";
import type { Status } from "@prisma/client";

const styles: Record<Status, string> = {
  NOT_STARTED: "bg-surface-2 text-text-muted border-border",
  READING: "bg-blue/10 text-blue border-blue/35",
  REVIEWED: "bg-amber/15 text-amber border-amber/40",
  MASTERED: "bg-green/15 text-green border-green/40",
};

const labels: Record<Status, string> = {
  NOT_STARTED: "No empezado",
  READING: "Leyendo",
  REVIEWED: "Revisado",
  MASTERED: "Dominado",
};

export function StatusPill({
  status,
  className,
  onClick,
}: {
  status: Status;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[status],
        onClick && "cursor-pointer transition-all duration-micro hover:brightness-125",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </Tag>
  );
}
