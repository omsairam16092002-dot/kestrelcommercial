# Kestrel Commercial

Production website + internal CRM API for Kestrel Commercial — industrial and commercial property, Melbourne west / north-west.

Public reference: [kestrelaus.netlify.app](https://kestrelaus.netlify.app/)

## Apps

| Path | Stack | Host |
|---|---|---|
| `frontend/` | Next.js 14 App Router, TypeScript, Tailwind | Vercel |
| `backend/` | Express + TypeScript, Mongoose, BullMQ | Railway / Render |
| `packages/shared/` | Types, spec filters, status→colour, fixtures | — |

## Quick start

```bash
cd kestrel-commercial
npm install

# optional: copy env (site runs on fixtures without Mongo)
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local

# terminal 1
npm run dev -w backend

# terminal 2
npm run dev -w frontend
```

- Site: http://localhost:3000
- API: http://localhost:4000/health

Without `MONGODB_URI` the API serves shared fixture listings and stores enquiries in memory. That is intentional until Atlas credentials arrive.

Seed Mongo once URI is set:

```bash
npm run seed -w backend
```

Job worker (Xero / PEXA) — separate process, needs Redis:

```bash
npm run worker -w backend
```

## Pages

- `/` homepage — oxblood hero + spec-search data plate + featured grid
- `/buy` `/lease` — filters persist as query params
- `/listing/[slug]` — gallery, spec plate, enquiry, agent + licence, map
- `/sell` — appraisal enquiry (`source: appraisal`)
- `/contact` `/about` `/services` `/investing` `/privacy`

## STUB flags (credentials required)

| Integration | Status | Needs |
|---|---|---|
| Cloudinary signed upload | **Code is real** | `CLOUDINARY_*` |
| MongoDB | Fixtures until URI set | `MONGODB_URI` |
| Redis / BullMQ | Disabled until URL set | `REDIS_URL` |
| Xero | Stub + documented OAuth | `XERO_*` |
| PEXA | Stub + documented poll flow | `PEXA_*` |

See `docs/architecture.md`, `docs/integrations.md`, `docs/brand.md`.

## Licence (must appear on every page)

Jignesh Jhanjaria · Estate Agent Licence **089481L**  
RAJNIL PTY LTD T/A KESTREL COMMERCIAL · ACN 701 032 840 · AUSTRAC reporting entity  
17 Jolimont Road, Point Cook VIC 3030 · 0456 970 000 · jignesh@kestrelcommercial.com
