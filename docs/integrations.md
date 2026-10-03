# Integrations

Everything third-party is behind env vars. Missing credentials are **flagged**, not faked.

## Cloudinary — functional once keys exist

`POST /api/uploads/sign` returns `{ timestamp, signature, apiKey, cloudName, folder }`.

The browser uploads **directly** to Cloudinary. The API stores only `public_id` (+ `isHero`, `alt`). It never proxies image bytes.

Needs: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Until then: `GET /api/uploads/status` reports `ready: false`. Fixture listings use `unsplash:` public ids.

## Zoho CRM — live once connected

Documented in `backend/src/services/zoho.ts`.

1. Create a **Server-based** client in the Zoho API Console of the account's data centre (e.g. `api-console.zoho.com.au`). Redirect URIs go through the frontend, because the desk cookie lives there:
   - `https://www.kestrelcommercial.com.au/api/integrations/zoho/callback`
   - `http://localhost:3000/api/integrations/zoho/callback`
2. Set `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ACCOUNTS_URL`, `ZOHO_API_URL`, `ZOHO_REDIRECT_URI` on the backend.
3. Admin → Settings → **Connect Zoho**, signed in to Zoho as the CRM admin. The refresh token is stored AES-256-GCM encrypted in `IntegrationCredential` (key: `ZOHO_TOKEN_KEY`, else `JWT_SECRET` — rotating it means reconnecting).

After every `createDeskEnquiry` (web form, call/WA click, EOI, appraisal, portal email) the enquiry is pushed in the background, no Redis needed:

- **Lead** upserted (dedupe on Email, else Phone) with the message, listing, source and a link back to the desk record.
- **Note** on the lead for each enquiry, so repeat enquiries keep their history.
- **Task** (High, due today) for inspection requests.

Each attempt writes `SyncLog { integration: "zoho" }`. Settings shows failures with **Retry**, and **Sync recent enquiries** backfills the last 90 days (25 per click).

## Xero — STUB

Documented in `backend/src/services/xero.ts`.

Intended flow:

1. Admin hits `GET /api/integrations/xero/connect` → Xero OAuth2 authorization-code.
2. Callback exchanges the code; tokens stay on the backend only.
3. When a property is patched to `sold`, Express enqueues BullMQ job `xero:invoice-sold`. **Never** call Xero inline on the HTTP request.
4. Worker creates the invoice and writes `SyncLog`.

Needs: `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`, `XERO_TENANT_ID`, plus `REDIS_URL`.

Without credentials the worker records `status: skipped`.

## PEXA — STUB

Documented in `backend/src/services/pexa.ts`.

Intended flow:

1. `GET /api/integrations/pexa/connect` → OAuth.
2. Attach a PEXA workspace id when a sale goes unconditional.
3. Enqueue `pexa:poll-settlement` (repeat while not SETTLED / CANCELLED).
4. Worker polls `PEXA_API_BASE`, updates CRM fields, writes `SyncLog`.

Needs: `PEXA_CLIENT_ID`, `PEXA_CLIENT_SECRET`, `PEXA_REDIRECT_URI`, `REDIS_URL`.

## Redis / BullMQ

Run the HTTP API and the worker as **separate processes**:

```bash
npm run dev -w backend          # API
npm run worker -w backend       # jobs
```

Upstash Redis (`REDIS_URL`) is required for jobs. Without it, enqueue helpers no-op and log a warning.
