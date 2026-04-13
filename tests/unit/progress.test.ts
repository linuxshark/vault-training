import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/lib/prisma";
import { getProgress, setStatus, touchVisit } from "@/lib/progress";

const DB_PATH = path.resolve(__dirname, "../../data/test-progress.db");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  const { execSync } = await import("node:child_process");
  execSync("node_modules/.bin/prisma db push --accept-data-loss", { stdio: "ignore", cwd: process.cwd() });
  prisma = createPrismaClient(`file:${DB_PATH}`);
  await prisma.objective.create({ data: { id: "9", slug: "misc", title: "Misc", orderIndex: 9 } });
  await prisma.task.create({
    data: { id: "9/t1", slug: "t1", title: "T1", objectiveId: "9", orderIndex: 1 },
  });
});

afterEach(async () => {
  await prisma.taskProgress.deleteMany();
});

describe("progress", () => {
  it("returns null when no progress exists", async () => {
    expect(await getProgress(prisma, "9/t1")).toBeNull();
  });

  it("creates progress with firstSeen on first setStatus", async () => {
    const p = await setStatus(prisma, "9/t1", "READING");
    expect(p.status).toBe("READING");
    expect(p.firstSeen).not.toBeNull();
  });

  it("sets reviewedAt when transitioning to REVIEWED", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const p = await setStatus(prisma, "9/t1", "REVIEWED");
    expect(p.reviewedAt).not.toBeNull();
  });

  it("sets masteredAt when transitioning to MASTERED", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const p = await setStatus(prisma, "9/t1", "MASTERED");
    expect(p.masteredAt).not.toBeNull();
  });

  it("does not overwrite firstSeen on subsequent updates", async () => {
    const first = await setStatus(prisma, "9/t1", "READING");
    await new Promise((r) => setTimeout(r, 5));
    const second = await setStatus(prisma, "9/t1", "REVIEWED");
    expect(second.firstSeen?.getTime()).toBe(first.firstSeen?.getTime());
  });

  it("touchVisit updates lastVisit without changing status", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const t = await touchVisit(prisma, "9/t1");
    expect(t.lastVisit).not.toBeNull();
    expect(t.status).toBe("READING");
  });
});
