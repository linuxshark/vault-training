import "server-only";
import { prisma } from "./prisma";
import { seedCatalog } from "./seed";

let seeded = false;

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  try {
    await seedCatalog(prisma);
  } catch (err) {
    console.error("[seed] failed:", err);
  }
  seeded = true;
}
