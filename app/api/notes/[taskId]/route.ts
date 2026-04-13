import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getNote, saveNote } from "@/lib/notes";

const BodySchema = z.object({ body: z.string() });

interface Params {
  params: Promise<{ taskId: string }>;
}

function decodeTaskId(raw: string): string {
  return decodeURIComponent(raw);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { taskId: rawId } = await params;
  const taskId = decodeTaskId(rawId);
  const note = await getNote(prisma, taskId);
  return NextResponse.json(note ?? { body: "", updatedAt: null });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { taskId: rawId } = await params;
  const taskId = decodeTaskId(rawId);
  const parsed = BodySchema.parse(await req.json());
  const note = await saveNote(prisma, taskId, parsed.body);
  return NextResponse.json(note);
}
