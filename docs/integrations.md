# Integrations

Everything third-party is behind env vars. Missing credentials are **flagged**, not faked.

## Cloudinary — functional once keys exist

`POST /api/uploads/sign` returns `{ timestamp, signature, apiKey, cloudName, folder }`.

The browser uploads **directly** to Cloudinary. The API stores only `public_id` (+ `isHero`, `alt`). It never proxies image bytes.

Needs: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Until then: `GET /api/uploads/status` reports `ready: false`. Fixture listings use `unsplash:` public ids.

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
