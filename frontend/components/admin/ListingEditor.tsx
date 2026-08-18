"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PROPERTY_TYPES,
  ZONING_OPTIONS,
  propertyTypeLabel,
  type Agent,
  type Property,
  type PropertyStatus,
  type PropertyType,
  type TransactionSide,
} from "@kestrel/shared";
import { listingImageSrc } from "@/lib/images";
import { createListing, downloadReaxml, signAndUploadImage, updateListing } from "@/lib/adminApi";

const STATUSES: PropertyStatus[] = ["for-sale", "for-lease", "under-offer", "sold", "leased"];

type ImageRow = { publicId: string; isHero?: boolean; alt?: string };

function slugify(address: string, suburb: string) {
  return `${address} ${suburb}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ListingEditor({
  agents,
  initial,
}: {
  agents: Agent[];
  initial?: Property;
}) {
  const router = useRouter();
  const [side, setSide] = useState<TransactionSide>(initial?.transactionSide ?? "sale");
  const [status, setStatus] = useState<PropertyStatus>(initial?.status ?? "for-sale");
  const [propertyType, setPropertyType] = useState<PropertyType>(initial?.propertyType ?? "warehouse");
  const [featured, setFeatured] = useState(Boolean(initial?.featured));
  const [address, setAddress] = useState(initial?.address ?? "");
  const [suburb, setSuburb] = useState(initial?.suburb ?? "");
  const [state, setState] = useState(initial?.state ?? "VIC");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [lat, setLat] = useState(initial?.lat != null ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial?.lng != null ? String(initial.lng) : "");
  const [priceLabel, setPriceLabel] = useState(initial?.priceLabel ?? "Contact agent");
  const [priceValue, setPriceValue] = useState(initial?.priceValue != null ? String(initial.priceValue) : "");
  const [yieldPercent, setYieldPercent] = useState(initial?.yieldPercent != null ? String(initial.yieldPercent) : "");
  const [leaseTermYears, setLeaseTermYears] = useState(
    initial?.leaseTermYears != null ? String(initial.leaseTermYears) : "",
  );
  const [outgoingsPa, setOutgoingsPa] = useState(initial?.outgoingsPa != null ? String(initial.outgoingsPa) : "");
  const [floorAreaSqm, setFloorAreaSqm] = useState(initial?.floorAreaSqm != null ? String(initial.floorAreaSqm) : "");
  const [landAreaSqm, setLandAreaSqm] = useState(initial?.landAreaSqm != null ? String(initial.landAreaSqm) : "");
  const [clearSpanM, setClearSpanM] = useState(initial?.clearSpanM != null ? String(initial.clearSpanM) : "");
  const [rollerDoorM, setRollerDoorM] = useState(initial?.rollerDoorM != null ? String(initial.rollerDoorM) : "");
  const [zoning, setZoning] = useState(initial?.zoning ?? "IN1Z");
  const [threePhasePower, setThreePhasePower] = useState(Boolean(initial?.threePhasePower));
  const [hardstand, setHardstand] = useState(Boolean(initial?.hardstand));
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms != null ? String(initial.bedrooms) : "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms != null ? String(initial.bathrooms) : "");
  const [carSpaces, setCarSpaces] = useState(initial?.carSpaces != null ? String(initial.carSpaces) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [evidenceLine, setEvidenceLine] = useState(initial?.evidenceLine ?? "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? "");
  const [brochureUrl, setBrochureUrl] = useState(initial?.brochureUrl ?? "");
  const [pexaWorkspaceId, setPexaWorkspaceId] = useState(initial?.pexaWorkspaceId ?? "");
  const [portalListingId, setPortalListingId] = useState(initial?.portalListingId ?? "");
  const [syndicateToRealcommercial, setSyndicateToRealcommercial] = useState(Boolean(initial?.syndicateToRealcommercial));
  const [syndicateToCommercialRealEstate, setSyndicateToCommercialRealEstate] = useState(
    Boolean(initial?.syndicateToCommercialRealEstate),
  );
  const [externalRealcommercial, setExternalRealcommercial] = useState(initial?.externalListingIds?.realcommercial ?? "");
  const [externalCre, setExternalCre] = useState(initial?.externalListingIds?.commercialRealEstate ?? "");
  const [agentLicenceNumber, setAgentLicenceNumber] = useState(
    initial?.agentLicenceNumber ?? agents[0]?.licenceNumber ?? "",
  );
  const [images, setImages] = useState<ImageRow[]>(initial?.images ?? []);
  const [floorplanPublicId, setFloorplanPublicId] = useState(initial?.floorplanPublicId ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const autoSlug = useMemo(() => slugify(address, suburb), [address, suburb]);

  function syncSide(next: TransactionSide) {
    setSide(next);
    if (next === "sale" && (status === "for-lease" || status === "leased")) setStatus("for-sale");
    if (next === "lease" && (status === "for-sale" || status === "sold")) setStatus("for-lease");
  }

  async function onImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const publicId = await signAndUploadImage(file, "kestrel/listings");
        uploaded.push({ publicId, alt: address || file.name, isHero: false });
      }
      setImages((prev) => {
        const next = [...prev, ...uploaded];
        if (!next.some((i) => i.isHero) && next[0]) next[0] = { ...next[0], isHero: true };
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onFloorplan(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setFloorplanPublicId(await signAndUploadImage(file, "kestrel/floorplans"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Floorplan upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    const body = {
      slug: (slugTouched ? slug : autoSlug) || slugify(address, suburb),
      address,
      suburb,
      state,
      postcode,
      status,
      transactionSide: side,
      priceLabel,
      priceValue: num(priceValue),
      floorAreaSqm: num(floorAreaSqm),
      landAreaSqm: num(landAreaSqm),
      clearSpanM: num(clearSpanM),
      rollerDoorM: num(rollerDoorM),
      threePhasePower,
      hardstand,
      bedrooms: num(bedrooms),
      bathrooms: num(bathrooms),
      carSpaces: num(carSpaces),
      zoning,
      propertyType,
      description,
      images,
      floorplanPublicId: floorplanPublicId || null,
      brochureUrl: brochureUrl || null,
      agentLicenceNumber,
      featured,
      lat: num(lat),
      lng: num(lng),
      yieldPercent: num(yieldPercent),
      leaseTermYears: num(leaseTermYears),
      outgoingsPa: num(outgoingsPa),
      evidenceLine: evidenceLine || null,
      internalNotes: internalNotes || null,
      pexaWorkspaceId: pexaWorkspaceId.trim(),
      portalListingId: portalListingId.trim(),
      syndicateToRealcommercial,
      syndicateToCommercialRealEstate,
      externalListingIds: {
        realcommercial: externalRealcommercial.trim() || null,
        commercialRealEstate: externalCre.trim() || null,
      },
    };
    try {
      const saved = initial?.id ? await updateListing(initial.id, body) : await createListing(body);
      router.replace(`/admin/listings/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-10">
      <section>
        <h2 className="t-h3 text-ink">Classification</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Sale or lease</span>
            <select className="kc-field w-full px-3 py-3" value={side} onChange={(e) => syncSide(e.target.value as TransactionSide)}>
              <option value="sale">Sale</option>
              <option value="lease">Lease</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Status</span>
            <select className="kc-field w-full px-3 py-3" value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Type</span>
            <select
              className="kc-field w-full px-3 py-3"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {propertyTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured on homepage
          </label>
        </div>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Address</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-mauve">Street</span>
            <input
              className="kc-field w-full px-3 py-3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Suburb</span>
            <input className="kc-field w-full px-3 py-3" value={suburb} onChange={(e) => setSuburb(e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Postcode</span>
            <input className="kc-field w-full px-3 py-3" value={postcode} onChange={(e) => setPostcode(e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">State</span>
            <input className="kc-field w-full px-3 py-3" value={state} onChange={(e) => setState(e.target.value)} required />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-mauve">Slug</span>
            <input
              className="kc-field w-full px-3 py-3 t-mono"
              value={slugTouched ? slug : autoSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Lat</span>
            <input className="kc-field w-full px-3 py-3" value={lat} onChange={(e) => setLat(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Lng</span>
            <input className="kc-field w-full px-3 py-3" value={lng} onChange={(e) => setLng(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Price</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-mauve">Price label</span>
            <input className="kc-field w-full px-3 py-3" value={priceLabel} onChange={(e) => setPriceLabel(e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Price value (AUD, GST excl.)</span>
            <input className="kc-field w-full px-3 py-3" value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Yield % (investment sales too)</span>
            <input className="kc-field w-full px-3 py-3" value={yieldPercent} onChange={(e) => setYieldPercent(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Lease term (years)</span>
            <input className="kc-field w-full px-3 py-3" value={leaseTermYears} onChange={(e) => setLeaseTermYears(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Outgoings pa</span>
            <input className="kc-field w-full px-3 py-3" value={outgoingsPa} onChange={(e) => setOutgoingsPa(e.target.value)} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Spec</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-mauve">GFA sqm</span>
            <input className="kc-field w-full px-3 py-3" value={floorAreaSqm} onChange={(e) => setFloorAreaSqm(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Land sqm</span>
            <input className="kc-field w-full px-3 py-3" value={landAreaSqm} onChange={(e) => setLandAreaSqm(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Bedrooms</span>
            <input className="kc-field w-full px-3 py-3" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Bathrooms</span>
            <input className="kc-field w-full px-3 py-3" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Car spaces</span>
            <input className="kc-field w-full px-3 py-3" value={carSpaces} onChange={(e) => setCarSpaces(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Clear span m</span>
            <input className="kc-field w-full px-3 py-3" value={clearSpanM} onChange={(e) => setClearSpanM(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Roller door m</span>
            <input className="kc-field w-full px-3 py-3" value={rollerDoorM} onChange={(e) => setRollerDoorM(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">Zoning</span>
            <select className="kc-field w-full px-3 py-3" value={zoning} onChange={(e) => setZoning(e.target.value)}>
              {ZONING_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2 pb-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={threePhasePower} onChange={(e) => setThreePhasePower(e.target.checked)} />
              3-phase power
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hardstand} onChange={(e) => setHardstand(e.target.checked)} />
              Hardstand
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Copy</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Description</span>
          <textarea className="kc-field min-h-40 w-full px-3 py-3" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Evidence line (sold / leased flagship)</span>
          <input className="kc-field w-full px-3 py-3" value={evidenceLine} onChange={(e) => setEvidenceLine(e.target.value)} />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Internal notes (desk only — never published)</span>
          <textarea className="kc-field min-h-28 w-full px-3 py-3" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
        </label>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Media</h2>
        <p className="mt-2 text-sm text-mauve">{uploading ? "Uploading…" : "Cloudinary signed upload. Set a hero. Drag order with move buttons."}</p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Gallery</span>
          <input type="file" accept="image/*" multiple onChange={(e) => void onImages(e.target.files)} />
        </label>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img, i) => (
            <li key={`${img.publicId}-${i}`} className="border border-oxblood/10 bg-paper p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={listingImageSrc(img.publicId, 600)} alt={img.alt ?? ""} className="aspect-[4/3] w-full object-cover" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`px-2 py-1 text-xs font-semibold ${img.isHero ? "bg-oxblood text-paper" : "bg-paper text-oxblood"}`}
                  onClick={() =>
                    setImages((prev) => prev.map((row, idx) => ({ ...row, isHero: idx === i })))
                  }
                >
                  Hero
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs"
                  disabled={i === 0}
                  onClick={() =>
                    setImages((prev) => {
                      const next = [...prev];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      return next;
                    })
                  }
                >
                  Up
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs"
                  disabled={i === images.length - 1}
                  onClick={() =>
                    setImages((prev) => {
                      const next = [...prev];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      return next;
                    })
                  }
                >
                  Down
                </button>
                <button
                  type="button"
                  className="ml-auto px-2 py-1 text-xs text-oxblood"
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <label className="mt-6 block text-sm">
          <span className="mb-1 block text-mauve">Floorplan</span>
          <input type="file" accept="image/*" onChange={(e) => void onFloorplan(e.target.files)} />
          {floorplanPublicId ? (
            <p className="mt-2 t-mono text-xs text-mauve">
              {floorplanPublicId}{" "}
              <button type="button" className="text-oxblood" onClick={() => setFloorplanPublicId("")}>
                clear
              </button>
            </p>
          ) : null}
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Brochure URL (optional hosted PDF)</span>
          <input className="kc-field w-full px-3 py-3" value={brochureUrl} onChange={(e) => setBrochureUrl(e.target.value)} />
        </label>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Syndication</h2>
        <p className="mt-2 text-sm text-mauve">
          Toggles and IDs are stored now. Automated portal push waits on a certified feed provider — Settings shows not connected until then.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Portal listing ID</span>
          <input
            className="kc-field w-full px-3 py-3"
            value={portalListingId}
            onChange={(e) => setPortalListingId(e.target.value)}
            placeholder="Used to match inbound portal enquiry emails"
          />
        </label>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={syndicateToRealcommercial} onChange={(e) => setSyndicateToRealcommercial(e.target.checked)} />
          Syndicate to realcommercial.com.au when a feed provider is connected
        </label>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={syndicateToCommercialRealEstate}
            onChange={(e) => setSyndicateToCommercialRealEstate(e.target.checked)}
          />
          Syndicate to commercialrealestate.com.au when a feed provider is connected
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-mauve">External ID · realcommercial</span>
            <input className="kc-field w-full px-3 py-3" value={externalRealcommercial} onChange={(e) => setExternalRealcommercial(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-mauve">External ID · CRE</span>
            <input className="kc-field w-full px-3 py-3" value={externalCre} onChange={(e) => setExternalCre(e.target.value)} />
          </label>
        </div>
        {initial?.slug ? (
          <button
            type="button"
            className="btn-sharp mt-4 border border-oxblood text-oxblood hover:bg-oxblood hover:text-paper"
            onClick={() => void downloadReaxml(`/api/properties/${encodeURIComponent(initial.slug)}/feed.xml`, `kestrel-${initial.slug}.xml`)}
          >
            Download REAXML
          </button>
        ) : null}
      </section>

      <section>
        <h2 className="t-h3 text-ink">Settlement</h2>
        <p className="mt-2 text-sm text-mauve">
          PEXA workspace id is stored on this listing. Connect Pexa Clear in Settings before settlement polling runs.
        </p>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">PEXA workspace id</span>
          <input
            className="kc-field w-full px-3 py-3"
            value={pexaWorkspaceId}
            onChange={(e) => setPexaWorkspaceId(e.target.value)}
            placeholder="Optional — paste from PEXA Clear"
          />
        </label>
      </section>

      <section>
        <h2 className="t-h3 text-ink">Agent</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-mauve">Licence</span>
          <select
            className="kc-field w-full px-3 py-3"
            value={agentLicenceNumber}
            onChange={(e) => setAgentLicenceNumber(e.target.value)}
            required
          >
            {agents.map((a) => (
              <option key={a.licenceNumber} value={a.licenceNumber}>
                {a.name} · {a.licenceNumber}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <p className="text-sm text-oxblood">{error}</p> : null}
      <button type="submit" disabled={pending || uploading} className="btn-sharp bg-oxblood text-paper hover:bg-ink disabled:opacity-60">
        {pending ? "Saving…" : initial ? "Save listing" : "Publish listing"}
      </button>
    </form>
  );
}
