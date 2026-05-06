import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: Request, context: { params?: { id?: string } }) {
    const idFromParams = context?.params?.id;
    const idFromUrl = new URL(_req.url).pathname.split("/").pop();
    const id = idFromParams || idFromUrl;

    if (!id) return NextResponse.json({ error: "Missing busy block id"}, {status: 400});

    await prisma.busyBlock.delete({where: {id}});
    return NextResponse.json({ ok:true});
} 