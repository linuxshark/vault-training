import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/lib/prisma";
import { getNote, saveNote } from "@/lib/notes";

const DB_PATH = path.resolve(__dirname, "../../data/test-notes.db");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  const { execSync } = await import("node:child_process");
  execSync("node_modules/.bin/prisma db push --accept-data-loss", { stdio: "ignore", cwd: process.cwd() });
  prisma = createPrismaClient(`file:${DB_PATH}`);
  await prisma.objective.create({ data: { id: "9", slug: "misc", title: "M", orderIndex: 9 } });
  await prisma.task.create({
    data: { id: "9/t", slug: "t", title: "T", objectiveId: "9", orderIndex: 1 },
  });
});

afterEach(async () => {
  await prisma.taskNote.deleteMany();
});

describe("notes", () => {
  it("returns null when no note exists", async () => {
    expect(await getNote(prisma, "9/t")).toBeNull();
  });

  it("creates a note", async () => {
    const n = await saveNote(prisma, "9/t", "hola");
    expect(n.body).toBe("hola");
  });

  it("updates an existing note", async () => {
    await saveNote(prisma, "9/t", "v1");
    const n = await saveNote(prisma, "9/t", "v2");
    expect(n.body).toBe("v2");
  });

  it("trims input to avoid whitespace-only notes", async () => {
    const n = await saveNote(prisma, "9/t", "   ");
    expect(n.body).toBe("");
  });
});
