import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { getSidebarObjectives } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export default async function ObjectiveView({ params }: { params: Promise<{ objectiveSlug: string }> }) {
  const { objectiveSlug } = await params;
  const objective = await prisma.objective.findUnique({
    where: { slug: objectiveSlug },
    include: {
      tasks: {
        where: { hidden: false },
        orderBy: { orderIndex: "asc" },
        include: { progress: { select: { status: true } } },
      },
    },
  });
  if (!objective) notFound();

  const sidebar = await getSidebarObjectives();

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} activeObjective={objective.slug} />}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-dim">
            Objetivo {objective.id}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{objective.title}</h1>
        </div>
        <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {objective.tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/domains/${objective.slug}/${task.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors duration-micro hover:bg-surface"
              >
                <span className="truncate text-text">{task.title}</span>
                <StatusPill status={task.progress?.status ?? "NOT_STARTED"} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
