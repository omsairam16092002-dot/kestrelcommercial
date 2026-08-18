"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DESK_TASK_KINDS, type DeskTask, type DeskTaskKind } from "@kestrel/shared";
import { createAdminTask, getAdminTasks, patchAdminTask } from "@/lib/adminApi";

export default function AdminTasksPage() {
  const [rows, setRows] = useState<DeskTask[]>([]);
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("all");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [newKind, setNewKind] = useState<DeskTaskKind>("follow-up");
  const [due, setDue] = useState("");
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    const data = await getAdminTasks({ status, kind });
    setRows(data.tasks);
  }, [status, kind]);

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load tasks."));
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    try {
      await createAdminTask({ title: title.trim(), kind: newKind, dueAt: due || null });
      setTitle("");
      setDue("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(task: DeskTask) {
    await patchAdminTask(task.id, { status: task.status === "done" ? "open" : "done" });
    await reload();
  }

  if (error && !rows.length) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <p className="t-caption text-oxblood">CRM</p>
      <h1 className="t-h1 mt-2 text-ink">Tasks</h1>
      <p className="mt-2 text-sm text-mauve">Follow-ups, calls, inspections and appraisal chasers — not a fake automation engine.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Status</span>
          <select className="kc-field w-full px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option>
            <option value="done">Done</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Kind</span>
          <select className="kc-field w-full px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All</option>
            {DESK_TASK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form onSubmit={onCreate} className="mt-6 grid gap-3 border border-oxblood/10 bg-paper p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="mb-1 block text-mauve">New task</span>
          <input className="kc-field w-full px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call Romeesh about Truganina…" required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Kind</span>
          <select className="kc-field w-full px-3 py-2" value={newKind} onChange={(e) => setNewKind(e.target.value as DeskTaskKind)}>
            {DESK_TASK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Due</span>
          <input type="date" className="kc-field w-full px-3 py-2" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
          Add
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      <ul className="mt-8 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
        {rows.length ? (
          rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className={`font-semibold ${row.status === "done" ? "text-mauve line-through" : "text-ink"}`}>{row.title}</p>
                <p className="mt-1 text-xs text-mauve">
                  {row.kind}
                  {row.dueAt ? ` · ${new Date(row.dueAt).toLocaleDateString("en-AU")}` : ""}
                  {row.contactName ? ` · ${row.contactName}` : ""}
                </p>
                {row.contactId ? (
                  <Link href={`/admin/contacts/${row.contactId}`} className="mt-1 inline-block text-xs font-semibold text-oxblood hover:underline">
                    Contact
                  </Link>
                ) : null}
                {row.enquiryId ? (
                  <Link href={`/admin/enquiries/${row.enquiryId}`} className="mt-1 ml-3 inline-block text-xs font-semibold text-oxblood hover:underline">
                    Enquiry
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper"
                onClick={() => void toggle(row)}
              >
                {row.status === "done" ? "Reopen" : "Done"}
              </button>
            </li>
          ))
        ) : (
          <li className="px-4 py-8 text-sm text-mauve">Nothing here. Appraisal and inspection leads create a task automatically.</li>
        )}
      </ul>
    </div>
  );
}
