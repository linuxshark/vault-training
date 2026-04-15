"use client";
import { Terminal } from "lucide-react";

export function LabVisualizerEmpty() {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-subtle bg-bg-elevated text-center">
      <Terminal className="size-8 text-text-muted" aria-hidden />
      <p className="text-sm text-text-muted">
        Este lab no contiene comandos parseables aún.
      </p>
      <p className="text-xs text-text-muted">
        Revisa la pestaña <strong>Lab</strong> para ver los comandos en texto.
      </p>
    </div>
  );
}
