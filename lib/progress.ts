import type { PrismaClient, TaskProgress, Status } from "@prisma/client";

export async function getProgress(
  prisma: PrismaClient,
  taskId: string,
): Promise<TaskProgress | null> {
  return prisma.taskProgress.findUnique({ where: { taskId } });
}

export async function setStatus(
  prisma: PrismaClient,
  taskId: string,
  status: Status,
): Promise<TaskProgress> {
  const now = new Date();
  const existing = await prisma.taskProgress.findUnique({ where: { taskId } });

  const reviewedAt =
    status === "REVIEWED"
      ? now
      : status === "MASTERED"
        ? (existing?.reviewedAt ?? now)
        : (existing?.reviewedAt ?? null);
  const masteredAt = status === "MASTERED" ? now : (existing?.masteredAt ?? null);
  const firstSeen = existing?.firstSeen ?? now;

  return prisma.taskProgress.upsert({
    where: { taskId },
    create: { taskId, status, firstSeen, lastVisit: now, reviewedAt, masteredAt },
    update: { status, lastVisit: now, reviewedAt, masteredAt },
  });
}

export async function touchVisit(prisma: PrismaClient, taskId: string): Promise<TaskProgress> {
  const now = new Date();
  const existing = await prisma.taskProgress.findUnique({ where: { taskId } });
  return prisma.taskProgress.upsert({
    where: { taskId },
    create: { taskId, status: "READING", firstSeen: now, lastVisit: now },
    update: { lastVisit: now, firstSeen: existing?.firstSeen ?? now },
  });
}
