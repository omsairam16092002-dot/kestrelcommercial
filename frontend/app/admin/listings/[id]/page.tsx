"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Agent, Property } from "@kestrel/shared";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { getAdminAgents, getAdminListing, getDeskActivity, type DeskActivity } from "@/lib/adminApi";

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Property | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activity, setActivity] = useState<DeskActivity[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    Promise.all([
      getAdminListing(params.id),
      getAdminAgents(),
      getDeskActivity({ entityType: "listing", entityId: params.id, limit: 12 }).catch(() => ({ activity: [] })),
    ])
      .then(([found, desk, feed]) => {
        setListing(found);
        setAgents(desk);
        setActivity(feed.activity);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load listing."));
  }, [params.id]);

  if (error) return <p className="text-oxblood">{error}</p>;
  if (!listing) return <p className="text-mauve">Loading listing…</p>;

  return (
    <div>
      <Link href="/admin/listings" className="text-sm font-semibold text-oxblood hover:underline">
        ← Listings
      </Link>
      <h1 className="t-h1 mt-4 text-ink">{listing.address}</h1>
      <p className="t-mono mt-2 text-mauve">
        {listing.slug} · {listing.leadCount ?? 0} leads · {listing.images?.length ?? 0} images
      </p>
      <p className="mt-3">
        <Link href={`/listing/${listing.slug}`} className="text-sm font-semibold text-oxblood hover:underline">
          View public listing →
        </Link>
      </p>
      {activity.length ? (
        <ul className="mt-6 space-y-2 border border-oxblood/10 bg-paper px-4 py-3">
          {activity.map((row) => (
            <li key={row.id} className="text-xs text-mauve">
              {row.summary} · {new Date(row.at).toLocaleString("en-AU")}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8">
        <ListingEditor agents={agents} initial={listing} />
      </div>
    </div>
  );
}
