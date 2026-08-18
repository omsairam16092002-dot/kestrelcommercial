"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CONTACT_ROLES,
  DESK_TASK_KINDS,
  type ContactRole,
  type DeskContact,
  type DeskTask,
  type DeskTaskKind,
} from "@kestrel/shared";
import {
  addContactNote,
  createAdminTask,
  getAdminContact,
  patchAdminContact,
  patchAdminTask,
  type DeskLeadLite,
} from "@/lib/adminApi";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";
import { listingCaption } from "@/lib/contactLinks";

export default function AdminContactDetailPage() {
  const params = useParams<{ id: string }>();
  const [contact, setContact] = useState<DeskContact | null>(null);
  const [enquiries, setEnquiries] = useState<DeskLeadLite[]>([]);
  const [tasks, setTasks] = useState<DeskTask[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskKind, setTaskKind] = useState<DeskTaskKind>("follow-up");
  const [taskDue, setTaskDue] = useState("");
  const [pending, setPending] = useState(false);

  async function load(id: string) {
    const data = await getAdminContact(id);
    setContact(data.contact);
    setEnquiries(data.enquiries);
    setTasks(data.tasks);
  }

  useEffect(() => {
    if (!params.id) return;
    load(params.id).catch((err) => setError(err instanceof Error ? err.message : "Not found."));
  }, [params.id]);

  async function onRole(role: ContactRole) {
    if (!contact) return;
    const updated = await patchAdminContact(contact.id, { role });
    setContact(updated);
  }

  async function onNote(e: FormEvent) {
    e.preventDefault();
    if (!contact || !note.trim()) return;
    setPending(true);
    try {
      const updated = await addContactNote(contact.id, note.trim());
      setContact(updated);
      setNote("");
    } finally {
      setPending(false);
    }
  }

  async function onTask(e: FormEvent) {
    e.preventDefault();
    if (!contact || !taskTitle.trim()) return;
    setPending(true);
    try {
      await createAdminTask({
        title: taskTitle.trim(),
        kind: taskKind,
        dueAt: taskDue || null,
        contactId: contact.id,
      });
      setTaskTitle("");
      setTaskDue("");
      if (params.id) await load(params.id);
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="text-oxblood">{error}</p>;
  if (!contact) return <p className="text-mauve">Loading contact…</p>;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/contacts" className="text-sm font-semibold text-oxblood hover:underline">
        ← Contacts
      </Link>
      <p className="t-caption mt-6 text-oxblood">{contact.role}</p>
      <h1 className="t-h1 mt-2 text-ink">{contact.name}</h1>
      {contact.company ? <p className="mt-1 text-sm text-mauve">{contact.company}</p> : null}
      <LeadContactStrip name={contact.name} phone={contact.phone} email={contact.email} />

      <label className="mt-6 block text-sm">
        <span className="mb-1 block text-mauve">Role</span>
        <select className="kc-field px-3 py-2" value={contact.role} onChange={(e) => void onRole(e.target.value as ContactRole)}>
          {CONTACT_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <section className="mt-10">
        <h2 className="t-h3 text-ink">Tasks</h2>
        <ul className="mt-4 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
          {tasks.length ? (
            tasks.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className={`text-sm ${task.status === "done" ? "text-mauve line-through" : "text-ink"}`}>{task.title}</p>
                  <p className="mt-1 text-xs text-mauve">
                    {task.kind}
                    {task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString("en-AU")}` : ""}
                  </p>
                </div>
                {task.status !== "done" ? (
                  <button
                    type="button"
                    className="btn-sharp border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper"
                    onClick={() =>
                      void patchAdminTask(task.id, { status: "done" }).then(() => {
                        if (params.id) return load(params.id);
                      })
                    }
                  >
                    Done
                  </button>
                ) : null}
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-sm text-mauve">No tasks yet.</li>
          )}
        </ul>
        <form onSubmit={onTask} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-mauve">New task</span>
            <input className="kc-field w-full px-3 py-2" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Call back, send IM…" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Kind</span>
            <select className="kc-field w-full px-3 py-2" value={taskKind} onChange={(e) => setTaskKind(e.target.value as DeskTaskKind)}>
              {DESK_TASK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Due</span>
            <input type="date" className="kc-field w-full px-3 py-2" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          </label>
          <button type="submit" disabled={pending} className="btn-sharp bg-ink text-paper hover:bg-oxblood disabled:opacity-60">
            Add
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Enquiries</h2>
        <ul className="mt-4 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
          {enquiries.length ? (
            enquiries.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <Link href={`/admin/enquiries/${row.id}`} className="font-semibold text-oxblood hover:underline">
                  {row.intent} · {row.crmStage}
                </Link>
                <p className="mt-1 text-xs text-mauve">
                  {listingCaption(row.property, row.propertySlug) || row.source}
                  {row.inspectionAttendance ? ` · ${row.inspectionAttendance}` : ""}
                </p>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-sm text-mauve">No linked enquiries.</li>
          )}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Notes</h2>
        <ul className="mt-4 space-y-3">
          {(contact.notes ?? []).slice().reverse().map((n, i) => (
            <li key={`${n.at}-${i}`} className="border-l-2 border-tan pl-3">
              <p className="text-sm text-ink">{n.text}</p>
              <p className="mt-1 text-xs text-mauve">
                {n.by} · {new Date(n.at).toLocaleString("en-AU")}
              </p>
            </li>
          ))}
        </ul>
        <form onSubmit={onNote} className="mt-4 space-y-3">
          <textarea className="kc-field min-h-24 w-full px-3 py-3" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
            Add note
          </button>
        </form>
      </section>
    </div>
  );
}
