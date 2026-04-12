import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { prisma } from "@/lib/prisma";
import { getSidebarObjectives } from "@/lib/dashboard";

export default async function ReviewView() {
  const [sidebar, tasks] = await Promise.all([
    getSidebarObjectives(),
    prisma.task.findMany({
      where: { hidden: false, progress: { status: { in: ["READING", "REVIEWED"] } } },
      include: { progress: true, objective: true },
      orderBy: { progress: { lastVisit: "asc" } },
    }),
  ]);

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Repasar</h1>
          <p className="text-text-muted">
            {tasks.length} tareas en estado Leyendo o Revisado, ordenadas por última visita (más
            antiguas primero).
          </p>
        </header>
        <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/domains/${t.objective.slug}/${t.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-surface"
              >
                <div className="min-w-0">
                  <div className="truncate text-text">{t.title}</div>
                  <div className="text-xs text-text-dim">{t.objective.title}</div>
                </div>
                <StatusPill status={t.progress?.status ?? "NOT_STARTED"} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
