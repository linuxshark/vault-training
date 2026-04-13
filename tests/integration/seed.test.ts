import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/lib/prisma";
import { seedCatalog } from "@/lib/seed";

const DB_PATH = path.resolve(__dirname, "../../data/test-seed.db");
const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  process.env.CONTENT_ROOT = FIXTURE_ROOT;
  const { execSync } = await import("node:child_process");
  execSync("node_modules/.bin/prisma db push --accept-data-loss", { stdio: "ignore", cwd: process.cwd() });
  prisma = createPrismaClient(`file:${DB_PATH}`);
});

afterEach(async () => {
  await prisma.taskNote.deleteMany();
  await prisma.taskProgress.deleteMany();
  await prisma.task.deleteMany();
  await prisma.objective.deleteMany();
});

describe("seedCatalog", () => {
  it("inserts objectives and tasks on first run", async () => {
    await seedCatalog(prisma);
    expect(await prisma.objective.count()).toBe(1);
    expect(await prisma.task.count()).toBe(1);
  });

  it("is idempotent on second run", async () => {
    await seedCatalog(prisma);
    await seedCatalog(prisma);
    expect(await prisma.objective.count()).toBe(1);
    expect(await prisma.task.count()).toBe(1);
  });

  it("preserves user progress across re-seeds", async () => {
    await seedCatalog(prisma);
    await prisma.taskProgress.create({ data: { taskId: "3/kv-v2", status: "READING" } });
    await seedCatalog(prisma);
    const progress = await prisma.taskProgress.findUnique({ where: { taskId: "3/kv-v2" } });
    expect(progress?.status).toBe("READING");
  });

  it("hides tasks whose content disappeared from disk", async () => {
    await seedCatalog(prisma);
    await prisma.task.create({
      data: {
        id: "3/ghost",
        slug: "ghost",
        title: "Ghost",
        objectiveId: "3",
        orderIndex: 99,
      },
    });
    await seedCatalog(prisma);
    const ghost = await prisma.task.findUnique({ where: { id: "3/ghost" } });
    expect(ghost?.hidden).toBe(true);
  });
});
