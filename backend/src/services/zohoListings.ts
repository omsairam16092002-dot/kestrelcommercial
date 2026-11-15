/**
 * Two-way listing sync with Zoho CRM.
 *
 * Website → Zoho: every listing save upserts a CRM record (Properties module when the org has
 * one, otherwise Products). Zoho → website: the scheduler pulls records changed since the last
 * poll and creates or updates Mongo listings, including a hero image when Cloudinary can fetch it.
 *
 * Matching key is the listing slug, stored as Product_Code / Kestrel_Slug (`kc-{slug}`).
 */
import {
  AGENCY,
  ASSET_CATEGORIES,
  PROPERTY_TYPES,
  deriveAssetCategory,
  resolveImageSrc,
  type AssetCategory,
  type PropertyStatus,
  type PropertyType,
  type TransactionSide,
} from "@kestrel/shared";
import { env } from "../config/env";
import { isDbConnected } from "../db/mongoose";
import { IntegrationCredentialModel } from "../models/IntegrationCredential";
import { PropertyModel } from "../models/Property";
import { SyncLogModel } from "../models/SyncLog";
import { invalidatePropertyListCache } from "./propertyCache";
import { isCloudinaryReady, uploadImageFromUrl } from "./cloudinary";
import { SETTINGS_SCOPES, ZohoError, zohoContext, zohoCrmFetch } from "./zoho";

type Ctx = NonNullable<Awaited<ReturnType<typeof zohoContext>>>;
type Field = { api_name: string; field_label?: string; data_type?: string };
type MapKey =
  | "name"
  | "slug"
  | "address"
  | "suburb"
  | "state"
  | "postcode"
  | "status"
  | "side"
  | "priceLabel"
  | "priceValue"
  | "floor"
  | "land"
  | "zoning"
  | "type"
  | "category"
  | "description"
  | "featured"
  | "active"
  | "bedrooms"
  | "bathrooms"
  | "cars"
  | "website"
  | "hero";

const ALIASES: Record<MapKey, string[]> = {
  name: ["Product_Name", "Property_Name", "Name", "Listing_Name"],
  slug: ["Kestrel_Slug", "Product_Code", "Listing_Code", "Property_Code"],
  address: ["Street", "Address", "Property_Address", "Street_Address"],
  suburb: ["Suburb", "City", "District", "Town"],
  state: ["State", "Province"],
  postcode: ["Postcode", "Zip_Code", "Postal_Code", "ZIP_Code"],
  status: ["Listing_Status", "Kestrel_Status", "Property_Status", "Status"],
  side: ["Transaction_Side", "Kestrel_Side", "Sale_or_Lease"],
  priceLabel: ["Price_Label", "Kestrel_Price_Label"],
  priceValue: ["Unit_Price", "Asking_Price", "List_Price", "Price", "Expected_Price"],
  floor: ["Floor_Area_Sqm", "Floor_Area", "Building_Area"],
  land: ["Land_Area_Sqm", "Land_Area", "Lot_Size"],
  zoning: ["Zoning", "Kestrel_Zoning"],
  type: ["Kestrel_Property_Type", "Property_Type", "Listing_Type"],
  category: ["Asset_Category", "Kestrel_Category"],
  description: ["Description", "Property_Description"],
  featured: ["Featured", "Kestrel_Featured"],
  active: ["Product_Active", "Active"],
  bedrooms: ["Bedrooms", "No_of_Bedrooms"],
  bathrooms: ["Bathrooms", "No_of_Bathrooms"],
  cars: ["Car_Spaces", "Parking", "Garage"],
  website: ["Website", "Website_URL", "Listing_URL"],
  hero: ["Hero_Image_URL", "Main_Photo", "Photo_URL"],
};

const CREATE_FIELDS: { key: MapKey; label: string; data_type: string; length?: number }[] = [
  { key: "slug", label: "Kestrel Slug", data_type: "text", length: 120 },
  { key: "address", label: "Street", data_type: "text", length: 255 },
  { key: "suburb", label: "Suburb", data_type: "text", length: 80 },
  { key: "state", label: "State", data_type: "text", length: 20 },
  { key: "postcode", label: "Postcode", data_type: "text", length: 12 },
  { key: "status", label: "Listing Status", data_type: "text", length: 40 },
  { key: "side", label: "Transaction Side", data_type: "text", length: 20 },
  { key: "priceLabel", label: "Price Label", data_type: "text", length: 120 },
  { key: "floor", label: "Floor Area Sqm", data_type: "double" },
  { key: "land", label: "Land Area Sqm", data_type: "double" },
  { key: "zoning", label: "Zoning", data_type: "text", length: 40 },
  { key: "type", label: "Kestrel Property Type", data_type: "text", length: 40 },
  { key: "category", label: "Asset Category", data_type: "text", length: 40 },
  { key: "featured", label: "Featured", data_type: "boolean" },
  { key: "bedrooms", label: "Bedrooms", data_type: "integer" },
  { key: "bathrooms", label: "Bathrooms", data_type: "integer" },
  { key: "cars", label: "Car Spaces", data_type: "integer" },
  { key: "website", label: "Website URL", data_type: "website" },
  { key: "hero", label: "Hero Image URL", data_type: "website" },
];

const PREFERRED_MODULES = ["Properties", "Listings", "Products"];
const CODE_PREFIX = "kc-";

let cachedModule: string | null = null;
let cachedFields: Field[] | null = null;
let lastListingError: { message: string; at: string } | null = null;

function hasScopes(scope: string, needed: string[]) {
  const granted = scope.split(/[\s,]+/).filter(Boolean);
  return needed.every((s) => granted.includes(s));
}

function recordError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  lastListingError = { message: message.slice(0, 400), at: new Date().toISOString() };
  console.error("[zoho-listings]", message);
}

function setField(record: Record<string, unknown>, fields: Field[], key: MapKey, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  const names = new Set(fields.map((f) => f.api_name));
  const api = ALIASES[key].find((name) => names.has(name));
  if (api) record[api] = value;
}

function getField(row: Record<string, unknown>, fields: Field[], key: MapKey): unknown {
  const names = new Set(fields.map((f) => f.api_name));
  const api = ALIASES[key].find((name) => names.has(name) && row[name] != null && row[name] !== "");
  return api ? row[api] : undefined;
}

function slugCode(slug: string) {
  return `${CODE_PREFIX}${slug}`.slice(0, 120);
}

function slugFromCode(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return value.toLowerCase().startsWith(CODE_PREFIX) ? value.slice(CODE_PREFIX.length) : value;
}

function slugify(address: string, suburb: string) {
  return `${address} ${suburb}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || `listing-${Date.now()}`;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = String(value ?? "").toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function parseStatus(raw: unknown, side: TransactionSide): PropertyStatus {
  const s = String(raw ?? "").toLowerCase().replace(/\s+/g, "-");
  const allowed: PropertyStatus[] = ["for-sale", "for-lease", "under-offer", "sold", "leased"];
  if ((allowed as string[]).includes(s)) return s as PropertyStatus;
  if (s.includes("lease") && s.includes("sold")) return "leased";
  if (s.includes("sold") || s.includes("settled")) return "sold";
  if (s.includes("offer")) return "under-offer";
  if (s.includes("lease")) return "for-lease";
  return side === "lease" ? "for-lease" : "for-sale";
}

function parseSide(raw: unknown, status: string): TransactionSide {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("lease") || s.includes("rent")) return "lease";
  if (s.includes("sale") || s.includes("sell")) return "sale";
  return status === "for-lease" || status === "leased" ? "lease" : "sale";
}

function parseType(raw: unknown): PropertyType {
  const s = String(raw ?? "").toLowerCase().replace(/\s+/g, "-");
  if ((PROPERTY_TYPES as readonly string[]).includes(s)) return s as PropertyType;
  if (s.includes("warehouse") && s.includes("office")) return "office-warehouse";
  if (s.includes("warehouse")) return "warehouse";
  if (s.includes("land") || s.includes("development")) return "development-land";
  if (s.includes("showroom")) return "showroom";
  if (s.includes("retail") || s.includes("shop")) return "retail";
  if (s.includes("office")) return "office";
  if (s.includes("house") || s.includes("residential")) return "house";
  if (s.includes("town")) return "townhouse";
  if (s.includes("apartment") || s.includes("unit")) return "apartment";
  if (s.includes("rural") || s.includes("farm")) return "rural";
  if (s.includes("yard")) return "yard";
  return "warehouse";
}

function parseCategory(raw: unknown, type: PropertyType): AssetCategory {
  const s = String(raw ?? "").toLowerCase();
  if ((ASSET_CATEGORIES as readonly string[]).includes(s)) return s as AssetCategory;
  if (s.includes("residential")) return "residential";
  if (s.includes("development")) return "development-site";
  return deriveAssetCategory(type);
}

function priceLabelFrom(value: number | null, side: TransactionSide, existing?: string) {
  if (existing?.trim()) return existing.trim();
  if (value == null) return "Contact agent";
  const formatted = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
  return side === "lease" ? `${formatted} pa` : formatted;
}

async function listingIdFromResult(data: Record<string, unknown>, step: string) {
  const row = (data.data as { code?: string; message?: string; details?: { id?: string; api_name?: string } }[] | undefined)?.[0];
  if (!row || row.code !== "SUCCESS" || !row.details?.id) {
    const reason = row ? `${row.code}: ${row.message ?? ""}${row.details?.api_name ? ` (${row.details.api_name})` : ""}` : String(data.code ?? data.message ?? "no response");
    throw new ZohoError(`${step} failed — ${reason}`.trim());
  }
  return row.details.id;
}

async function discoverModule(ctx: Ctx): Promise<string> {
  if (cachedModule) return cachedModule;
  const stored = (await IntegrationCredentialModel.findOne({ integration: "zoho" }).select("listingModule").lean()) as { listingModule?: string } | null;
  if (stored?.listingModule) {
    cachedModule = stored.listingModule;
    return cachedModule;
  }
  let names: string[] = ["Products"];
  if (hasScopes(ctx.scope, ["ZohoCRM.settings.modules.READ"])) {
    const { res, data } = await zohoCrmFetch(ctx.apiDomain, ctx.token, "settings/modules");
    if (res.ok) {
      const modules = (data.modules as { api_name?: string; visible?: boolean }[] | undefined) ?? [];
      names = modules.filter((m) => m.visible !== false && m.api_name).map((m) => m.api_name as string);
    }
  }
  const chosen = PREFERRED_MODULES.find((name) => names.includes(name)) ?? "Products";
  cachedModule = chosen;
  await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { listingModule: chosen });
  return chosen;
}

const FALLBACK_FIELDS: Field[] = [
  { api_name: "Product_Name" },
  { api_name: "Property_Name" },
  { api_name: "Name" },
  { api_name: "Product_Code" },
  { api_name: "Description" },
  { api_name: "Unit_Price" },
  { api_name: "Product_Active" },
];

async function loadFields(ctx: Ctx, module: string): Promise<Field[]> {
  if (cachedFields) return cachedFields;
  if (!hasScopes(ctx.scope, ["ZohoCRM.settings.fields.READ"])) {
    cachedFields = FALLBACK_FIELDS;
    return cachedFields;
  }
  const { res, data } = await zohoCrmFetch(ctx.apiDomain, ctx.token, `settings/fields?module=${encodeURIComponent(module)}`);
  if (!res.ok) {
    cachedFields = FALLBACK_FIELDS;
    return cachedFields;
  }
  cachedFields = ((data.fields as Field[] | undefined) ?? []).filter((f) => f.api_name);
  return cachedFields;
}

export function clearZohoListingCache() {
  cachedModule = null;
  cachedFields = null;
}

async function ensureCustomFields(ctx: Ctx, module: string, fields: Field[]) {
  if (!hasScopes(ctx.scope, SETTINGS_SCOPES)) return fields;
  const have = new Set(fields.flatMap((f) => [f.api_name, (f.field_label ?? "").replace(/\s+/g, "_")]));
  const missing = CREATE_FIELDS.filter((spec) => !ALIASES[spec.key].some((alias) => have.has(alias)));
  for (const spec of missing) {
    const { res, data } = await zohoCrmFetch(ctx.apiDomain, ctx.token, `settings/fields?module=${encodeURIComponent(module)}`, {
      method: "POST",
      body: JSON.stringify({
        fields: [{ field_label: spec.label, data_type: spec.data_type, ...(spec.length ? { length: spec.length } : {}) }],
      }),
    });
    const api = (data.fields as { api_name?: string }[] | undefined)?.[0]?.api_name;
    if (res.ok && api) {
      fields.push({ api_name: api, field_label: spec.label, data_type: spec.data_type });
      ALIASES[spec.key].unshift(api);
    } else if (res.status !== 400) {
      console.warn("[zoho-listings] field create skipped", spec.label, data);
    }
  }
  cachedFields = fields;
  return fields;
}

type PropertyDoc = {
  _id: unknown;
  slug: string;
  address: string;
  suburb: string;
  state?: string;
  postcode: string;
  status: PropertyStatus;
  transactionSide: TransactionSide;
  priceLabel: string;
  priceValue?: number | null;
  floorAreaSqm?: number | null;
  landAreaSqm?: number | null;
  zoning: string;
  propertyType: PropertyType;
  assetCategory?: AssetCategory;
  description: string;
  featured?: boolean;
  archived?: boolean;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carSpaces?: number | null;
  images?: { publicId: string; isHero?: boolean; alt?: string }[];
  zohoListingId?: string;
};

function heroUrl(doc: PropertyDoc) {
  const hero = doc.images?.find((i) => i.isHero) ?? doc.images?.[0];
  if (!hero?.publicId || !env.cloudinary.cloudName) return "";
  return resolveImageSrc(hero.publicId, env.cloudinary.cloudName, { width: 1600, context: "flagship" });
}

function toZohoRecord(doc: PropertyDoc, fields: Field[]) {
  const record: Record<string, unknown> = {};
  const name = `${doc.address}, ${doc.suburb}`.slice(0, 120);
  setField(record, fields, "name", name);
  setField(record, fields, "slug", slugCode(doc.slug));
  setField(record, fields, "address", doc.address);
  setField(record, fields, "suburb", doc.suburb);
  setField(record, fields, "state", doc.state || "VIC");
  setField(record, fields, "postcode", doc.postcode);
  setField(record, fields, "status", doc.status);
  setField(record, fields, "side", doc.transactionSide);
  setField(record, fields, "priceLabel", doc.priceLabel);
  if (doc.priceValue != null) setField(record, fields, "priceValue", doc.priceValue);
  if (doc.floorAreaSqm != null) setField(record, fields, "floor", doc.floorAreaSqm);
  if (doc.landAreaSqm != null) setField(record, fields, "land", doc.landAreaSqm);
  setField(record, fields, "zoning", doc.zoning);
  setField(record, fields, "type", doc.propertyType);
  setField(record, fields, "category", doc.assetCategory ?? deriveAssetCategory(doc.propertyType));
  setField(record, fields, "description", doc.description);
  setField(record, fields, "featured", Boolean(doc.featured));
  setField(record, fields, "active", !doc.archived);
  if (doc.bedrooms != null) setField(record, fields, "bedrooms", doc.bedrooms);
  if (doc.bathrooms != null) setField(record, fields, "bathrooms", doc.bathrooms);
  if (doc.carSpaces != null) setField(record, fields, "cars", doc.carSpaces);
  setField(record, fields, "website", `${env.siteUrl.replace(/\/+$/, "")}/listing/${doc.slug}`);
  const hero = heroUrl(doc);
  if (hero) setField(record, fields, "hero", hero);
  return record;
}

function looksLikeListing(row: Record<string, unknown>, fields: Field[], module: string) {
  if (module !== "Products") return true;
  const slug = String(getField(row, fields, "slug") ?? "");
  return slug.toLowerCase().startsWith(CODE_PREFIX) || Boolean(getField(row, fields, "suburb")) || Boolean(getField(row, fields, "status"));
}

export async function zohoListingsStatus() {
  const ctx = await zohoContext().catch(() => null);
  const cred = (await IntegrationCredentialModel.findOne({ integration: "zoho" }).lean()) as
    | { listingModule?: string; lastListingPolledAt?: Date | null; scope?: string }
    | null;
  const settings = Boolean(ctx && hasScopes(ctx.scope, SETTINGS_SCOPES));
  return {
    enabled: Boolean(ctx),
    module: cred?.listingModule || cachedModule || null,
    settings,
    needsReconnect: Boolean(ctx && !settings),
    lastPulledAt: cred?.lastListingPolledAt ? new Date(cred.lastListingPolledAt).toISOString() : null,
    lastError: lastListingError,
    sync: listingSyncStatus(),
  };
}

export async function pushListingToZoho(propertyId: string) {
  if (!isDbConnected()) return { status: "skipped" as const, reason: "db" };
  try {
    const ctx = await zohoContext();
    if (!ctx) return { status: "skipped" as const, reason: "not-connected" };
    const doc = (await PropertyModel.findById(propertyId).lean()) as PropertyDoc | null;
    if (!doc) return { status: "skipped" as const, reason: "missing" };
    const module = await discoverModule(ctx);
    const fields = await ensureCustomFields(ctx, module, await loadFields(ctx, module));
    const record = toZohoRecord(doc, fields);
    const slugField = ALIASES.slug.find((name) => fields.some((f) => f.api_name === name));

    let id = doc.zohoListingId || "";
    if (id) {
      const { res, data } = await zohoCrmFetch(ctx.apiDomain, ctx.token, `${module}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ data: [record] }),
      });
      if (res.status === 404) id = "";
      else id = await listingIdFromResult(data, "Listing update");
    }
    if (!id) {
      const { data } = await zohoCrmFetch(ctx.apiDomain, ctx.token, `${module}/upsert`, {
        method: "POST",
        body: JSON.stringify({
          data: [record],
          duplicate_check_fields: slugField ? [slugField] : undefined,
        }),
      });
      id = await listingIdFromResult(data, "Listing upsert");
    }
    await PropertyModel.updateOne({ _id: propertyId }, { zohoListingId: id, zohoListingSyncedAt: new Date() });
    lastListingError = null;
    return { status: "success" as const, id, module };
  } catch (err) {
    recordError(err);
    return { status: "failed" as const, error: err instanceof Error ? err.message : String(err) };
  }
}

export function queueListingSync(propertyId: string) {
  if (!propertyId) return;
  void pushListingToZoho(propertyId).catch((err) => console.error("[zoho-listings] push failed", err));
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || `listing-${Date.now()}`;
  let n = 2;
  while (await PropertyModel.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

async function importHero(url: unknown): Promise<{ publicId: string; isHero: true; width?: number; height?: number; alt: string } | null> {
  const href = String(url ?? "").trim();
  if (!href.startsWith("http") || !isCloudinaryReady()) return null;
  if (env.cloudinary.cloudName && href.includes(`res.cloudinary.com/${env.cloudinary.cloudName}/`)) {
    const marker = "/upload/";
    const i = href.indexOf(marker);
    if (i >= 0) {
      const rest = href.slice(i + marker.length).replace(/^v\d+\//, "");
      const publicId = rest.replace(/\.[a-z0-9]+$/i, "").replace(/\/$/, "");
      if (publicId) return { publicId, isHero: true, alt: "" };
    }
  }
  try {
    const uploaded = await uploadImageFromUrl(href);
    return { publicId: uploaded.publicId, isHero: true, width: uploaded.width, height: uploaded.height, alt: "" };
  } catch (err) {
    console.warn("[zoho-listings] hero import failed", err);
    return null;
  }
}

async function applyZohoRow(row: Record<string, unknown>, fields: Field[], module: string) {
  const id = String(row.id ?? "");
  if (!id || !looksLikeListing(row, fields, module)) return "skipped";
  const name = String(getField(row, fields, "name") ?? getField(row, fields, "address") ?? "").trim();
  const address = String(getField(row, fields, "address") ?? name.split(",")[0] ?? "").trim() || "Address to confirm";
  const suburb = String(getField(row, fields, "suburb") ?? name.split(",").slice(-1)[0] ?? "").trim() || "To confirm";
  const side = parseSide(getField(row, fields, "side"), String(getField(row, fields, "status") ?? ""));
  const status = parseStatus(getField(row, fields, "status"), side);
  const propertyType = parseType(getField(row, fields, "type"));
  const assetCategory = parseCategory(getField(row, fields, "category"), propertyType);
  const priceValue = asNumber(getField(row, fields, "priceValue"));
  const archived = getField(row, fields, "active") != null ? !asBool(getField(row, fields, "active")) : false;
  const wantedSlug = slugFromCode(getField(row, fields, "slug")) || slugify(address, suburb);

  const existing = (await PropertyModel.findOne({
    $or: [{ zohoListingId: id }, { slug: wantedSlug }],
  })) as (PropertyDoc & { save: () => Promise<unknown>; images: PropertyDoc["images"] }) | null;

  const hero = await importHero(getField(row, fields, "hero"));
  const patch: Record<string, unknown> = {
    address,
    suburb,
    state: String(getField(row, fields, "state") ?? "VIC").slice(0, 8) || "VIC",
    postcode: String(getField(row, fields, "postcode") ?? existing?.postcode ?? "0000").replace(/\s/g, "").slice(0, 8) || "0000",
    status,
    transactionSide: side,
    priceLabel: priceLabelFrom(priceValue, side, String(getField(row, fields, "priceLabel") ?? existing?.priceLabel ?? "")),
    priceValue,
    floorAreaSqm: asNumber(getField(row, fields, "floor")),
    landAreaSqm: asNumber(getField(row, fields, "land")),
    zoning: String(getField(row, fields, "zoning") ?? existing?.zoning ?? "To confirm").slice(0, 40) || "To confirm",
    propertyType,
    assetCategory,
    description: String(getField(row, fields, "description") ?? existing?.description ?? `${address}, ${suburb}.`).trim() || `${address}, ${suburb}.`,
    featured: asBool(getField(row, fields, "featured")),
    archived,
    bedrooms: asNumber(getField(row, fields, "bedrooms")),
    bathrooms: asNumber(getField(row, fields, "bathrooms")),
    carSpaces: asNumber(getField(row, fields, "cars")),
    zohoListingId: id,
    zohoListingSyncedAt: new Date(),
  };
  if (hero && !(existing?.images?.length)) patch.images = [hero];

  if (existing) {
    await PropertyModel.updateOne({ _id: existing._id }, { $set: patch });
    return "updated";
  }

  const slug = await uniqueSlug(wantedSlug);
  await PropertyModel.create({
    ...patch,
    slug,
    agentLicenceNumber: AGENCY.licenceNumber,
    internalNotes: "Imported from Zoho CRM. Check photos, zoning and price before featuring.",
  });
  return "created";
}

export async function pullZohoListings({ full = false } = {}) {
  if (!isDbConnected()) return { checked: 0, created: 0, updated: 0, skipped: 0 };
  const ctx = await zohoContext().catch(() => null);
  if (!ctx) return { checked: 0, created: 0, updated: 0, skipped: 0 };
  const startedAt = new Date();
  try {
    const module = await discoverModule(ctx);
    const fields = await ensureCustomFields(ctx, module, await loadFields(ctx, module));
    const cred = (await IntegrationCredentialModel.findOne({ integration: "zoho" }).lean()) as { lastListingPolledAt?: Date | null } | null;
    let fullPull = full;
    if (!fullPull && !cred?.lastListingPolledAt) {
      if (module === "Products") {
        await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { lastListingPolledAt: startedAt, listingModule: module });
        return { checked: 0, created: 0, updated: 0, skipped: 0 };
      }
      fullPull = true;
    }

    const wanted = [...new Set(["id", "Modified_Time", ...fields.filter((f) => ALIASES.name.concat(ALIASES.slug, ALIASES.address, ALIASES.suburb, ALIASES.status, ALIASES.side, ALIASES.priceValue, ALIASES.priceLabel, ALIASES.description, ALIASES.type, ALIASES.category, ALIASES.zoning, ALIASES.postcode, ALIASES.state, ALIASES.floor, ALIASES.land, ALIASES.featured, ALIASES.active, ALIASES.bedrooms, ALIASES.bathrooms, ALIASES.cars, ALIASES.hero).includes(f.api_name)).map((f) => f.api_name)])];
    const fieldQs = wanted.slice(0, 50).join(",");
    const totals = { checked: 0, created: 0, updated: 0, skipped: 0 };

    for (let page = 1; page <= 10; page += 1) {
      const headers: Record<string, string> = {};
      if (!fullPull && cred?.lastListingPolledAt) {
        const since = new Date(new Date(cred.lastListingPolledAt).getTime() - 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "+00:00");
        headers["If-Modified-Since"] = since;
      }
      const { res, data } = await zohoCrmFetch(
        ctx.apiDomain,
        ctx.token,
        `${module}?fields=${encodeURIComponent(fieldQs)}&per_page=200&page=${page}&sort_by=Modified_Time&sort_order=desc`,
        { headers },
      );
      if (res.status === 304 || res.status === 204) break;
      if (!res.ok) throw new ZohoError(`Listing pull failed — ${String(data.code ?? res.status)}`);
      const rows = (data.data as Record<string, unknown>[] | undefined) ?? [];
      if (!rows.length) break;
      for (const row of rows) {
        totals.checked += 1;
        const result = await applyZohoRow(row, fields, module);
        totals[result] += 1;
      }
      if (!(data.info as { more_records?: boolean } | undefined)?.more_records) break;
    }

    await IntegrationCredentialModel.updateOne({ integration: "zoho" }, { lastListingPolledAt: startedAt, listingModule: module });
    if (totals.created + totals.updated) await invalidatePropertyListCache();
    lastListingError = null;
    return totals;
  } catch (err) {
    recordError(err);
    return { checked: 0, created: 0, updated: 0, skipped: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function syncListingsBothWays() {
  const pulled = await pullZohoListings({ full: true });
  const pending = (await PropertyModel.find({}).select("_id").limit(80).lean()) as { _id: unknown }[];
  const pushed = { attempted: pending.length, success: 0, failed: 0, skipped: 0 };
  for (const row of pending) {
    const result = await pushListingToZoho(String(row._id));
    pushed[result.status] += 1;
  }
  return { pulled, pushed };
}

type ListingSyncJob = {
  running: boolean;
  started: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  result: Awaited<ReturnType<typeof syncListingsBothWays>> | null;
  error: string | null;
};

let listingSync: ListingSyncJob = {
  running: false,
  started: false,
  startedAt: null,
  finishedAt: null,
  result: null,
  error: null,
};

export function listingSyncStatus(): ListingSyncJob {
  return listingSync;
}

/** Starts a full two-way listing sync in the background so the Settings request is not killed by a 502 timeout. */
export function startListingSync() {
  if (listingSync.running) return listingSync;
  listingSync = {
    running: true,
    started: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    result: null,
    error: null,
  };
  void (async () => {
    try {
      const result = await syncListingsBothWays();
      listingSync = { ...listingSync, running: false, finishedAt: new Date().toISOString(), result, error: result.pulled.error ?? null };
      await SyncLogModel.create({
        integration: "zoho",
        recordRef: "listings",
        status: result.pulled.error ? "failed" : "success",
        error: result.pulled.error ?? "",
        meta: result,
      }).catch(() => undefined);
    } catch (err) {
      listingSync = {
        ...listingSync,
        running: false,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  })();
  return listingSync;
}
