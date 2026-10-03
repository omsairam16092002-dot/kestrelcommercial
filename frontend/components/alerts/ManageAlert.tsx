"use client";

import { useEffect, useState } from "react";
import {
  deletePropertyAlert,
  getPropertyAlert,
  updatePropertyAlert,
  type AlertMatch,
  type PublicAlert,
} from "@/lib/api";

export function ManageAlert({ token }: { token: string }) {
  const [alert, setAlert] = useState<PublicAlert | null>(null);
  const [matches, setMatches] = useState<AlertMatch[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    getPropertyAlert(token)
      .then((d) => {
        setAlert(d.alert);
        setMatches(d.matches);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load that alert."));
  }, [token]);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (removed) {
    return (
      <div className="bg-white p-6" role="status">
        <h2 className="t-h3 text-ink">Alert removed</h2>
        <p className="t-body mt-2 text-mauve">You will not get any more emails for this search.</p>
        <a href="/properties" className="btn-sharp mt-5 inline-flex bg-oxblood text-paper hover:bg-ink">
          Browse listings
        </a>
      </div>
    );
  }

  if (!alert) {
    return error ? (
      <div className="bg-white p-6" role="alert">
        <h2 className="t-h3 text-ink">Alert not found</h2>
        <p className="t-body mt-2 text-mauve">{error}</p>
      </div>
    ) : (
      <div className="h-40 animate-pulse bg-white" aria-busy="true" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 md:p-8">
        <p className="t-caption text-oxblood">
          {!alert.confirmed ? "Waiting for confirmation" : alert.active ? "Alert on" : "Alert paused"}
        </p>
        <h2 className="t-h2 mt-2 text-ink">{alert.label}</h2>
        {alert.summary !== alert.label ? <p className="mt-2 text-sm text-mauve">{alert.summary}</p> : null}
        <p className="mt-3 text-sm text-mauve">Emails go to {alert.email}</p>

        {notice ? (
          <p className="mt-5 bg-paper px-4 py-3 text-sm text-ink" role="status">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 bg-paper px-4 py-3 t-body text-oxblood" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {!alert.confirmed ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const d = await updatePropertyAlert(token, { confirm: true });
                  setAlert(d.alert);
                  setNotice("Confirmed. New matching listings will land in your inbox the moment they go live.");
                })
              }
              className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60"
            >
              Confirm my alert
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const d = await updatePropertyAlert(token, { active: !alert.active });
                  setAlert(d.alert);
                  setNotice(d.alert.active ? "Alert switched back on." : "Paused. Switch it back on any time.");
                })
              }
              className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60"
            >
              {alert.active ? "Pause alert" : "Resume alert"}
            </button>
          )}
          <a href={alert.searchPath} className="btn-sharp bg-tan text-ink hover:bg-paper">
            View this search
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                await deletePropertyAlert(token);
                setRemoved(true);
              })
            }
            className="btn-sharp bg-paper text-oxblood hover:bg-tan disabled:opacity-60"
          >
            Unsubscribe
          </button>
        </div>
      </div>

      {matches.length ? (
        <div className="bg-white p-6 md:p-8">
          <h3 className="t-h3 text-ink">Matching right now</h3>
          <ul className="mt-4 divide-y divide-oxblood/10">
            {matches.map((m) => (
              <li key={m.id}>
                <a href={`/listing/${m.slug}`} className="flex items-baseline justify-between gap-4 py-3 hover:text-oxblood">
                  <span className="text-sm font-semibold text-ink">{m.address}</span>
                  <span className="shrink-0 text-sm text-mauve">{m.priceLabel || "Contact agent"}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
