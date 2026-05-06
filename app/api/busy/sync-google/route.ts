import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated (no access token)" }, { status: 401 });
  }

  const { timeMin, timeMax } = await req.json();

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "timeMin and timeMax required" }, { status: 400 });
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "Google API error", details: text }, { status: 500 });
  }

  const data = await res.json();
  const busy = data?.calendars?.primary?.busy ?? [];

  // Replace busy blocks in this window
  await prisma.busyBlock.deleteMany({
    where: {
      start: { lt: new Date(timeMax) },
      end: { gt: new Date(timeMin) },
    },
  });

  if (busy.length > 0) {
    await prisma.busyBlock.createMany({
      data: busy.map((b: any) => ({
        start: new Date(b.start),
        end: new Date(b.end),
      })),
    });
  }

  return NextResponse.json({ ok: true, imported: busy.length });
}