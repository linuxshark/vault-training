import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { RightPanel } from "@/components/right-panel";
import { TabSwitcher } from "@/components/tab-switcher";
import { FooterNav } from "@/components/footer-nav";
import { prisma } from "@/lib/prisma";
import { loadTask } from "@/lib/content/loader";
import { getSidebarObjectives } from "@/lib/dashboard";
import { compileTaskMdx } from "@/lib/content/mdx";
import { getProgress, touchVisit } from "@/lib/progress";

export default async function TaskView({
  params,
}: {
  params: Promise<{ objectiveSlug: string; taskSlug: string }>;
}) {
  const { objectiveSlug, taskSlug } = await params;
  const objective = await prisma.objective.findUnique({ where: { slug: objectiveSlug } });
  if (!objective) notFound();
  const loaded = await loadTask(objective.id, taskSlug);
  if (!loaded) notFound();

  const taskId = `${objective.id}/${taskSlug}`;
  await touchVisit(prisma, taskId);
  const progress = await getProgress(prisma, taskId);

  const [explained, notes, lab] = await Promise.all([
    loaded.explained ? compileTaskMdx(loaded.explained) : null,
    loaded.notes ? compileTaskMdx(loaded.notes) : null,
    loaded.lab ? compileTaskMdx(loaded.lab) : null,
  ]);

  const sidebar = await getSidebarObjectives();
  const title =
    loaded.explained?.frontmatter.title ?? loaded.notes?.frontmatter.title ?? taskSlug;

  const tasksInOrder = await prisma.task.findMany({
    where: { objectiveId: objective.id, hidden: false },
    orderBy: { orderIndex: "asc" },
  });
  const currentIndex = tasksInOrder.findIndex((t) => t.slug === taskSlug);
  const prev = currentIndex > 0 ? tasksInOrder[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < tasksInOrder.length - 1
      ? tasksInOrder[currentIndex + 1]
      : undefined;

  return (
    <AppShell
      sidebar={
        <SidebarNav
          objectives={sidebar}
          activeObjective={objective.slug}
          activeTask={taskSlug}
        />
      }
      rightPanel={
        <RightPanel
          externalLinks={loaded.externalLinks}
          labCommands={extractCommands(loaded.lab?.body ?? "")}
          taskId={taskId}
        />
      }
    >
      <article className="mx-auto max-w-3xl space-y-4">
        <nav className="text-xs text-text-dim">
          <span>{objective.title}</span>
          <span className="mx-1.5 text-text-dim/50">/</span>
          <span className="text-text-muted">{title}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-3">
          <StatusPill status={progress?.status ?? "NOT_STARTED"} />
          {loaded.explained?.frontmatter.estMinutes && (
            <span className="text-xs text-text-muted">
              est. {loaded.explained.frontmatter.estMinutes} min
            </span>
          )}
        </div>
        <TabSwitcher
          taskId={taskId}
          initialStatus={progress?.status ?? "NOT_STARTED"}
          panels={{
            explained: explained?.content ?? null,
            notes: notes?.content ?? null,
            lab: lab?.content ?? null,
          }}
        />
        <FooterNav
          prevHref={prev ? `/domains/${objective.slug}/${prev.slug}` : null}
          prevLabel={prev?.title ?? null}
          nextHref={next ? `/domains/${objective.slug}/${next.slug}` : null}
          nextLabel={next?.title ?? null}
        />
      </article>
    </AppShell>
  );
}

function extractCommands(body: string): string[] {
  const cmds: string[] = [];
  const re = /```(?:bash|sh)[\s\S]*?```/g;
  const blocks = body.match(re) ?? [];
  for (const block of blocks) {
    const inner = block.replace(/```(?:bash|sh)\n?/, "").replace(/```$/, "");
    inner
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((l) => cmds.push(l.replace(/^\$\s*/, "")));
  }
  return cmds.slice(0, 20);
}
