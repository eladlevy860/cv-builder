# CV Builder (Hebrew / English)

A local-first web app for writing CVs and cover letters in **Hebrew (RTL)** and **English (LTR)**. Right-to-left support is built in from the start, not added afterwards. All data stays in your browser (IndexedDB). You can back everything up to JSON and restore it.

> **Status: Phase 1 (Foundation) done.** It includes the app shell in Hebrew and English with full RTL mirroring, light and dark themes, the data model with migrations, Dexie storage, and a dashboard where you can create, duplicate, clone to the other language, rename, delete and import/export JSON. The editor, templates and PDF/DOCX export come in phases 2–3.

## Requirements

- Node.js **22+** and npm 10+
- Linux, macOS or Windows. The commands below are for Linux.

## Install and run

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start        # http://localhost:3000
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / server |
| `npm run typecheck` | Generates Next route types, then `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): model, migrations, storage, import/export, dates, phone and bidi helpers, message parity |
| `npm run test:e2e` | Builds, then runs the Playwright end-to-end tests against `next start` on port 3100 |
| `npm run check` | typecheck + lint + unit tests |

### Playwright and Chromium on Linux

The end-to-end tests (and, from phase 3, PDF export) use headless Chromium:

```bash
npx playwright install --with-deps chromium
```

`--with-deps` installs the system libraries Chromium needs (it uses `apt` and asks for sudo on Debian/Ubuntu). If you prefer to install them yourself, on Ubuntu 22.04/24.04:

```bash
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2t64 fonts-noto-color-emoji
```

(On 22.04 the last audio package is `libasound2`.)

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui-style components on Radix · Zustand (editor, phase 2) · Dexie (IndexedDB) · next-intl · zod · @dnd-kit / TipTap (phase 2) · Playwright · Vitest.

Notes on deviations from the original plan:

- **shadcn/ui components** are in `src/components/ui`, written in the standard shadcn "new-york" form. The shadcn registry couldn't be reached from the build sandbox, so they were added by hand. `components.json` is present, so `npx shadcn add <component>` works on your machine.
- **UI locale** is stored in a cookie (`ui-locale`) with no `/he` or `/en` URL prefix. The first visit uses the browser's `Accept-Language`, falling back to Hebrew.
- **Fonts** are bundled from `@fontsource/*`: Heebo, Rubik, Assistant, Noto Sans Hebrew, IBM Plex Sans Hebrew, Frank Ruhl Libre, David Libre and Secular One. Nothing is loaded from a CDN, so the app, the preview and the PDF all use the same font files and work offline.

## Project structure

```
src/
  app/
    layout.tsx              root: <html lang dir> from the UI locale, providers, fonts
    fonts.ts                @fontsource imports (Hebrew + Latin subsets)
    globals.css             design tokens (light/dark), bidi utility classes
    (shell)/                pages that use the app header
      page.tsx              landing
      dashboard/            documents dashboard
      editor/[id]/          editor (placeholder until phase 2)
  core/                     framework-free logic, fully unit-tested
    model/                  zod schemas + types, factories, rich-text AST, fonts, operations
    migrations/             schemaVersion migrations
    storage/                StorageAdapter interface + Dexie implementation
    export/                 JSON backup/import, JSON Resume import
    i18n-doc/               labels that appear *inside documents*: section titles, dates
    bidi/                   direction detection, LTR-token splitting, Israeli phone formatting
    samples/                Hebrew and English sample CVs (the Hebrew one is the bidi fixture)
  templates/meta.ts         template metadata (components arrive in phase 2)
  features/dashboard/       dashboard UI (cards, create flow, dialogs)
  components/ui/            shadcn/ui components
  components/shell/         header, locale switcher, theme toggle, providers
  i18n/                     next-intl config (cookie-based locale)
  messages/{he,en}.json     UI strings
tests/unit/                 Vitest
tests/e2e/                  Playwright
```

## Data model

`src/core/model/schema.ts` is the single source of truth. It uses zod schemas and derives the TypeScript types from them. It is based on JSON Resume, with these extensions:

- `Document` is either `cv` or `coverLetter`. Fields: `schemaVersion`, `id`, `title`, `language` (`he` | `en`, which sets the document's `dir`), `templateId`, `theme`, `basics`, `createdAt` and `updatedAt`. A CV also has `sections[]`. A cover letter also has `letter` and `linkedCvId`.
- **Sections** are a discriminated union over `summary`, `experience`, `education`, `military`, `projects`, `skills`, `languages`, `courses`, `awards`, `volunteering`, `references` and `custom`. Every section has a `title` (null means the default title for the document language), `visible` and `placement`, and its items have their own `visible` flag. Order is array order.
- **Dates** are stored as `{ year, month? }` plus `present`. They are formatted only when rendered: `05/2025 – היום` in Hebrew, `May 2025 – Present` in English.
- **Rich text** is TipTap/ProseMirror-compatible JSON, restricted to paragraphs, bullet and numbered lists, bold, italic and links.
- **Optional personal fields** (ID number, birth date, marital status and so on) live in `basics.extras` and are empty by default.
- Snapshots (version history), job applications and settings each have their own table.

### Migrations

Every stored or imported document carries `schemaVersion`. On every read and import, `migrateDocument()` runs the registered migrations in order (`src/core/migrations/index.ts`) and then validates with zod. To change the shape:

1. Bump `SCHEMA_VERSION` in `schema.ts` and update the schema.
2. Add `{ from: N, description, up }` to `MIGRATIONS`. It must be a pure function that works on plain objects.
3. Add a unit test that migrates a fixture of the old shape.

Documents from a *newer* app version are rejected with a clear error instead of being corrupted.

### Storage adapter

The UI only talks to `StorageAdapter` (`src/core/storage/adapter.ts`). `DexieStorageAdapter` implements it on IndexedDB, with live updates via Dexie `liveQuery`. To add a cloud backend later (for example Supabase auth + Postgres), write another adapter and choose between them in `getStorage()`. Editor and dashboard code doesn't change.

### Backup and import

- **Back up everything** downloads `{ format: "cv-builder-backup", documents, snapshots, applications }`.
- The card menu's **Download → JSON** downloads one document with its version history.
- **Import** accepts a full backup, a single document, or a [JSON Resume](https://jsonresume.org/schema) file (the language is detected from the content).
  - In *merge* mode nothing is overwritten. Identical documents are skipped, and changed documents are added as copies.
  - *Replace* mode clears the browser's data first.

## Hebrew / RTL approach

- The UI direction follows the UI language (`<html dir>`). Each document has its own `dir` from `document.language`, so a Hebrew UI can edit an English CV and vice versa.
- Only logical CSS is used: Tailwind `ms-/me-/ps-/pe-/start-/end-` and `text-start`. Radix gets the direction from `Direction.Provider`, so menus, submenus and keyboard navigation mirror. Toasts move to the bottom-left in RTL.
- Directional icons (arrows, chevrons) use `rtl:-scale-x-100`. Non-directional icons don't flip.
- User text in the shell uses `.bidi-plain` (`unicode-bidi: plaintext`) or `<bdi>`. Emails, URLs and phones use `.ltr-isolate`. Inputs default to `dir="auto"`.
- `src/core/bidi` provides direction detection and `splitBidiRuns()`, which keeps tokens such as `C++`, `GD&T`, `ISO 9001:2015` and `SolidWorks 2024` intact for DOCX runs. It also provides Israeli phone formatting (`052-1234567`, `+972-52-123-4567`).
- **Bidi fixture:** the Hebrew sample CV (`createSampleCv("he")`) contains every string in `BIDI_FIXTURE_STRINGS`. Phase 3 checks these strings in the preview, the PDF and the DOCX.

## Adding a template (preview of phase 2)

1. Add metadata to `src/templates/meta.ts`: id, Hebrew and English names, columns, `atsFriendly`, `supportsPhoto`, tags and accent presets.
2. Phase 2 adds `src/templates/<id>/` with a React component `(resume, theme, dir) => JSX` built from shared primitives (`SectionHeading`, `DateRange`, `BulletList`, `ContactItem`, `SkillGroup`). Bidi handling stays in those primitives. Styles use only logical properties and theme CSS variables.
3. Phase 2 also registers the template in `src/templates/registry.tsx`. The visual snapshot tests then cover it in Hebrew and English automatically.

## PDF pipeline (phase 3, planned)

The client POSTs the document JSON to `/api/pdf`. The route keeps one Playwright Chromium instance and opens the app's own `/render` page with the document injected. It waits for `document.fonts.ready` and for the paginator to finish, then calls `page.pdf({ preferCSSPageSize: true, printBackground: true })`. Because Chromium renders the same HTML/CSS and fonts as the preview, the two match exactly and Hebrew bidi is shaped correctly. A **Print / Save as PDF** fallback uses the browser's own print dialog with `@page` CSS.

## Deploying

- **Docker on a VPS, Fly.io, Render or Railway (recommended).** Base the image on `mcr.microsoft.com/playwright:v1.63.0-noble`, which includes Chromium and its system libraries, then run `npm ci && npm run build && npm start`. PDF generation works out of the box.
- **Vercel / serverless.** The app itself deploys as is. Server-side PDF needs `playwright-core` plus a slim Chromium build such as `@sparticuz/chromium`, which brings a function size limit (about 50MB compressed), 2–5s cold starts and execution time limits. Fonts still load from the app's own `/render` page, so they stay identical. It works but is more fragile than Docker. The in-browser **Print / Save as PDF** fallback works on any host.
