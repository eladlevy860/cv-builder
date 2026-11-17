# CV Builder (Hebrew / English)

A local-first web app for writing CVs and cover letters in **Hebrew (RTL)** and **English (LTR)**. Right-to-left support is built in from the start, not added afterwards. All data stays in your browser (IndexedDB). You can back everything up to JSON and restore it.

> **Status: Phase 5 (Writing help and ATS tools) done.**
> - **Phase 1:** the app shell in Hebrew and English with RTL mirroring, data model and migrations, Dexie storage, the dashboard, and JSON backup/import.
> - **Phase 2:** the split-screen editor, every section type including Military Service, drag-and-drop, autosave, undo/redo, version history, a paginated live preview, and three templates.
> - **Phase 3:** PDF via headless Chromium, a "Print / Save as PDF" fallback, Word export with right-to-left Hebrew paragraphs, and the bidi test strings checked in the preview, the PDF and the DOCX.
> - **Phase 4:** all ten templates, a design panel, a template drawer showing your own CV in every template, real thumbnails on the dashboard, and page-length warnings with "fit on fewer pages".
> - **Phase 5:** writing help per section (tips, bilingual action words, example bullets that insert), live length hints, a completeness score with links to each issue, an ATS plain-text view, Hebrew-aware job-ad keyword matching, and "copy in the other language" from the editor.

## Requirements

- Node.js **22+** and npm 10+
- Linux, macOS or Windows. The commands below are for Linux.

## Install and run

### Windows (PowerShell, not as administrator)

```powershell
cd $HOME
mkdir Projects; cd Projects        # any folder outside system32 / OneDrive
git clone https://github.com/eladlevy860/cv-builder.git
cd cv-builder
git checkout claude/bilingual-cv-builder-c9dr3p
npm install
npx playwright install chromium    # needed for PDF export and browser tests
npm run dev                        # http://localhost:3000
```

If PowerShell says "running scripts is disabled", run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

### Linux / macOS

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
| `npm run test:e2e` | Builds, then runs the Playwright end-to-end and visual snapshot tests against `next start` on port 3100 |
| `npm run check` | typecheck + lint + unit tests |

### Playwright and Chromium

PDF export and the end-to-end tests use headless Chromium. On Windows and macOS, `npx playwright install chromium` is all you need. On Linux:

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

**Linux servers and containers:** set a UTF-8 locale (`LANG=C.UTF-8`). Without one, Chromium saves downloads with Hebrew names as a file called `download`. The Playwright config sets it for tests, and the Dockerfile sets it for production.

If Chromium isn't installed, the app still works. **Download → PDF** reports that server PDF is unavailable and offers the browser's **Print / Save as PDF** instead.

### Visual snapshot baselines

The committed screenshots in `tests/e2e/visual.spec.ts-snapshots/` are for Linux (`*-chromium-linux.png`). On Windows or macOS, fonts render slightly differently, so create local baselines once:

```bash
npm run build
npx playwright test visual --update-snapshots
```

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui-style components on Radix · Zustand + immer (editor) · Dexie (IndexedDB) · next-intl · zod · @dnd-kit · TipTap 3 · Playwright · Vitest.

Notes on deviations from the original plan:

- **shadcn/ui components** are in `src/components/ui`, written in the standard shadcn "new-york" form. The shadcn registry couldn't be reached from the build sandbox, so they were added by hand. `components.json` is present, so `npx shadcn add <component>` works on your machine.
- **UI locale** is stored in a cookie (`ui-locale`) with no `/he` or `/en` URL prefix. The first visit uses the browser's `Accept-Language`, falling back to Hebrew.
- **Undo/redo** uses a small history built into the Zustand store instead of `zundo`. Edits to the same field within about a second become one undo step, so Ctrl+Z undoes a typed word rather than a single letter. Structural changes (add, delete, move) are always their own step. TipTap's own history is turned off, so Ctrl+Z behaves the same in every field.
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
      editor/[id]/          split-screen editor
    api/pdf/route.ts        POST document → PDF
    render/                 bare document renderer (Chromium PDF + visual tests)
  core/                     framework-free logic, fully unit-tested
    model/                  zod schemas + types, factories, rich-text AST, fonts, operations
    migrations/             schemaVersion migrations
    storage/                StorageAdapter interface + Dexie implementation
    export/                 JSON backup/import, JSON Resume import, docx.ts (Word export)
    i18n-doc/               labels that appear *inside documents*: section titles, dates
    bidi/                   direction detection, LTR-token splitting, Israeli phone formatting
    samples/                Hebrew and English sample CVs (the Hebrew one is the bidi fixture)
    render/entries.ts       format-independent view of items (shared by templates, DOCX, ATS text)
    writing/                tips, action verbs and examples (content.ts), length/weak-opening checks, completeness score
    ats/                    plain-text extraction, Hebrew-aware job-ad keyword matching
  templates/
    meta.ts                 metadata for all 10 templates
    registry.ts             the ten template definitions
    types.ts                TemplateDefinition, Block, RenderContext
    primitives/             text.tsx (all bidi handling), parts.tsx, build.tsx, two-column.tsx
    paginator.tsx           measures blocks and packs them into real pages
    apply.ts                switching templates, template theme defaults, design reset
    fit.ts                  candidate settings for "fit on fewer pages"
    base.css, <id>/         shared and per-template styles
  server/pdf.ts             headless Chromium PDF rendering (used by app/api/pdf)
  features/export/          client export actions (PDF, DOCX, print)
  features/dashboard/       dashboard UI (cards, create flow, dialogs)
  features/editor/          store (history), autosave, form panels, design panel, template drawer, writing help,
                            review (score) and ATS tabs, preview, topbar
  features/thumbnail/       real first-page thumbnails (dashboard, drawer, create dialog, landing)
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

## Editor

- **Store:** `src/features/editor/store.ts` holds the document being edited, the undo/redo history and the save status. Every change goes through `update(recipe, { coalesce })`, which applies an immer recipe.
- **Autosave:** `use-autosave.ts` writes to storage 0.7s after the last change and when you leave the page. It also takes an automatic version snapshot at most every 10 minutes and keeps the latest 20. **Ctrl+S** saves immediately and records a version. The history dialog lets you save named versions and restore any version; a restore can itself be undone with Ctrl+Z.
- **Drag and drop:** `@dnd-kit` handles vertical lists, works with the keyboard (Space to pick up, arrows to move, Space to drop) and gives screen-reader announcements in Hebrew and English. Each section and item menu also has "Move up/down".
- **Preview:** the preview renders a deferred copy of the document, so typing stays responsive. Clicking anything in the preview opens and scrolls to that section or item in the form. Zoom is applied per page so pagination is always measured at 100%.
- **Design panel** (`design/design-panel.tsx`, the "Design" tab or button): accent color (template presets, a color picker or a hex code), body and heading fonts, font size, line spacing, section heading style, space between sections, page margins, A4 or Letter, photo and contact icons on or off, date format, and "היום"/"כיום" for ongoing periods. Every change is one undo step. "Reset to the template's design" restores the template's defaults and keeps your content and photo setting.
- **Template drawer** (`design/template-drawer.tsx`): every thumbnail is your own CV rendered in that template by the same renderer as the preview, with filters (ATS-friendly, 1 or 2 columns, photo). Picking a template applies it at once, and Ctrl+Z switches back. In Hebrew the drawer opens from the right, over the form, so the full preview stays visible.
- **Page-length warnings:** the paginator reports how full the last page is and whether anything is cut off. When the last page holds only a few lines, the preview offers "Fit on N pages". It tries progressively tighter settings off-screen with the real renderer (space between sections first, then line spacing and margins, font size last, never below 9pt) and applies the first that fits, as a single undoable step. An item taller than a whole page is reported as cut off, and more than two pages gets a gentle warning.

## Writing help and ATS tools

- **Writing help** (the light-bulb button on a section): what recruiters look for, an action-word library in both languages (click to copy; Hebrew uses action nouns such as תכנון / הובלת, as Israeli CVs do), and example bullets for mechanical engineering, students and general roles. "Add" inserts an example as an editable bullet into the chosen item (or a new one) and is one undo step. Numbers in [brackets] are placeholders. The content lives in `src/core/writing/content.ts`.
- **Length hints** under the summary and every description: summary length (200–600 characters), bullets per role (2–6), bullets over 180 characters, and bullets that open with weak phrases ("Responsible for", "אחראי על", "השתתפות ב…").
- **Review tab:** a completeness score (contact details, headline, summary, experience, bullets per role, wording, dates, education, skills, empty sections, page count from the live preview) with a "Fix" link on every issue that opens the right section and item.
- **ATS tab:**
  - readiness notes (two-column templates, photo, non-standard section titles);
  - a plain-text view: what an applicant-tracking system extracts, built from the same entry model as the templates and Word export;
  - job-ad matching: paste an ad in Hebrew or English to see matched and missing keywords, a match score, and the ad with highlights. Missing known tools can be added to your skills with one click. The ad is kept per document in this browser.
- **Hebrew keyword matching** (`src/core/ats/keywords.ts`): words are normalized (niqqud, geresh/gershayim and quotes removed, final letters folded), then reduced to candidate stems by stripping up to three prefix letters (ה ו ב ל מ ש כ) and one common ending (ים, ות, ית, ה, ת, י), never below three letters. Two words match when their stems overlap, so "בתכנון" matches "תכנון" and צה"ל matches צה״ל. Generic job-ad words (ניסיון, דרישות, יתרון…) are ignored, known tools and phrases (SolidWorks, GD&T, "ניהול פרויקטים") rank first, and Hebrew spellings of tools (מטלב, סולידוורקס) map to their Latin names. Unit tests are in `tests/unit/writing.test.ts`.
- **Copy in the other language** (top bar): creates a copy in Hebrew or English with section titles, fonts and the "present" label switched, then opens it for you to translate.

## Templates and pagination

A template is a `TemplateDefinition` (`src/templates/types.ts`):

- `build(ctx)` returns `{ header, main: Block[], side: Block[] }`. A *block* is an unbreakable unit: a section heading (`keepWithNext`), one item, a summary, the group of languages, or a row of items (`perRow`, used for Student's two-column course list). `attachHeadings()` merges a heading into its first item's block for label-column layouts (Minimal).
- `Frame` renders one page's structure and puts `main` and `side` into elements marked `data-region="main" | "side"`, which fill the remaining page height.
- The paginator (`src/templates/paginator.tsx`) works in four steps:
  1. It renders hidden measuring copies: the first-page frame and a following-page frame (to read each region's capacity), and every block at the real width (to read its height).
  2. It packs the blocks into pages. A heading always moves together with its first item, and an oversize block gets its own page.
  3. It renders real fixed-size pages (`210×297mm` or Letter).
  4. The preview, `/render` and the PDF all use this same component, so page breaks always agree.

**Bidi inside templates** is handled only in `primitives/text.tsx`:

- Paragraphs and bullets keep the document direction. Every run in the other direction is wrapped in an isolated span, found by `splitRuns()` in `src/core/bidi`, so `C++`, `GD&T`, `ISO 9001:2015` and `(2023–2025)` stay intact in Hebrew.
- Short fields (name, role, organization) are `<bdi>`. They take their own direction and their inner runs are isolated too.
- Emails, phones and URLs are always isolated left-to-right. Date ranges made only of numbers are one LTR run. Ranges ending in "היום" keep Hebrew order.
- Bullets are drawn with `::before` at `inset-inline-start`, so they mirror correctly and look the same in every font.

### Adding a template

1. Add metadata in `src/templates/meta.ts`.
2. Create `src/templates/<id>/index.tsx` exporting a `TemplateDefinition`:
   - Build blocks with `splitSections()` and `sectionBlocks()` from `primitives/build.tsx`, and the header with `NameBlock`, `Contacts` and `Photo` from `primitives/parts.tsx`.
   - Optionally set `themeDefaults` (applied on switch only where the user hasn't changed the value), `sideTypes` for two-column layouts (use `TwoColumnFrame` from `primitives/two-column.tsx`), and `promoteTypes` to move sections up when the template is applied (Student moves education up).
3. Create `src/templates/<id>/styles.css`. Scope every rule with `.tpl-<id>`, use **logical properties only** (no left/right), and take sizes and colors from the theme variables (`--cv-accent`, `--cv-on-accent`, `--cv-font-body`, `--cv-font-heading`, `--cv-fs`, `--cv-lh`, `--cv-gap`, `--cv-margin`). Import the file in `src/templates/styles.css`.
4. Register the template in `src/templates/registry.ts`. The visual, PDF and Word-length tests pick up every template in `meta.ts` automatically.
5. Run `npx playwright test visual --update-snapshots`, then check the new PNGs in both languages.

## Export

### PDF (server-side headless Chromium)

```
browser ──POST /api/pdf {document}──▶ route.ts ──▶ src/server/pdf.ts
                                                  │  one shared Chromium, new context per request
                                                  │  addInitScript(window.__CV_DOC__ = document)
                                                  │  goto <origin>/render   (same React templates)
                                                  │  wait for window.__RENDER_DONE__ (fonts + pagination)
                                                  ▼  page.pdf({ preferCSSPageSize, printBackground, tagged })
browser ◀──────────── application/pdf (Hebrew file name kept via filename*=UTF-8'') ──┘
```

- **The document comes from the browser.** It lives in your IndexedDB, so the browser sends it. The route validates and migrates it with zod, and rejects bodies over 8 MB and cross-origin requests.
- **The render page can only load this app's own assets.** Every other request is blocked, so links or photo URLs in a CV can never make the server fetch anything.
- **The PDF is identical to the preview.** It uses the same components, CSS, self-hosted fonts and paginator: `@page` sets the paper size, and each `.cv-page` is one PDF page. Fonts are embedded as subsets, and the PDF is tagged, so text extraction and ATS parsing work.
- **Behind a reverse proxy,** set `PDF_RENDER_ORIGIN` (for example `http://127.0.0.1:3000`) if the server can't reach its own public URL.

### Print / Save as PDF (fallback)

**Download → Print / Save as PDF**, **Ctrl+P** in the editor, or the dashboard card menu opens `/render?id=<id>&print=1` in a new tab. That page reads the CV from this browser's storage, lays out the same pages with the right `@page` size and zero margins, and opens the print dialog. This works on any host, including static or serverless deployments without Chromium.

### Word (.docx)

Generated in the browser with the `docx` package (`src/core/export/docx.ts`), and labelled **"Word (simplified layout)"** in the UI.

- **Content:** a single-column version of the CV with the same sections, order and content as the template. Hidden sections and items are left out, the same as in the preview.
- **Direction:** Hebrew documents use bidirectional paragraphs and sections. Every run has an explicit direction (`w:rtl`), and runs in the opposite direction are wrapped in invisible LRM/RLM marks. Word and LibreOffice don't isolate runs the way browsers do, and without the marks `10/2023 – 02/2025` would come out as `02/2025 – 10/2023`.
- **Fonts:** Word can't use the web fonts, so sans-serif themes map to Arial and serif themes to Times New Roman. Both include Hebrew on Windows and macOS.
- **Length:** Word's line spacing is converted from the template's CSS line-height, so the Word file comes out about as long as the PDF. One-column templates fill about 90% of the page where the PDF fills 97–100%, which leaves headroom because Word lays out text slightly differently from Chromium. Two-column templates are packed tighter (`DENSITY_TWO_COLUMNS` in `docx.ts`) because their sidebar becomes extra lines in Word's single column. Templates whose layout differs more from a single column set their own factor (`wordDensity` in `meta.ts`): Minimal keeps headings beside the content, and Compact and Engineer put a lot into the side column. `tests/e2e/docx-fit.spec.ts` fills each template to a full page in both languages and checks the Word file is one page and not much emptier. It uses LibreOffice and is skipped if LibreOffice isn't installed.

### Bidi verification

The Hebrew sample CV contains every string in `BIDI_FIXTURE_STRINGS`, and the tests check each output:

| Output | Test |
| --- | --- |
| Preview | `tests/e2e/editor.spec.ts`: each LTR token is inside an LTR-isolated span |
| PDF | `tests/e2e/export.spec.ts`: downloads the PDF for each template, extracts text with pdf.js, rebuilds logical order (`tests/e2e/pdf-text.ts`) and checks every fixture string |
| DOCX | `tests/unit/docx.test.ts`: paragraph and run direction, LRM pinning, section order. `tests/e2e/export.spec.ts` checks the downloaded file |

Generated files are kept for inspection in `test-output/` (`e2e-exports/*.pdf|docx` and `docx/sample-*.docx`).

## Deploying

- **Docker on a VPS, Fly.io, Render or Railway (recommended).** The included `Dockerfile` is based on `mcr.microsoft.com/playwright:v1.63.0-noble`, which includes Chromium and its system libraries, and sets `LANG=C.UTF-8` and `PDF_RENDER_ORIGIN`. It hasn't been built yet: the development sandbox has no Docker daemon.
  ```bash
  docker build -t cv-builder .
  docker run -p 3000:3000 cv-builder
  ```
- **Vercel / serverless.** The app itself deploys as is. Server-side PDF needs `playwright-core` plus a slim Chromium build such as `@sparticuz/chromium`, which brings a function size limit (about 50MB compressed), 2–5s cold starts and execution time limits. Fonts still load from the app's own `/render` page, so they stay identical. It works but is more fragile than Docker. The in-browser **Print / Save as PDF** fallback works on any host.
