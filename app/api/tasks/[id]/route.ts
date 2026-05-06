import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, context: { params?: { id?: string } }) {
  const idFromParams = context?.params?.id;
  const idFromUrl = new URL(req.url).pathname.split("/").pop();
  const id = idFromParams || idFromUrl;

  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}