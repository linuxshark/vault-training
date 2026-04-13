import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { prisma } from "@/lib/prisma";
import { getSidebarObjectives } from "@/lib/dashboard";

export default async function NotesIndex() {
  const sidebar = await getSidebarObjectives();
  const notes = await prisma.taskNote.findMany({
    where: { body: { not: "" } },
    include: { task: { include: { objective: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const byObjective = new Map<string, typeof notes>();
  for (const n of notes) {
    const key = n.task.objective.title;
    byObjective.set(key, [...(byObjective.get(key) ?? []), n]);
  }

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mis notas</h1>
          <p className="text-text-muted">{notes.length} tareas con notas.</p>
        </header>
        {[...byObjective.entries()].map(([title, items]) => (
          <section key={title} className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <ul className="space-y-3">
              {items.map((n) => (
                <li key={n.taskId} className="rounded-md border border-border-subtle bg-surface p-3">
                  <Link
                    href={`/domains/${n.task.objective.slug}/${n.task.slug}`}
                    className="block text-sm font-medium text-text hover:text-accent"
                  >
                    {n.task.title}
                  </Link>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-text-muted">
                    {n.body.length > 280 ? n.body.slice(0, 280) + "…" : n.body}
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
