import type { PrismaClient } from "@prisma/client";
import { listObjectives } from "./content/loader";

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const objectives = await listObjectives();
  const knownTaskIds = new Set<string>();

  for (const obj of objectives) {
    await prisma.objective.upsert({
      where: { id: obj.id },
      create: { id: obj.id, slug: obj.slug, title: obj.title, orderIndex: obj.orderIndex },
      update: { slug: obj.slug, title: obj.title, orderIndex: obj.orderIndex },
    });

    for (const task of obj.tasks) {
      const taskId = `${obj.id}/${task.slug}`;
      knownTaskIds.add(taskId);
      await prisma.task.upsert({
        where: { id: taskId },
        create: {
          id: taskId,
          slug: task.slug,
          title: task.title,
          objectiveId: obj.id,
          orderIndex: task.orderIndex,
          hidden: false,
        },
        update: {
          slug: task.slug,
          title: task.title,
          objectiveId: obj.id,
          orderIndex: task.orderIndex,
          hidden: false,
        },
      });
    }
  }

  const existing = await prisma.task.findMany({ select: { id: true } });
  const stale = existing.filter((t) => !knownTaskIds.has(t.id)).map((t) => t.id);
  if (stale.length > 0) {
    await prisma.task.updateMany({ where: { id: { in: stale } }, data: { hidden: true } });
  }
}
