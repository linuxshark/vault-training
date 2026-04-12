import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, boolean> = {};
  try {
    await prisma.objective.count();
    checks.db = true;
  } catch {
    checks.db = false;
  }
  try {
    const file = path.join(process.env.CONTENT_ROOT ?? "content", "_index", "objectives.json");
    const raw = await fs.readFile(file, "utf8");
    JSON.parse(raw);
    checks.content = true;
  } catch {
    checks.content = false;
  }
  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ status: ok ? "ok" : "degraded", checks }, { status: ok ? 200 : 503 });
}
