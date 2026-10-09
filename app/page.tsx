"use client";

import { useScheduSort } from "./hooks/useScheduSort";
import "./styles/home.css";

export default function Home() {
  const {
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
  } = useScheduSort();

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
