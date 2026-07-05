"use client";

//import { use, useEffect, useState } from "react";
import { useEffect, useRef, useState } from "react";

import "./styles/home.css";

type Task = {
  id: string;
  title: string;
  priority: number;
  durationMinutes: number;
  createdAt: string;
};

type BusyBlock = {
  id: string;
  start: string;
  end: string;
  createdAt: string;
};

export default function Home() {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [priority, setPriority] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const [busyStart, setBusyStart] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [busyEnd, setBusyEnd] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [busyLoading, setBusyLoading] = useState(false);
  const [busyCreating, setBusyCreating] = useState(false);

  const [schedule, setSchedule] = useState<any>(null);
  const [scheduling, setScheduling] = useState(false);

  async function loadTasks() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/tasks failed (${res.status})");
      const data = (await res.json()) as Task[];
      setTasks(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    loadBusyBlocks();
  }, []);

  async function loadBusyBlocks() {
    setBusyLoading(true);
    setError(null);
    try {
      const res = await fetch("api/busy", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/busy failed (${res.status})");
      const data = (await res.json()) as BusyBlock[];
      setBusyBlocks(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load busy blocks");
    } finally {
      setBusyLoading(false);
    }
  }

  async function syncGoogleBusy() {
    setError(null);
    try {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const payload = {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      };

      const res = await fetch("/api/busy/sync-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          body?.error ?? `Failed to sync Google Calander(${res.status})`
        );
      }

      await loadBusyBlocks();
    } catch (e: any) {
      setError(e?.message ?? "Google sync failed");
    }
  }

  async function addBusyBlock(e: React.FormEvent) {
    e.preventDefault();
    setBusyCreating(true);
    setError(null);

    try {
      const startISO = new Date(busyStart).toISOString();
      const endISO = new Date(busyEnd).toISOString();

      const res = await fetch("/api/busy", {
        method: "POST",
        headers: { "Content-Type": "application.json" },
        body: JSON.stringify({ start: startISO, end: endISO }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "POST /api/busy failed (${res.status})");
      }

      await loadBusyBlocks();
    } catch (e: any) {
      setError(e?.message ?? "Failed to add busy block");
    } finally {
      setBusyCreating(false);
    }
  }

  async function deleteBusyBlock(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/busy/${id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error("DELETE /api/busy/${id} failed (${res.status)}");
      await loadBusyBlocks();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete busy block.");
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (![1, 2, 3].includes(priority)) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          dueAt: new Date(dueAt).toISOString(),
          durationMinutes,
          priority,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error ?? "POST /api/tasks failed  (${res.status})"
        );
      }
      setTitle("");
      await loadTasks();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTask(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error(`DELETE /api/tasks/${id} failed (${res.status})`);
      await loadTasks();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete task");
    }
  }

  async function generateSchedule() {
    setScheduling(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule/generate", { method: "POST" });
      if (!res.ok)
        throw new Error("POST /api/schedule/generate failed (${res.status})");
      const data = await res.json();
      setSchedule(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <main>
      <div className="header">
        <h1>ScheduSort</h1>
        <p> Divide and conquer tasks!</p>
      </div>

      <div className="form-sectionr">
        <form onSubmit={addTask} className="form-container">
          <input
            className="form-blocks"
            placeholder="Add a task (e.g., NeetCode 45 min)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            ref={dateInputRef}
            className="form-blocks"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          

          <input
            className="form-blocks"
            type="number"
            min={15}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            placeholder="mins"
          />

          <select
            className="form-blocks"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}>
            <option value={1}>VERY IMPORTANT</option>
            <option value={2}>IMPORTANT</option>
            <option value={3}>LEAST IMPORTANT</option>
          </select>
          <button className="gradient-button" type="submit" disabled={creating}>
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      <div className="mt-4">
        <button
          className="text-sm underline hover:text-black"
          onClick={loadTasks}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 border rounded-xl p-3 text-sm">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      <button
        type="button"
        className="mt-3 text-sm underline hover:text-black"
        onClick={syncGoogleBusy}>
        Sync Google Calander (next 7 days)
      </button>
      <div className="busy-container">
        <div className="font-semibold">Busy Blocks (manual)</div>
        <p className="text-sm text-gray-500 mt-1">
          Add unavailable times. Scheduler will avoid these time blocks.
        </p>

        <form
          onSubmit={addBusyBlock}
          className="mt-4 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col">
            <label>Start</label>
            <input
              className="form-blocks"
              type="datetime-local"
              value={busyStart}
              onChange={(e) => setBusyStart(e.target.value)}
            />
          </div>

          <div className="flex flex-col">
            <label>End</label>
            <input
              className="form-blocks"
              type="datetime-local"
              value={busyEnd}
              onChange={(e) => setBusyEnd(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="gradient-button"
            disabled={busyCreating}>
            {busyCreating ? "Adding..." : "Add busy block"}
          </button>

          <button
            type="button"
            className="text-sm underline hover:text-black ml-2"
            onClick={loadBusyBlocks}
            disabled={busyLoading}>
            {busyLoading ? "Refreshing..." : "Refresh"}
          </button>
        </form>
        <div className="busy-blocks">
          {busyLoading ? (
            <div className="text-sm text-gray-500">Loading busy blocks...</div>
          ) : busyBlocks.length === 0 ? (
            <div className="text-sm text-gray-500">No busy blocks yet.</div>
          ) : (
            busyBlocks.map((b) => (
              <div
                key={b.id}
                className="border rounded-xl  flex: col items-start justify-between gap-4">
                <div className="text-xs">
                  <div>
                    {new Date(b.start).toLocaleString()} -{" "}
                    {new Date(b.end).toLocaleString()}
                  </div>
                </div>

                <button
                  className="delete-text"
                  onClick={() => deleteBusyBlock(b.id)}>
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {schedule && (
        <div className="busy-container">
          <div className="font-semibold">Schedule Preview (next 7 days)</div>

          <div className="mt-3 space-y-2">
            {schedule.scheduled.length == 0 ? (
              <div className="text-sm text-gray-500">
                Nothing scheduled yet.
              </div>
            ) : (
              schedule.scheduled.map((s: any) => (
                <div key={s.taskId + s.start} className="text-sm">
                  <span className="font-medium">P{s.priority}</span> - {s.title}
                  <div className="text-xs text-gray-500">
                    {new Date(s.start).toLocaleString()} →{" "}
                    {new Date(s.end).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {schedule.unschedule?.length > 0 && (
            <div className="mt-4">
              <div className="font-semibold text-sm">Unscheduled</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {schedule.unscheduled.map((u: any) => (
                  <li key={u.taskId}>
                    {u.title} -{" "}
                    <span className="text-gray-500">{u.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="tasks-container">
        <ul className="">
          <h2>Tasks</h2>
          {loading ? (
            <li className="text-gray-500">Loading…</li>
          ) : tasks.length === 0 ? (
            <li className="text-gray-500">No tasks yet.</li>
          ) : (
            tasks.map((t) => (
              <li key={t.id} className="task-blocklist">
                <div>
                  <div>{t.title}</div>
                  <div className="text-xs text-black-500 mt-1">
                    Due: {new Date(t.dueAt).toLocaleString()} •{" "}
                    {t.durationMinutes}m • {t.priority}
                  </div>
                </div>

                <button
                  className="delete-text"
                  onClick={() => deleteTask(t.id)}>
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <button
        className="gradient-button"
        onClick={generateSchedule}
        disabled={scheduling}>
        {scheduling ? "Generating..." : "Generate schedule"}
      </button>
    </main>
  );
}
