import { prisma } from "./prisma";
import type { Status } from "@prisma/client";
import type { SidebarObjective } from "@/components/sidebar-nav";

export interface DashboardObjective {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  taskCount: number;
  masteredCount: number;
  reviewedCount: number;
  readingCount: number;
  percent: number;
}

export async function getDashboard(): Promise<{
  objectives: DashboardObjective[];
  globalPercent: number;
  lastTask: { objectiveSlug: string; taskSlug: string; title: string } | null;
}> {
  const objectives = await prisma.objective.findMany({
    include: { tasks: { where: { hidden: false }, include: { progress: true } } },
    orderBy: { orderIndex: "asc" },
  });

  const rows: DashboardObjective[] = objectives.map((o) => {
    const taskCount = o.tasks.length;
    const masteredCount = o.tasks.filter((t) => t.progress?.status === "MASTERED").length;
    const reviewedCount = o.tasks.filter((t) => t.progress?.status === "REVIEWED").length;
    const readingCount = o.tasks.filter((t) => t.progress?.status === "READING").length;
    const weighted = masteredCount * 1 + reviewedCount * 0.66 + readingCount * 0.33;
    const percent = taskCount === 0 ? 0 : (weighted / taskCount) * 100;
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      orderIndex: o.orderIndex,
      taskCount,
      masteredCount,
      reviewedCount,
      readingCount,
      percent,
    };
  });

  const totalTasks = rows.reduce((s, r) => s + r.taskCount, 0);
  const globalPercent =
    totalTasks === 0
      ? 0
      : (rows.reduce((s, r) => s + (r.percent * r.taskCount) / 100, 0) * 100) / totalTasks;

  const lastProgress = await prisma.taskProgress.findFirst({
    orderBy: { lastVisit: "desc" },
    include: { task: { include: { objective: true } } },
  });
  const lastTask = lastProgress?.task
    ? {
        objectiveSlug: lastProgress.task.objective.slug,
        taskSlug: lastProgress.task.slug,
        title: lastProgress.task.title,
      }
    : null;

  return { objectives: rows, globalPercent, lastTask };
}

export function mapObjectivesToSidebar(
  objectives: {
    id: string;
    slug: string;
    title: string;
    orderIndex: number;
    tasks: { slug: string; title: string; progress: { status: Status } | null }[];
  }[],
): SidebarObjective[] {
  return objectives.map((o) => ({
    id: o.id,
    slug: o.slug,
    title: o.title,
    orderIndex: o.orderIndex,
    tasks: o.tasks.map((t) => ({
      slug: t.slug,
      title: t.title,
      status: t.progress?.status ?? "NOT_STARTED",
    })),
  }));
}

export async function getSidebarObjectives(): Promise<SidebarObjective[]> {
  const objectives = await prisma.objective.findMany({
    include: {
      tasks: {
        where: { hidden: false },
        orderBy: { orderIndex: "asc" },
        include: { progress: { select: { status: true } } },
      },
    },
    orderBy: { orderIndex: "asc" },
  });
  return mapObjectivesToSidebar(objectives);
}
