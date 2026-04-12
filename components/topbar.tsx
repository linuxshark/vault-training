import Link from "next/link";
import { Lock } from "lucide-react";

export function Topbar({ globalProgress }: { globalProgress?: number }) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border-subtle bg-surface px-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-text transition-colors hover:text-accent"
      >
        <Lock className="size-4 text-accent" />
        <span className="font-semibold tracking-tight">Vault Training</span>
      </Link>
      {typeof globalProgress === "number" && (
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{Math.round(globalProgress)}% completado</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-all duration-state"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
