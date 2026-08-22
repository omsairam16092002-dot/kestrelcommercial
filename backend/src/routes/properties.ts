import { Router } from "express";
import { z } from "zod";
import {
  ASSET_CATEGORIES,
  AGENTS,
  PROPERTIES,
  PROPERTY_TYPES,
  deriveAssetCategory,
  filterProperties,
  parseSpecFilters,
  resolveImageSrc,
  sanitizeQueryKeys,
  statusesForSide,
  type Property,
} from "@kestrel/shared";
import { isDbConnected } from "../db/mongoose";
import { PropertyModel } from "../models/Property";
import { AgentModel } from "../models/Agent";
import { EnquiryModel } from "../models/Enquiry";
import { HttpError } from "../middleware/errorHandler";
import { serializeProperty, serializeAgent } from "../utils/serialize";
import { optionalAuth, requireAuth } from "../middleware/requireAuth";
import { publicCache } from "../middleware/publicCache";
import { getPropertyListCache, setPropertyListCache, invalidatePropertyListCache } from "../services/propertyCache";
import { enqueueXeroSoldInvoice, enqueuePexaPoll } from "../jobs/queue";
import { buildBrochurePdf } from "../services/brochurePdf";
import { env } from "../config/env";
import { logActivity } from "../services/activity";
import { propertiesToReaxml, propertyToReaxml } from "../services/reaxml";

export const propertiesRouter = Router();

const propertyWriteSchema = z.object({
  slug: z.string().min(1),
  address: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().default("VIC"),
  postcode: z.string().min(3),
  status: z.enum(["for-sale", "for-lease", "under-offer", "sold", "leased"]),
  transactionSide: z.enum(["sale", "lease"]),
  priceLabel: z.string().min(1),
  priceValue: z.number().nullable().optional(),
  floorAreaSqm: z.number().nullable().optional(),
  landAreaSqm: z.number().nullable().optional(),
  clearSpanM: z.number().nullable().optional(),
  rollerDoorM: z.number().nullable().optional(),
  threePhasePower: z.boolean().optional(),
  hardstand: z.boolean().optional(),
  zoning: z.string().min(1),
  propertyType: z.enum(PROPERTY_TYPES),
  assetCategory: z.enum(ASSET_CATEGORIES).optional(),
  bedrooms: z.number().nullable().optional(),
  bathrooms: z.number().nullable().optional(),
  carSpaces: z.number().nullable().optional(),
  description: z.string().min(1),
  images: z
    .array(
      z.object({
        publicId: z.string().min(1),
        isHero: z.boolean().optional(),
        alt: z.string().optional(),
      }),
    )
    .optional(),
  floorplanPublicId: z.string().nullable().optional(),
  brochureUrl: z.string().nullable().optional(),
  agentLicenceNumber: z.string().min(1),
  featured: z.boolean().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  yieldPercent: z.number().nullable().optional(),
  leaseTermYears: z.number().nullable().optional(),
  outgoingsPa: z.number().nullable().optional(),
  evidenceLine: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  pexaWorkspaceId: z.string().optional(),
  portalListingId: z.string().optional(),
  syndicateToRealcommercial: z.boolean().optional(),
  syndicateToCommercialRealEstate: z.boolean().optional(),
  externalListingIds: z
    .object({
      realcommercial: z.string().optional().nullable(),
      commercialRealEstate: z.string().optional().nullable(),
    })
    .optional(),
});

function fixtureList(query: Record<string, unknown>): Property[] {
  const filters = parseSpecFilters(sanitizeQueryKeys(query));
  if (query.featured === "1" || query.featured === "true") filters.featured = true;
  return filterProperties(PROPERTIES, filters);
}

/** Card/list fields only — omit long description and desk-only notes from public list responses. */
const PUBLIC_LIST_FIELDS =
  "slug address suburb state postcode status transactionSide priceLabel priceValue floorAreaSqm landAreaSqm clearSpanM rollerDoorM threePhasePower hardstand bedrooms bathrooms carSpaces zoning propertyType assetCategory images agentLicenceNumber featured lat lng yieldPercent leaseTermYears outgoingsPa evidenceLine archived createdAt updatedAt";

propertiesRouter.get("/", optionalAuth, publicCache(), async (req, res, next) => {
  try {
    const raw = sanitizeQueryKeys(req.query as Record<string, unknown>);
    const filters = parseSpecFilters(raw);
    if (req.query.featured === "1" || req.query.featured === "true") filters.featured = true;
    const includeArchived = Boolean(req.user) && (req.query.includeArchived === "1" || req.query.includeArchived === "true");

    if (!isDbConnected()) {
      return res.json(fixtureList(req.query as Record<string, unknown>));
    }

    const q: Record<string, unknown> = {};
    if (!includeArchived) q.archived = { $ne: true };
    if (filters.featured) q.featured = true;
    if (filters.side && filters.side !== "all") {
      q.transactionSide = filters.side;
      if (!filters.status?.length) {
        q.status = { $in: statusesForSide(filters.side) };
      }
    }
    if (filters.status?.length) q.status = { $in: filters.status };
    if (filters.zoning) q.zoning = filters.zoning.toUpperCase();
    if (filters.propertyType) q.propertyType = filters.propertyType;
    if (filters.assetCategory) q.assetCategory = filters.assetCategory;
    if (filters.suburb) q.suburb = new RegExp(escapeRegex(filters.suburb), "i");
    if (filters.threePhasePower) q.threePhasePower = true;
    if (filters.hardstand) q.hardstand = true;

    const range: Record<string, unknown> = {};
    if (filters.minFloorAreaSqm != null) range.$gte = filters.minFloorAreaSqm;
    if (filters.maxFloorAreaSqm != null) range.$lte = filters.maxFloorAreaSqm;
    if (Object.keys(range).length) q.floorAreaSqm = range;

    if (filters.minClearSpanM != null) q.clearSpanM = { $gte: filters.minClearSpanM };
    if (filters.minRollerDoorM != null) q.rollerDoorM = { $gte: filters.minRollerDoorM };
    if (filters.minLandAreaSqm != null) q.landAreaSqm = { $gte: filters.minLandAreaSqm };
    if (filters.minBedrooms != null) q.bedrooms = { $gte: filters.minBedrooms };
    if (filters.minBathrooms != null) q.bathrooms = { $gte: filters.minBathrooms };
    if (filters.minCarSpaces != null) q.carSpaces = { $gte: filters.minCarSpaces };
    if (filters.maxPrice != null) q.priceValue = { $lte: filters.maxPrice };
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      q.$or = [{ address: rx }, { suburb: rx }, { slug: rx }, { priceLabel: rx }];
    }

    const cacheQuery = { ...raw, includeArchived: includeArchived ? "1" : "0", auth: req.user ? "1" : "0" };
    if (!req.user) {
      const cached = await getPropertyListCache<Property[]>(cacheQuery);
      if (cached) return res.json(cached);
    }

    let listQuery = PropertyModel.find(q).sort({ featured: -1, updatedAt: -1 });
    if (!req.user) listQuery = listQuery.select(PUBLIC_LIST_FIELDS);
    const docs = await listQuery.lean();
    let serialized = docs.map((d) => serializeProperty(d as Record<string, unknown>));
    serialized = filterProperties(serialized, filters);
    if (req.user && (req.query.withLeadCounts === "1" || req.query.withLeadCounts === "true")) {
      const slugs = serialized.map((p) => p.slug);
      const counts = await EnquiryModel.aggregate([
        { $match: { propertySlug: { $in: slugs } } },
        { $group: { _id: "$propertySlug", count: { $sum: 1 } } },
      ]);
      const map = Object.fromEntries(counts.map((c) => [String(c._id), c.count as number]));
      serialized = serialized.map((p) => ({ ...p, leadCount: map[p.slug] ?? 0 }));
    }
    if (!req.user) await setPropertyListCache(cacheQuery, serialized);
    res.json(serialized);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/feed.xml", requireAuth, async (_req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const docs = await PropertyModel.find({
      archived: { $ne: true },
      status: { $in: ["for-sale", "for-lease", "under-offer"] },
    })
      .sort({ updatedAt: -1 })
      .lean();
    const properties = docs.map((d) => serializeProperty(d as Record<string, unknown>));
    const licences = [...new Set(properties.map((p) => p.agentLicenceNumber))];
    const agents = await AgentModel.find({ licenceNumber: { $in: licences } }).lean();
    const map = new Map(
      agents.map((a) => [String(a.licenceNumber), serializeAgent(a as Record<string, unknown>)]),
    );
    const xml = propertiesToReaxml(properties, map);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="kestrel-listings.xml"');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/id/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const doc = await PropertyModel.findById(req.params.id).lean();
    if (!doc) throw new HttpError(404, "Listing not found");
    const property = serializeProperty(doc as Record<string, unknown>, { includeInternal: true });
    const leadCount = await EnquiryModel.countDocuments({ propertySlug: property.slug });
    res.json({ ...property, leadCount });
  } catch (err) {
    next(err);
  }
});

async function loadPropertyBySlug(slug: string): Promise<Property | null> {
  if (!isDbConnected()) {
    return PROPERTIES.find((p) => p.slug === slug) ?? null;
  }
  const doc = await PropertyModel.findOne({ slug, archived: { $ne: true } }).lean();
  return doc ? serializeProperty(doc as Record<string, unknown>) : null;
}

async function assertLeadUnlock(leadId: string | undefined, slug: string): Promise<void> {
  if (!leadId) {
    throw new HttpError(401, "Qualify first — submit the brochure form on the listing.");
  }
  if (!isDbConnected()) return;
  const lead = (await EnquiryModel.findById(leadId).lean()) as {
    propertySlug?: string | null;
  } | null;
  if (!lead) throw new HttpError(401, "That download token is not valid.");
  if (lead.propertySlug && lead.propertySlug !== slug) {
    throw new HttpError(403, "That download token is for a different listing.");
  }
}

propertiesRouter.get("/:slug/brochure", async (req, res, next) => {
  try {
    const property = await loadPropertyBySlug(req.params.slug);
    if (!property) throw new HttpError(404, "Listing not found");
    await assertLeadUnlock(typeof req.query.lead === "string" ? req.query.lead : undefined, property.slug);

    if (property.brochureUrl) {
      return res.redirect(property.brochureUrl);
    }

    const pdf = await buildBrochurePdf(property);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kestrel-${property.slug}-im.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/:slug/floorplan", async (req, res, next) => {
  try {
    const property = await loadPropertyBySlug(req.params.slug);
    if (!property) throw new HttpError(404, "Listing not found");
    await assertLeadUnlock(typeof req.query.lead === "string" ? req.query.lead : undefined, property.slug);
    if (!property.floorplanPublicId) {
      throw new HttpError(404, "No floorplan on file. Request one via inspection.");
    }
    const url = resolveImageSrc(property.floorplanPublicId, env.cloudinary.cloudName, { width: 2400 });
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/:slug/feed.xml", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const doc = await PropertyModel.findOne({ slug: req.params.slug }).lean();
    if (!doc) throw new HttpError(404, "Listing not found");
    const property = serializeProperty(doc as Record<string, unknown>);
    const agentDoc = await AgentModel.findOne({ licenceNumber: property.agentLicenceNumber }).lean();
    const agent = agentDoc ? serializeAgent(agentDoc as Record<string, unknown>) : AGENTS[0];
    const xml = propertyToReaxml(property, agent);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="kestrel-${property.slug}.xml"`);
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

propertiesRouter.get("/:slug", publicCache(), async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      const found = PROPERTIES.find((p) => p.slug === req.params.slug);
      if (!found) throw new HttpError(404, "Listing not found");
      const agent =
        AGENTS.find((a) => a.licenceNumber === found.agentLicenceNumber) ?? AGENTS[0];
      return res.json({ property: found, agent });
    }

    const doc = await PropertyModel.findOne({ slug: req.params.slug, archived: { $ne: true } }).lean();
    if (!doc) throw new HttpError(404, "Listing not found");
    const property = serializeProperty(doc as Record<string, unknown>);
    const agentDoc = await AgentModel.findOne({
      licenceNumber: property.agentLicenceNumber,
    }).lean();
    const agent = agentDoc
      ? serializeAgent(agentDoc as Record<string, unknown>)
      : AGENTS[0];
    res.json({ property, agent });
  } catch (err) {
    next(err);
  }
});

propertiesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      throw new HttpError(503, "MongoDB is not connected. Set MONGODB_URI to create listings.");
    }
    const parsed = propertyWriteSchema.parse(req.body);
    const created = await PropertyModel.create({
      ...parsed,
      assetCategory: parsed.assetCategory ?? deriveAssetCategory(parsed.propertyType),
    });
    await logActivity({
      type: "listing.create",
      entityType: "listing",
      entityId: String(created._id),
      summary: `Listed ${created.address}, ${created.suburb}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    await invalidatePropertyListCache();
    res.status(201).json(serializeProperty(created.toObject(), { includeInternal: true }));
  } catch (err) {
    next(err);
  }
});

propertiesRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      throw new HttpError(503, "MongoDB is not connected. Set MONGODB_URI to update listings.");
    }
    const parsed = propertyWriteSchema.partial().parse(req.body);
    const previous = await PropertyModel.findById(req.params.id);
    if (!previous) throw new HttpError(404, "Listing not found");
    const nextPropertyType = parsed.propertyType ?? previous.propertyType;

    const updated = await PropertyModel.findByIdAndUpdate(req.params.id, {
      ...parsed,
      assetCategory: parsed.assetCategory ?? deriveAssetCategory(nextPropertyType),
    }, {
      new: true,
    });
    if (!updated) throw new HttpError(404, "Listing not found");

    const becameSold = previous.status !== "sold" && updated.status === "sold";

    if (becameSold && updated.priceValue) {
      await enqueueXeroSoldInvoice({
        propertyId: String(updated._id),
        salePrice: updated.priceValue,
      });
    }

    if (typeof req.body.pexaWorkspaceId === "string" && req.body.pexaWorkspaceId) {
      await enqueuePexaPoll({
        propertyId: String(updated._id),
        workspaceId: req.body.pexaWorkspaceId,
      });
    }

    await logActivity({
      type: "listing.update",
      entityType: "listing",
      entityId: String(updated._id),
      summary: `Updated ${updated.address}, ${updated.suburb}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    await invalidatePropertyListCache();
    res.json(serializeProperty(updated.toObject(), { includeInternal: true }));
  } catch (err) {
    next(err);
  }
});

propertiesRouter.post("/:id/duplicate", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const source = await PropertyModel.findById(req.params.id).lean();
    if (!source) throw new HttpError(404, "Listing not found");
    const { _id: _unused, __v, createdAt, updatedAt, ...rest } = source as Record<string, unknown>;
    void _unused;
    void __v;
    void createdAt;
    void updatedAt;
    const base = String(rest.slug || "listing").replace(/-copy(-\d+)?$/, "");
    let slug = `${base}-copy`;
    let n = 2;
    while (await PropertyModel.exists({ slug })) {
      slug = `${base}-copy-${n}`;
      n += 1;
    }
    const created = await PropertyModel.create({
      ...rest,
      slug,
      featured: false,
      archived: false,
      status: rest.transactionSide === "lease" ? "for-lease" : "for-sale",
    });
    await logActivity({
      type: "listing.duplicate",
      entityType: "listing",
      entityId: String(created._id),
      summary: `Duplicated ${created.address} → ${created.slug}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    await invalidatePropertyListCache();
    res.status(201).json(serializeProperty(created.toObject(), { includeInternal: true }));
  } catch (err) {
    next(err);
  }
});

propertiesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    if (!isDbConnected()) throw new HttpError(503, "MongoDB is not connected.");
    const updated = await PropertyModel.findByIdAndUpdate(
      req.params.id,
      { archived: true, featured: false },
      { new: true },
    );
    if (!updated) throw new HttpError(404, "Listing not found");
    await logActivity({
      type: "listing.archive",
      entityType: "listing",
      entityId: String(updated._id),
      summary: `Archived ${updated.address}, ${updated.suburb}`,
      by: req.user?.name || req.user?.email || "desk",
    });
    await invalidatePropertyListCache();
    res.json(serializeProperty(updated.toObject(), { includeInternal: true }));
  } catch (err) {
    next(err);
  }
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
