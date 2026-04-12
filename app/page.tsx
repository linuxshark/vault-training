import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { ObjectiveCard } from "@/components/objective-card";
import { getDashboard, getSidebarObjectives } from "@/lib/dashboard";

export default async function DashboardPage() {
  const [{ objectives, globalPercent, lastTask }, sidebar] = await Promise.all([
    getDashboard(),
    getSidebarObjectives(),
  ]);

  return (
    <AppShell globalProgress={globalPercent} sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-text-muted">Progreso global: {Math.round(globalPercent)}%</p>
        </header>

        {lastTask && (
          <Link
            href={`/domains/${lastTask.objectiveSlug}/${lastTask.taskSlug}`}
            className="block rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-text hover:border-accent"
          >
            Continúa donde lo dejaste → <span className="font-medium">{lastTask.title}</span>
          </Link>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {objectives.map((o) => (
            <ObjectiveCard key={o.id} obj={o} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
