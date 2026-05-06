import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Interval = { start: Date; end: Date };

type ScheduledItem = {
  taskId: string;
  title: string;
  priority: number;
  start: string;
  end: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function withTime(d: Date, hour: number, minute: number) {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
}
function ceilToMinutes(d: Date, stepMin: number) {
  const x = new Date(d);
  const ms = x.getTime();
  const stepMs = stepMin * 60_000;
  return new Date(Math.ceil(ms / stepMs) * stepMs);
}

function intersects(a: Interval, b: Interval) {
  return a.start < b.end && b.start < a.end;
}

function subtractBusy(free: Interval[], busy: Interval[]) {
  let result = free;

  for (const b of busy) {
    const next: Interval[] = [];
    for (const f of result) {
      if (!intersects(f, b)) {
        next.push(f);
        continue;
      }

      // left remainder
      if (f.start < b.start) {
        next.push({ start: f.start, end: new Date(Math.min(b.start.getTime(), f.end.getTime())) });
      }
      // right remainder
      if (b.end < f.end) {
        next.push({ start: new Date(Math.max(b.end.getTime(), f.start.getTime())), end: f.end });
      }
    }
    result = next;
  }

  // normalize + sort
  result.sort((x, y) => x.start.getTime() - y.start.getTime());
  return result.filter((i) => i.end > i.start);
}

export async function POST() {
  const now = new Date();
  const rangeStart = startOfDay(now);
  const rangeEnd = addDays(rangeStart, 7);

  const WORK_START_H = 9;
  const WORK_END_H = 21;
  const STEP_MIN = 15;

  const tasks = await prisma.task.findMany({
    where: { dueAt: { lte: rangeEnd } },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" } ],
  });

  const busyBlocks = await prisma.busyBlock.findMany({
    where: {
      start: { lt: rangeEnd },
      end: { gt: rangeStart },
    },
    orderBy: { start: "asc" },
  });

  // Build busy intervals list
  const busy: Interval[] = busyBlocks.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
  }));

  const scheduled: ScheduledItem[] = [];
  const unscheduled: { taskId: string; title: string; reason: string }[] = [];

  // For each day, compute free intervals (workday minus busy blocks)
  const freeByDay: Interval[][] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(rangeStart, i);
    const dayStart = withTime(day, WORK_START_H, 0);
    const dayEnd = withTime(day, WORK_END_H, 0);

    const dayFree: Interval[] = [{ start: dayStart, end: dayEnd }];
    const dayBusy = busy.filter((b) => intersects(b, { start: dayStart, end: dayEnd }));

    freeByDay[i] = subtractBusy(dayFree, dayBusy);
  }

  // Place each task into earliest free interval before dueAt
  for (const t of tasks) {
    const due = new Date(t.dueAt);
    const durationMs = t.durationMinutes * 60_000;

    let placed = false;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = addDays(rangeStart, dayIndex);
      const dayStart = withTime(day, WORK_START_H, 0);

      // if due is before this day starts, can't schedule it
      if (due <= dayStart) break;

      const intervals = freeByDay[dayIndex];

      for (let j = 0; j < intervals.length; j++) {
        let start = ceilToMinutes(intervals[j].start, STEP_MIN);
        let end = new Date(start.getTime() + durationMs);

        // constrain by due date
        const latestAllowedEnd = due < intervals[j].end ? due : intervals[j].end;

        if (end <= latestAllowedEnd) {
          scheduled.push({
            taskId: t.id,
            title: t.title,
            priority: t.priority,
            start: start.toISOString(),
            end: end.toISOString(),
          });

          // consume the interval: split into remaining free pieces
          const before = intervals[j].start < start ? [{ start: intervals[j].start, end: start }] : [];
          const after = end < intervals[j].end ? [{ start: end, end: intervals[j].end }] : [];

          intervals.splice(j, 1, ...before, ...after);
          freeByDay[dayIndex] = intervals.filter((x) => x.end > x.start);
          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      unscheduled.push({
        taskId: t.id,
        title: t.title,
        reason: "No free slot before due date within next 7 days (9am–9pm) after busy blocks.",
      });
    }
  }

  return NextResponse.json({
    window: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    scheduled,
    unscheduled,
  });
}