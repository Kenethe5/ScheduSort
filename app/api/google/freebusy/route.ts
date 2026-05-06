import { NextResponse } from "next/server";
import { auth } from "@/auth"; 

export async function POST(req: Request) {
    const session = await auth();
    const accessToken = (session as any).?accessToken;

    if(!accessToken) {
        return NextResponse.json({ error: "Not signed in"}, { status: 401});
    }

    const body = await req.json();
    const timeMin = body.timeMin;
    const timeMax = body.timeMax;

    if (!timeMin || !timeMax) {
        return NextResponse.json({ error: "timeMin and timeMax required"}, {status: 400});
    }
    // Calls Google Calendar FreeBusy API
    const googleRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            timeMin,
            timeMax,
            items: [{ id: "primary"}],
        }),
    });

    if(!googleRes.ok) {
        const text = await googleRes.text();
        return NextResponse.json({error: "Google API error", details: text}, {status: 500});
    }

    const data = await googleRes.json();
    return NextResponse.json(data);
}