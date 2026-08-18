import type { EnquiryPropertySummary } from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";

export type EnquiryPropertyMaps = {
  bySlug: Map<string, EnquiryPropertySummary>;
  byId: Map<string, EnquiryPropertySummary>;
};

function asLeadRef(doc: unknown): { propertySlug?: string | null; propertyId?: unknown } {
  if (!doc || typeof doc !== "object") return {};
  const row = doc as { propertySlug?: unknown; propertyId?: unknown };
  return {
    propertySlug: typeof row.propertySlug === "string" ? row.propertySlug : null,
    propertyId: row.propertyId,
  };
}

function summaryFromDoc(doc: Record<string, unknown>): EnquiryPropertySummary {
  return {
    id: String(doc._id ?? doc.id ?? ""),
    slug: String(doc.slug ?? ""),
    address: String(doc.address ?? ""),
    suburb: String(doc.suburb ?? ""),
    priceLabel: String(doc.priceLabel ?? ""),
  };
}

export async function lookupEnquiryProperties(docs: unknown[]): Promise<EnquiryPropertyMaps> {
  const bySlug = new Map<string, EnquiryPropertySummary>();
  const byId = new Map<string, EnquiryPropertySummary>();
  if (!isDbConnected()) return { bySlug, byId };

  const slugs = [
    ...new Set(docs.map((d) => asLeadRef(d).propertySlug).filter((s): s is string => Boolean(s))),
  ];
  const ids = [
    ...new Set(
      docs
        .map((d) => {
          const id = asLeadRef(d).propertyId;
          return id ? String(id) : "";
        })
        .filter((id) => /^[a-f0-9]{24}$/i.test(id)),
    ),
  ];
  if (!slugs.length && !ids.length) return { bySlug, byId };

  const or: Record<string, unknown>[] = [];
  if (slugs.length) or.push({ slug: { $in: slugs } });
  if (ids.length) or.push({ _id: { $in: ids } });

  const found = await PropertyModel.find(or.length === 1 ? or[0]! : { $or: or })
    .select("_id slug address suburb priceLabel")
    .lean();

  for (const row of found) {
    const summary = summaryFromDoc(row as Record<string, unknown>);
    if (summary.slug) bySlug.set(summary.slug, summary);
    byId.set(summary.id, summary);
  }
  return { bySlug, byId };
}

export function pickEnquiryProperty(doc: unknown, maps: EnquiryPropertyMaps): EnquiryPropertySummary | null {
  const ref = asLeadRef(doc);
  if (ref.propertySlug && maps.bySlug.has(ref.propertySlug)) return maps.bySlug.get(ref.propertySlug) ?? null;
  const id = ref.propertyId ? String(ref.propertyId) : "";
  if (id && maps.byId.has(id)) return maps.byId.get(id) ?? null;
  return null;
}

export async function resolveListedProperty(slug?: string | null, id?: string | null) {
  if (!isDbConnected()) return null;
  const query =
    id && /^[a-f0-9]{24}$/i.test(id) ? { _id: id } : slug ? { slug } : null;
  if (!query) return null;
  const listed = await PropertyModel.findOne(query)
    .select("_id slug address suburb priceLabel")
    .lean();
  if (!listed || Array.isArray(listed)) return null;
  return summaryFromDoc(listed as Record<string, unknown>);
}
