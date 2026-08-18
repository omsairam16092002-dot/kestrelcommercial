# Brand rules (self-critique checklist)

Apply after every page.

## Colour

| Token | Hex | Role |
|---|---|---|
| oxblood | `#5C1F27` | Dominant. Boards, headers, nav, sale-side stamps. ~60% visual weight. |
| tan | `#D9A26B` | Accent only, or inverted ground for **lease** stamps. Never body text on paper. |
| paper | `#F3EDE8` | Warm white. **Never `#FFFFFF`.** |
| mauve | `#654F49` | Captions, secondary detail, contact lines. Contrast-safe on paper. |
| ink | `#2A1418` | Body text. |

### Status stamps (no exceptions)

- Sale-side (`for-sale`, `auction`, `sold`) → **oxblood** ground, paper text.
- Lease-side (`for-lease`, `leased`) → **tan** ground, ink text.
- `under-offer` uses `transactionSide` to pick the tone.

Never a thin tan rule on a light background — oxblood rules only.

## Type scale

Use only these classes. No ad-hoc sizes.

| Class | Role |
|---|---|
| `.t-display` | Homepage hero only |
| `.t-h1` | Page titles |
| `.t-h2` | Section titles |
| `.t-h3` | Card / block titles |
| `.t-body-lg` | Lede copy |
| `.t-body` | Body |
| `.t-caption` | Labels, CTAs, stamps |
| `.t-mono` | Every number: price, area, span, licence, phone |
| `.t-mono-lg` | Proof-strip numbers, listing price hero |

Faces:

- Display / UI: **General Sans** (self-hosted, `next/font/local`)
- Accent italic (one word per section): **Instrument Serif italic**
- Data: **IBM Plex Mono**, tabular figures. Non-negotiable.

## Imagery

Hero and lead listing images are **full-bleed**, high-res, oxblood **duotone**. Never a small boxed placeholder.

## Spec console

Shared `SpecSearchConsole` on `/`, `/buy`, `/lease`. Riveted data plate. Oxblood/tan Sale/Lease switch. Dial fields. Instant — no motion on inputs.

## Lead-gen

- One dominant CTA per page, top and bottom.
- `/sell` = Request an appraisal. Listings = Enquire. Everywhere else = Call the desk.
- Sticky mobile call/enquire bar on homepage and listing pages.
- Forms: name + phone/email + message + hidden topic/slug/page. Real confirmation with phone.
- `/sell`: sold/leased evidence before the appraisal form.

## Motion

Hero entrance. ~200ms scroll reveals. Proof-strip count-up. Card image zoom. `prefers-reduced-motion` kills all of it. Zero motion on spec dials or form fields.

Licence `089481L` on every footer and every listing detail.
