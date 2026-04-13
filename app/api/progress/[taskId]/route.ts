import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getProgress, setStatus, touchVisit } from "@/lib/progress";

const StatusSchema = z.enum(["NOT_STARTED", "READING", "REVIEWED", "MASTERED"]);
const BodySchema = z.object({ status: StatusSchema.optional(), visit: z.boolean().optional() });

interface Params {
  params: Promise<{ taskId: string }>;
}

function decodeTaskId(raw: string): string {
  return decodeURIComponent(raw);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { taskId: rawId } = await params;
  const taskId = decodeTaskId(rawId);
  const progress = await getProgress(prisma, taskId);
  return NextResponse.json(progress ?? { status: "NOT_STARTED" });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { taskId: rawId } = await params;
  const taskId = decodeTaskId(rawId);
  const body = BodySchema.parse(await req.json());
  let progress = null;
  if (body.status) progress = await setStatus(prisma, taskId, body.status);
  if (body.visit) progress = await touchVisit(prisma, taskId);
  return NextResponse.json(progress);
}
