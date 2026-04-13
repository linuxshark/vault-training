"use client";
import { useEffect, useState, type ReactNode } from "react";
import { StatusPill } from "./status-pill";
import type { Status } from "@prisma/client";
import { cn } from "@/lib/utils";

type TabKey = "explained" | "notes" | "lab";
const TAB_LABELS: Record<TabKey, string> = {
  explained: "Explicación sencilla",
  notes: "Notas técnicas",
  lab: "Lab",
};

export function TabSwitcher({
  taskId,
  initialStatus,
  panels,
}: {
  taskId: string;
  initialStatus: Status;
  panels: Record<TabKey, ReactNode | null>;
}) {
  const [active, setActive] = useState<TabKey>(firstAvailable(panels));
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.key === "1" && panels.explained) setActive("explained");
      else if (e.key === "2" && panels.notes) setActive("notes");
      else if (e.key === "3" && panels.lab) setActive("lab");
      else if (e.key === "m") void advance("REVIEWED");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  async function advance(target: Status) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/progress/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    if (res.ok) {
      const json = await res.json();
      setStatus(json.status);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle">
        <div role="tablist" className="flex gap-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
            const disabled = !panels[key];
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active === key}
                disabled={disabled}
                onClick={() => !disabled && setActive(key)}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-micro",
                  active === key
                    ? "border-accent text-text"
                    : "border-transparent text-text-muted hover:text-text",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
        <StatusPill status={status} onClick={() => void advance(nextStatus(status))} />
      </div>
      <div className="prose prose-invert prose-headings:font-semibold prose-code:font-mono prose-code:text-sm prose-pre:bg-[#010409] prose-a:text-blue max-w-none">
        {panels[active]}
      </div>
    </div>
  );
}

function firstAvailable(panels: Record<TabKey, ReactNode | null>): TabKey {
  if (panels.explained) return "explained";
  if (panels.notes) return "notes";
  return "lab";
}

function nextStatus(s: Status): Status {
  switch (s) {
    case "NOT_STARTED": return "READING";
    case "READING": return "REVIEWED";
    case "REVIEWED": return "MASTERED";
    case "MASTERED": return "READING";
  }
}
