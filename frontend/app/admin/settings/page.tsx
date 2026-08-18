"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Agent } from "@kestrel/shared";
import {
  getAdminAgents,
  getDeskHealth,
  getIntegrationsStatus,
  getLeadSources,
  getSyndicationStatus,
  patchAgent,
  revalidatePublicSite,
  signAndUploadImage,
  uploadStatus,
  downloadReaxml,
  type IntegrationsStatus,
  type LeadSourcesStatus,
  type SyndicationStatus,
} from "@/lib/adminApi";
import { agentPortraitSrc } from "@/lib/images";

export default function AdminSettingsPage() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [cloudinary, setCloudinary] = useState<{ ready: boolean; note?: string } | null>(null);
  const [health, setHealth] = useState<{ db: string; cloudinary: boolean; xero: boolean; pexa: boolean; redis: boolean } | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [leadSources, setLeadSources] = useState<LeadSourcesStatus | null>(null);
  const [syndication, setSyndication] = useState<SyndicationStatus | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    Promise.all([getAdminAgents(), uploadStatus(), getDeskHealth(), getIntegrationsStatus(), getLeadSources(), getSyndicationStatus()])
      .then(([agents, upload, desk, integ, sources, syn]) => {
        setAgent(agents[0] ?? null);
        setCloudinary(upload);
        setHealth(desk);
        setIntegrations(integ);
        setLeadSources(sources);
        setSyndication(syn);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings."));
  }, []);

  async function persist(next: Agent) {
    const updated = await patchAgent(next.licenceNumber, {
      name: next.name,
      title: next.title,
      bio: next.bio,
      email: next.email,
      phone: next.phone,
      photoPublicId: next.photoPublicId,
    });
    setAgent(updated);
    await revalidatePublicSite().catch(() => undefined);
    return updated;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agent) return;
    setPending(true);
    setSaved("");
    setError("");
    try {
      await persist(agent);
      setSaved("Saved. Public site will show this portrait immediately.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  async function onPhoto(files: FileList | null) {
    const file = files?.[0];
    if (!file || !agent) return;
    setPending(true);
    setError("");
    try {
      const publicId = await signAndUploadImage(file, "kestrel/agents");
      const next = { ...agent, photoPublicId: publicId };
      setAgent(next);
      await persist(next);
      setSaved("Portrait uploaded and saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload portrait.");
    } finally {
      setPending(false);
    }
  }

  if (error && !agent) return <p className="text-oxblood">{error}</p>;
  if (!agent) return <p className="text-mauve">Loading settings…</p>;

  const preview = agentPortraitSrc(agent.photoPublicId, 480);
  const cards = [
    { k: "Mongo", v: health?.db || "unknown" },
    { k: "Cloudinary", v: (health?.cloudinary || cloudinary?.ready) ? "Live" : "Off", note: cloudinary?.note },
    { k: "Xero", v: health?.xero ? "Configured" : "Off" },
    { k: "PEXA", v: health?.pexa ? "Configured" : "Off" },
  ];

  return (
    <div className="max-w-3xl">
      <p className="t-caption text-oxblood">Desk</p>
      <h1 className="t-h1 mt-2 text-ink">Settings</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.k} className="border-t-2 border-oxblood bg-paper px-5 py-4">
            <p className="t-caption text-mauve">{card.k}</p>
            <p className="t-h3 mt-2 text-ink">{card.v}</p>
            {"note" in card && card.note ? <p className="mt-1 text-xs text-mauve">{card.note}</p> : null}
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Lead sources</h2>
        <p className="mt-2 text-sm text-mauve">
          realestate.com.au and realcommercial.com.au email enquiries to this capture address. Point the portal at it, or forward a copy from your inbox.
        </p>
        <div className="mt-6 border-t-2 border-oxblood bg-paper px-5 py-6">
          <p className="t-caption text-oxblood">Capture address</p>
          <p className="t-mono-lg mt-2 break-all text-ink">{leadSources?.captureEmail || "leads@leads.kestrelcommercial.com"}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-oxblood hover:underline"
            onClick={() => {
              const addr = leadSources?.captureEmail;
              if (addr) void navigator.clipboard.writeText(addr);
            }}
          >
            Copy address
          </button>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {(leadSources?.portals ?? []).map((portal) => (
            <div key={portal.source} className={`border px-5 py-5 ${portal.quiet ? "border-oxblood bg-paper" : "border-oxblood/15 bg-paper"}`}>
              <p className="t-caption text-oxblood">{portal.source === "portal-rea" ? "realestate.com.au" : "realcommercial.com.au"}</p>
              <p className="t-h3 mt-2 text-ink">
                {portal.lastParsedAt ? new Date(portal.lastParsedAt).toLocaleString("en-AU") : "No parsed lead yet"}
              </p>
              {portal.warning ? <p className="mt-2 text-sm text-oxblood">{portal.warning}</p> : <p className="mt-2 text-sm text-mauve">Last received {portal.lastReceivedAt ? new Date(portal.lastReceivedAt).toLocaleString("en-AU") : "never"}</p>}
            </div>
          ))}
        </div>
        <ol className="t-body mt-6 list-decimal space-y-2 pl-5 text-ink/80">
          {(leadSources?.setup ?? []).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">External syndication</h2>
        <p className="mt-2 text-sm text-mauve">
          {syndication?.note ||
            "Syndication requires a certified feed provider or direct portal certification. This is not a publish button."}
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="border-t-2 border-oxblood bg-paper px-5 py-5">
            <p className="t-caption text-oxblood">realcommercial.com.au</p>
            <p className="t-h3 mt-2 text-ink">{syndication?.realcommercial.status || "not connected"}</p>
          </div>
          <div className="border-t-2 border-oxblood bg-paper px-5 py-5">
            <p className="t-caption text-oxblood">commercialrealestate.com.au</p>
            <p className="t-h3 mt-2 text-ink">{syndication?.commercialRealEstate.status || "not connected"}</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-sharp mt-4 border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper"
          onClick={() => void downloadReaxml("/api/properties/feed.xml", "kestrel-listings.xml")}
        >
          Download all active listings (REAXML)
        </button>
      </section>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Integrations</h2>
        <p className="mt-2 text-sm text-mauve">
          Connect Xero and Pexa Clear when credentials are in backend <span className="t-mono">.env</span>. We never invent invoice or workspace IDs.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="border border-oxblood/15 bg-paper p-5">
            <p className="t-caption text-oxblood">Xero</p>
            <p className="t-h3 mt-2 text-ink">{integrations?.xero.configured ? "Ready to connect" : "Not configured"}</p>
            <p className="mt-2 text-sm text-mauve">{integrations?.xero.note}</p>
            <button
              type="button"
              disabled={!integrations?.xero.configured}
              className="btn-sharp mt-4 bg-oxblood text-paper hover:bg-ink disabled:opacity-50"
              onClick={() => {
                window.location.href = "/api/integrations/xero/connect";
              }}
            >
              Connect Xero
            </button>
          </div>
          <div className="border border-oxblood/15 bg-paper p-5">
            <p className="t-caption text-oxblood">Pexa Clear</p>
            <p className="t-h3 mt-2 text-ink">{integrations?.pexa.configured ? "Ready to connect" : "Not configured"}</p>
            <p className="mt-2 text-sm text-mauve">{integrations?.pexa.note}</p>
            <button
              type="button"
              disabled={!integrations?.pexa.configured}
              className="btn-sharp mt-4 bg-oxblood text-paper hover:bg-ink disabled:opacity-50"
              onClick={() => {
                window.location.href = "/api/integrations/pexa/connect";
              }}
            >
              Connect Pexa Clear
            </button>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto border border-oxblood/10 bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-oxblood/10 t-caption text-mauve">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Integration</th>
                <th className="px-4 py-3 font-medium">Ref</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {integrations?.recentLogs.length ? (
                integrations.recentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-oxblood/5">
                    <td className="px-4 py-3 t-mono text-xs">
                      {log.createdAt || log.lastAttempt
                        ? new Date(log.createdAt || log.lastAttempt || "").toLocaleString("en-AU")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{log.integration}</td>
                    <td className="px-4 py-3 t-mono text-xs">{log.recordRef}</td>
                    <td className="px-4 py-3">
                      {log.status}
                      {log.error ? <p className="mt-1 text-xs text-mauve">{log.error}</p> : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-mauve">
                    No sync logs yet. Sold listings enqueue Xero invoice jobs; a PEXA workspace id on a listing enqueues settlement poll. Both stay skipped until tokens exist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="t-h3 text-ink">Coming next</h2>
        <p className="mt-2 text-sm text-mauve">Labelled only — no fake publish or trust buttons.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="border-t-2 border-tan bg-paper px-5 py-5">
            <p className="t-caption text-oxblood">Trust account booking</p>
            <p className="t-h3 mt-2 text-ink">Deposits, advertising, settlement</p>
            <p className="mt-2 text-sm text-mauve">
              PropertyMe / Vault-style trust ledgers for deposits, advertising spend and settlement adjustments. Not in this desk yet.
            </p>
          </div>
          <div className="border-t-2 border-tan bg-paper px-5 py-5">
            <p className="t-caption text-oxblood">Portal push</p>
            <p className="t-h3 mt-2 text-ink">Domain · REA · CRE</p>
            <p className="mt-2 text-sm text-mauve">
              REAXML download is live. Automated push to Domain, REA and CRE waits on a certified feed provider — status stays not connected until then.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="mt-12 space-y-4">
        <h2 className="t-h3 text-ink">Listing agent</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Name</span>
          <input className="kc-field w-full px-3 py-3" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Title</span>
          <input className="kc-field w-full px-3 py-3" value={agent.title ?? ""} onChange={(e) => setAgent({ ...agent, title: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Email</span>
          <input className="kc-field w-full px-3 py-3" value={agent.email} onChange={(e) => setAgent({ ...agent, email: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Phone</span>
          <input className="kc-field w-full px-3 py-3" value={agent.phone} onChange={(e) => setAgent({ ...agent, phone: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Bio</span>
          <textarea className="kc-field min-h-32 w-full px-3 py-3" value={agent.bio ?? ""} onChange={(e) => setAgent({ ...agent, bio: e.target.value })} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-mauve">Portrait</span>
          <input type="file" accept="image/*" onChange={(e) => void onPhoto(e.target.files)} />
          <p className="mt-1 t-mono text-xs text-mauve">{agent.photoPublicId || "none — Unsplash stock until you upload"}</p>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="mt-3 h-40 w-40 object-cover object-top" />
          ) : null}
        </label>
        {error ? <p className="text-sm text-oxblood">{error}</p> : null}
        {saved ? <p className="text-sm text-oxblood">{saved}</p> : null}
        <button type="submit" disabled={pending} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save agent"}
        </button>
      </form>
    </div>
  );
}
