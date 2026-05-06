import { NextResponse} from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const tasks = await prisma.task.findMany({
        orderBy: {createdAt: "desc" },
    });
    return NextResponse.json(tasks);
}

export async function POST(req: Request) {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const dueAt = new Date(body.dueAt);
    const durationMinutes = Number(body.durationMinutes);
    const priority = Number(body.priority ?? 2);

    if (!title) {
        return NextResponse.json({ error: "Title required "}, {status: 400});
    }

    if (Number.isNaN(dueAt.getTime()))
        return NextResponse.json({error: "Date Invalid"}, {status : 400});
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0)
        return NextResponse.json({error: "Invalid duration time"}, {status: 400});
    if (![1,2,3].includes(priority))
        return NextResponse.json({error: "Invalid priority(must be 1-3)"}, {status: 400});



    const task = await prisma.task.create({
        data: { title, dueAt, durationMinutes, priority },
    });

    return NextResponse.json(task);
}

