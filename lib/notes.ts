import type { PrismaClient, TaskNote } from "@prisma/client";

export async function getNote(prisma: PrismaClient, taskId: string): Promise<TaskNote | null> {
  return prisma.taskNote.findUnique({ where: { taskId } });
}

export async function saveNote(
  prisma: PrismaClient,
  taskId: string,
  body: string,
): Promise<TaskNote> {
  const normalized = body.trim() === "" ? "" : body;
  return prisma.taskNote.upsert({
    where: { taskId },
    create: { taskId, body: normalized },
    update: { body: normalized },
  });
}
