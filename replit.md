# GovID Extract — NID Card Maker

A full-stack NID card processing tool: upload a PDF, extract fields via OCR, edit the data, and print a pixel-perfect Bangladesh National ID Card.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/id-extractor run dev` — run the frontend (port 18202)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `id-extractor`, path `/`)
- API: Express 5 (artifact: `api-server`, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- PDF extraction: pdftotext + pdfimages (via Nix)
- Barcode: bwip-js (PDF417)

## Where things live

- `lib/db/src/schema/records.ts` — DB schema (single `recordsTable`)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/id-extractor/src/index.css` — Tailwind theme vars + NID card CSS classes
- `artifacts/id-extractor/src/components/NidCard.tsx` — NID card component (CSS-class based)
- `artifacts/id-extractor/src/pages/Home.tsx` — main extraction + print page
- `artifacts/id-extractor/public/registrar-sig.png` — registrar signature image

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks and Zod schemas
- NID card uses CSS classes (`.nid-card`, `.nid-cards-row`, etc.) defined in `index.css`, not inline styles — matches the ID-Card-Generator CSS template
- Print system: `#nid-print-area` hidden off-canvas on screen; `@media print` makes only that element visible, positioned on A4 page
- Photo back (signature) is processed client-side: dark signatures on white → transparent PNG; light signatures on dark → inverted
- API server uses pdftotext (text extraction) + pdfimages (image extraction) from Nix store

## Product

- **Extract page** — upload a PDF NID document, auto-extract fields via OCR; edit manually; preview live; click "ডাউনলোড কার্ড" to print
- **Records page** — searchable table of all processed documents
- **Record Detail** — edit any field, delete record, view raw OCR text
- **Dashboard** — total count, today's count, document type breakdown, recent activity feed

## Gotchas

- pdftotext and pdfimages binaries live in `/nix/store/…-replit-runtime-path/bin/` — the path is resolved dynamically at runtime via `which pdftotext`
- After changing the OpenAPI spec always run `pnpm --filter @workspace/api-spec run codegen`
- `pnpm --filter @workspace/db run push` must be run after schema changes before the API server can start cleanly

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
