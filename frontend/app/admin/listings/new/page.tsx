"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Agent } from "@kestrel/shared";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { getAdminAgents } from "@/lib/adminApi";

export default function NewListingPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminAgents()
      .then(setAgents)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load agents."));
  }, []);

  if (error) return <p className="text-oxblood">{error}</p>;
  if (!agents) return <p className="text-mauve">Loading…</p>;

  return (
    <div>
      <Link href="/admin/listings" className="text-sm font-semibold text-oxblood hover:underline">
        ← Listings
      </Link>
      <h1 className="t-h1 mt-4 text-ink">New listing</h1>
      <div className="mt-8">
        <ListingEditor agents={agents} />
      </div>
    </div>
  );
}
