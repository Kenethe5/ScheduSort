"use client";

import { useEffect, useRef, useState } from "react";

type Task = {
  id: string;
  title: string;
  dueAt: string;
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

export function useScheduSort() {
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

  return {
    dateInputRef,
    title,
    setTitle,
    dueAt,
    setDueAt,
    durationMinutes,
    setDurationMinutes,
    tasks,
    priority,
    setPriority,
    loading,
    error,
    creating,
    busyBlocks,
    busyStart,
    setBusyStart,
    busyEnd,
    setBusyEnd,
    busyLoading,
    busyCreating,
    schedule,
    scheduling,
    loadTasks,
    loadBusyBlocks,
    syncGoogleBusy,
    addBusyBlock,
    deleteBusyBlock,
    addTask,
    deleteTask,
    generateSchedule,
  };
}
