"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CONTACT_ROLES, type ContactRole, type DeskContact } from "@kestrel/shared";
import { createAdminContact, getAdminContacts } from "@/lib/adminApi";
import { LeadContactStrip } from "@/components/admin/LeadContactStrip";

export default function AdminContactsPage() {
  const [rows, setRows] = useState<DeskContact[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [newRole, setNewRole] = useState<ContactRole>("occupier");
  const [pending, setPending] = useState(false);

  const reload = useCallback(async () => {
    const data = await getAdminContacts({ q: q.trim() || undefined, role });
    setRows(data.contacts);
  }, [q, role]);

  useEffect(() => {
    reload().catch((err) => setError(err instanceof Error ? err.message : "Could not load contacts."));
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      await createAdminContact({ name: name.trim(), email, phone, company, role: newRole });
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create contact.");
    } finally {
      setPending(false);
    }
  }

  if (error && !rows.length) return <p className="text-oxblood">{error}</p>;

  return (
    <div>
      <p className="t-caption text-oxblood">CRM</p>
      <h1 className="t-h1 mt-2 text-ink">Contacts</h1>
      <p className="mt-2 text-sm text-mauve">One person across every enquiry — PropertyMe-style. Website leads land here automatically.</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-mauve">Search</span>
          <input className="kc-field w-full px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, email, company…" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Role</span>
          <select className="kc-field w-full px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All</option>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form onSubmit={onCreate} className="mt-6 grid gap-3 border border-oxblood/10 bg-paper p-4 md:grid-cols-6 md:items-end">
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-mauve">New contact</span>
          <input className="kc-field w-full px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Phone</span>
          <input className="kc-field w-full px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Email</span>
          <input className="kc-field w-full px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-mauve">Role</span>
          <select className="kc-field w-full px-3 py-2" value={newRole} onChange={(e) => setNewRole(e.target.value as ContactRole)}>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
          {pending ? "Saving…" : "Add"}
        </button>
        <label className="text-sm md:col-span-6">
          <span className="mb-1 block text-mauve">Company</span>
          <input className="kc-field w-full px-3 py-2" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>
      </form>

      {error ? <p className="mt-4 text-sm text-oxblood">{error}</p> : null}

      <ul className="mt-8 divide-y divide-oxblood/10 border border-oxblood/10 bg-paper">
        {rows.length ? (
          rows.map((row) => (
            <li key={row.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/contacts/${row.id}`} className="font-semibold text-oxblood hover:underline">
                    {row.name}
                  </Link>
                  <p className="mt-1 text-xs text-mauve">
                    {row.role}
                    {row.company ? ` · ${row.company}` : ""}
                    {typeof row.enquiryCount === "number" ? ` · ${row.enquiryCount} enquiries` : ""}
                    {row.openTaskCount ? ` · ${row.openTaskCount} open tasks` : ""}
                  </p>
                  <LeadContactStrip name={row.name} phone={row.phone} email={row.email} compact />
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="px-4 py-8 text-sm text-mauve">No contacts yet. Website enquiries create them automatically.</li>
        )}
      </ul>
    </div>
  );
}
