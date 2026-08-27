# Kestrel Commercial — architecture

Monorepo: `frontend/` (Next.js 14, Vercel) · `backend/` (Express + TypeScript, Railway/Render) · `packages/shared/` (types, spec filters, status→colour) · `docs/`.

```
Browser  →  Vercel (Next.js ISR 60s)
                │ fetch /api/*
                ▼
         Railway/Render (Express)
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
   Mongo Atlas  Redis   Cloudinary (signed, browser→CDN)
                (BullMQ)     Xero / PEXA jobs only
```

## Why a separate backend

The public site must never hold Xero, PEXA or Cloudinary secrets. Background workers (BullMQ) run beside the API, not inside Next.js serverless functions.

An internal CRM dashboard is **out of scope** for this build. It will be a second frontend against the same `/api/properties`, `/api/enquiries`, `/api/uploads` and `/api/integrations` routes.

## Shared source of truth

`packages/shared` owns:

- `PropertyStatus` + `statusTone()` / `statusColor()` — oxblood vs tan
- `parseSpecFilters` / `matchesSpecFilters` / `specFiltersToSearchParams`
- Agency constants (licence `089481L` must appear on every footer and listing detail)
- Fixture listings used when Mongo is not connected

Do not reimplement filter or badge logic in either app.

## Data

| Collection | Purpose |
|---|---|
| Property | Listings. Images are Cloudinary `public_id`s only. |
| Enquiry | Web / appraisal / contact / EOI. `crmStage` ready for the future CRM. |
| Agent | Licence, phone, email, photo public_id. |
| SyncLog | Xero/PEXA attempts — debug without log-diving. |

## Hosting env

| App | Platform | Required env |
|---|---|---|
| frontend | Vercel | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CARTO_API_KEY` |
| backend | Railway / Render | `MONGODB_URI`, `FRONTEND_ORIGIN`, `CLOUDINARY_*`, `REDIS_URL`, `XERO_*`, `PEXA_*` |
| db | Atlas | — |
| redis | Upstash | `REDIS_URL` |

Copy root `.env.example` into `backend/.env` and `frontend/.env.local`. Never commit secrets.

## ISR

Listing pages use `export const revalidate = 60`. The frontend server fetches the API (or falls back to shared fixtures if the API is down). Listing and marketing photos use native `<img>` tags with Cloudinary delivery URLs (`f_auto,q_auto:good`, context crops) — not the Next.js image optimizer. Agent portraits and hero poster fall back to committed files under `frontend/public/assets/`.
