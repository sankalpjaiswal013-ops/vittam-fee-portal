
# Vittam — school fee reconciliation platform

## Stack note (important)

The brief specifies Next.js 14 App Router. This Lovable project runs on **TanStack Start v1 + React 19 + Vite** — the framework is fixed and can't be swapped. I'll map the intent one-to-one:

- Next.js App Router pages → TanStack file routes under `src/routes/`
- Server actions / route handlers → `createServerFn` + `src/routes/api/public/*`
- Supabase Postgres, Storage, RLS, signed URLs → same, via Lovable Cloud (managed Supabase)
- Razorpay server-side signature verification → server function reading secrets

Everything else (design system, motion, palette, pages, copy tone) is built as specified.

## Phase 1 — Design system + frontend (this plan)

Ship all six pages with realistic mock data, full visual language, and interactions. No backend yet — this makes the design reviewable fast and avoids gating on Cloud/Razorpay/secrets decisions.

### Design system (`src/styles.css`)

- Tokens (light): `--paper #FAF6EE`, `--ink #14171B`, `--marigold #E8A33D`, `--banyan #2F6B4F`, `--alert #C4432B`. Dark mode inverts Paper/Ink; accents unchanged.
- Map into shadcn tokens via `@theme inline`: background=paper, foreground=ink, primary=marigold, success=banyan (new), destructive=alert.
- Fonts loaded via `<link>` in `__root.tsx` head (Google Fonts): Fraunces, Inter, IBM Plex Mono. Registered as `--font-serif`, `--font-sans`, `--font-mono` in `@theme`. Mono uses `font-variant-numeric: tabular-nums` globally for amounts.
- `.receipt-glass` utility: glassmorphic card (backdrop-blur, paper/30 bg, marigold-tinted border), perforated top edge via `radial-gradient` mask creating scalloped notches, subtle inner shadow.
- `<ReceiptCard>` component wraps `.receipt-glass` + Framer Motion 3D tilt (`rotateX`/`rotateY` from cursor position, `perspective: 1000px`). Guarded by `useReducedMotion()` — tilt disabled when set.
- Status pill component: banyan (reconciled), marigold (pending), alert (overdue).

### Routes

```text
src/routes/
  index.tsx                    landing
  student-login.tsx            parent/student login
  student.tsx                  student dashboard
  admin/
    students.tsx               CSV ingestion
    verify.tsx                 slip verification
  dashboard.tsx                defaulter risk (admin)
```

Each route gets its own `head()` with unique bilingual-ready title + description. `__root.tsx` metadata replaced (currently "Lovable App").

### Page details

1. **Landing (`/`)** — replaces placeholder index. Fraunces H1 "Every rupee, reconciled.", Inter subhead about UPI + cash/cheque bridge. Below: three-slab R3F scene (`@react-three/fiber` + `drei`) of drifting receipt-like planes in Marigold/Banyan/Paper, slow autorotation, gated behind `<ClientOnly>` and dynamic import. Three stat ReceiptCards below fold. Nav links to student login + admin.

2. **Student login (`/student-login`)** — Top: dismissible overdue notification banner (Alert border, student name/class/balance/late-fee, "resolve now" link). Form: full name + roll number inputs, then a disabled "send OTP to guardian" second step visible in the flow so the UI reserves space for it. Copy explains roll number isn't a secret. Client-side only for now; on submit, navigates to `/student` with mock data.

3. **Student dashboard (`/student`)** — Three metric ReceiptCards (outstanding, auto late fee in Alert, payment status). Main ReceiptCard: initials avatar, name/class/roll, Marigold "pay now" CTA. Transaction table below (date, method pill UPI/cash/cheque, amount in mono, status pill). Per-row "view receipt" opens a print-styled modal (`@media print` styles hide chrome, show single receipt); browser print = PDF.

4. **Admin students (`/admin/students`)** — Two-column: drag-drop CSV zone (react-dropzone) + paste textarea. Parse client-side, show preview table with duplicate-roll-no rows highlighted in Alert before a "commit" button. All in-memory for phase 1.

5. **Admin verify (`/admin/verify`)** — Masonry thumbnail grid of mock slip images (placeholder unsplash-style). Click → receipt-glass lightbox (Dialog) with full slip, note, verifier name input, "mark reconciled" (Banyan) + "reject" (Alert) actions.

6. **Defaulter dashboard (`/dashboard`)** — Sortable table ranked by risk score (computed from balance × days overdue). Row action opens a small popover with editable message, then "send WhatsApp" opens `https://wa.me/<number>?text=<encoded>` in a new tab with pre-filled name/class/balance/mock-checkout-link. Uses `encodeURIComponent`.

### Motion + a11y

- Framer Motion for card tilts, page fade-ins, table row stagger.
- `prefers-reduced-motion` disables tilt and reduces fade to opacity-only.
- R3F scene on landing only. All other screens are DOM-only for mobile perf.
- Semantic HTML, single H1 per page, alt text on slip thumbnails.

### Copy

Sentence case throughout. Empty states: "No slips awaiting verification. New uploads appear here." Error states name the problem + next step. All strings kept short for Hindi parity (no i18n framework yet — Phase 3).

## Phase 2 — Backend wiring (after Phase 1 approval)

Enable Lovable Cloud, then:

- Tables: `students`, `transactions`, `deposit_slips`, `reminders`, `admins`, `user_roles` (separate roles table per security rules). RLS: students read only rows where `auth.uid()` matches their linked user; admins gated via `has_role()` security-definer function.
- Supabase Storage bucket `deposit-slips` (private), served via signed URLs from a `createServerFn`.
- Razorpay: `enable_stripe_payments`/Paddle aren't Razorpay — Razorpay isn't a built-in Lovable payment provider, so this needs the user's Razorpay key + secret via `add_secret`, and a `/api/public/razorpay/webhook` server route doing HMAC signature verification.
- Auth: student login = name + roll no lookup → OTP to guardian phone (needs an SMS provider — TBD in Phase 2 kickoff).
- Ingestion commits CSV to `students` table with duplicate-roll validation server-side.

## Phase 3 — Bilingual (हिंदी)

Add `i18next` + `react-i18next`, extract strings, ship a language switcher. Not in Phase 1 scope but layouts are sized for it.

## Out of scope for this plan

- Real payment processing, real OTP delivery, real WhatsApp Business API (using `wa.me` deeplinks is fine and matches the brief).
- Multi-school tenancy, accountant roles beyond a single admin role.

## Confirm before I build

1. OK to proceed with TanStack Start (not Next.js) given the constraint above?
2. Build Phase 1 (frontend + mock data) first, then approve Phase 2 backend as a separate step? Or enable Cloud now and interleave?
