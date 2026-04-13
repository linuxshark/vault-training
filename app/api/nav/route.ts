import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const objectiveSlug = req.nextUrl.searchParams.get("objective");
  const taskSlug = req.nextUrl.searchParams.get("task");
  if (!objectiveSlug || !taskSlug) return NextResponse.json({}, { status: 400 });

  const objective = await prisma.objective.findUnique({
    where: { slug: objectiveSlug },
    include: {
      tasks: { where: { hidden: false }, orderBy: { orderIndex: "asc" } },
    },
  });
  if (!objective) return NextResponse.json({}, { status: 404 });

  const idx = objective.tasks.findIndex((t) => t.slug === taskSlug);
  const prev = idx > 0 ? objective.tasks[idx - 1] : undefined;
  const next = idx >= 0 && idx < objective.tasks.length - 1 ? objective.tasks[idx + 1] : undefined;
  return NextResponse.json({
    prev: prev ? `/domains/${objective.slug}/${prev.slug}` : null,
    next: next ? `/domains/${objective.slug}/${next.slug}` : null,
  });
}
