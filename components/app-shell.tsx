import { Topbar } from "./topbar";
import type { ReactNode } from "react";

export function AppShell({
  sidebar,
  rightPanel,
  children,
  globalProgress,
}: {
  sidebar?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
  globalProgress?: number;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <Topbar globalProgress={globalProgress} />
      <div className="grid flex-1 grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_260px]">
        <aside>{sidebar}</aside>
        <main id="main" className="min-w-0 overflow-x-hidden px-8 py-6">
          {children}
        </main>
        <aside className="hidden xl:block">{rightPanel}</aside>
      </div>
    </div>
  );
}
