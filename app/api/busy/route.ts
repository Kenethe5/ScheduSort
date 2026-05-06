import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const blocks = await prisma.busyBlock.findMany({
        orderBy: { start: "asc" },
    });
    return NextResponse.json(blocks);
}

export async function POST(req: Request) {
    const body = await req.json()
    const start = new Date(body.start);
    const end = new Date(body.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: "Valid start and end required" }, {status: 400});
    }
    if (end <= start) {
        return NextResponse.json({ error: "end must be after start" }, {status: 400});
    }

    const block = await prisma.busyBlock.create({
        data: { start, end },
    });

    return NextResponse.json(block);13
}