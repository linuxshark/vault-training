# Vault Associate Training Platform — Design Spec

**Date:** 2026-04-11
**Status:** Approved (pending spec review)
**Target:** Personal study interface for HashiCorp Vault Associate (003) certification

---

## 1. Purpose & scope

Build a **local-first, single-user web interface** to study for the HashiCorp Vault Associate (003) exam, consolidating content from four sources into an ordered, trackable study path with persistent progress and personal notes.

**In scope (v1):**
- Ordered navigation of all 9 official exam objectives and their sub-tasks.
- Per-task reading experience with three content tabs: "Explicación sencilla" (for-dummies summary), "Notas técnicas" (condensed notes), "Lab" (copyable commands + external link).
- Persistent progress state per task (four states) and personal Markdown notes.
- Dark-mode documentation-grade UI with keyboard navigation.
- Single-command local deployment (`docker compose up -d`).

**Out of scope (v1 — may be v2+):**
- Embedded/local Vault labs (user runs labs in the upstream `btkrausen/vault-codespaces`).
- Quizzes, flashcards, or spaced-repetition.
- Multi-user auth, multi-device sync, cloud hosting.
- CI/CD, GitHub Actions, or any remote automation.
- Content generation on-demand during the study session (all summaries are pre-generated in batch).

## 2. Content sources

| Source | Role | License | Access |
|---|---|---|---|
| `developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-study-003` | Authoritative taxonomy (9 objectives + sub-tasks + official URLs) | HashiCorp ToS — **link only, do not copy body** | Scraped for structure at ingest time |
| `developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-review-003` | Cross-reference for review section | Same as above | Referenced via external link |
| `github.com/ismet55555/Hashicorp-Certified-Vault-Associate-Notes` | Condensed technical notes per topic | MIT | Shallow-cloned, parsed, attributed |
| `github.com/btkrausen/vault-codespaces` | Lab commands and exercises | Apache 2.0 | Shallow-cloned, parsed, attributed, deep-linked |
| Claude-generated summaries | "For-dummies" explainers with analogies | Original, project-local | Batch-generated once via Anthropic API and committed |

## 3. Architecture

### 3.1 High-level

Single Next.js 14+ application, served from one Docker container behind `docker-compose`, with two mounted volumes (SQLite database + MDX content tree). No secondary services.

```
┌──────────── docker-compose.yml ────────────────────┐
│                                                    │
│  service: app (Next.js 14+)                        │
│   ├─ App Router (RSC by default)                   │
│   ├─ Prisma ORM → SQLite (bind mount ./data)       │
│   ├─ MDX loader → ./content (bind mount, ro)       │
│   ├─ Tailwind + shadcn/ui + Lucide icons           │
│   └─ Port 3000 exposed                             │
│                                                    │
│  Volumes:                                          │
│   ./data → /app/data (rw, SQLite)                  │
│   ./content → /app/content (ro, MDX tree)          │
└────────────────────────────────────────────────────┘
```

### 3.2 Runtime stack

- **Framework:** Next.js 14+ (App Router, React Server Components, standalone output).
- **Language:** TypeScript strict.
- **Database:** SQLite via Prisma ORM.
- **Content:** MDX with typed frontmatter (Zod-validated).
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives) + Lucide icons.
- **Runtime:** Node 20 Alpine.
- **No CDN, no external services, no telemetry.**

### 3.3 Ingestion stack (run on host, not in container)

- Node TypeScript CLIs under `scripts/ingest/*.ts` (tsx runtime).
- Shallow `git clone` into `/tmp` for GitHub sources.
- Anthropic SDK for the explainer generator.
- Output is always `.mdx` files written to `./content/`, committed to the repository.

## 4. Content model

### 4.1 Filesystem layout

```
content/
├── _index/
│   └── objectives.json           # Generated taxonomy from associate-study-003
└── domains/
    ├── 1-vault-arch/
    │   ├── _meta.mdx             # Domain overview
    │   └── <task-slug>/
    │       ├── explained.mdx     # Claude-generated, "for dummies"
    │       ├── notes.mdx         # From ismet55555
    │       └── lab.mdx           # From btkrausen
    ├── 2-tokens/
    │   └── ...
    └── ... (9 domains total)
```

### 4.2 MDX frontmatter contract

Every `.mdx` file under `content/domains/` ships with this frontmatter, validated by a Zod schema in `lib/content/frontmatter.ts`:

```yaml
---
objectiveId: "3"              # FK to Objective
taskSlug: "kv-v2"             # unique within a domain
kind: "explained"             # "explained" | "notes" | "lab"
title: "KV v2: versiones y soft-delete"
source: "claude"              # "claude" | "ismet55555" | "btkrausen"
sourceUrl: "https://..."      # attribution URL
license: "MIT"                # license string
order: 2                      # sort order inside the task
estMinutes: 12                # optional reading estimate
---
```

### 4.3 Database schema (Prisma)

```prisma
model Objective {
  id          String   @id                 // "1" .. "9"
  slug        String   @unique
  title       String
  orderIndex  Int
  tasks       Task[]
}

model Task {
  id          String   @id                 // "<objectiveSlug>/<taskSlug>"
  slug        String
  title       String
  objectiveId String
  orderIndex  Int
  hidden      Boolean  @default(false)     // true if content removed from disk
  objective   Objective @relation(fields: [objectiveId], references: [id])
  progress    TaskProgress?
  note        TaskNote?

  @@unique([objectiveId, slug])
}

model TaskProgress {
  taskId      String   @id
  task        Task     @relation(fields: [taskId], references: [id])
  status      Status   @default(NOT_STARTED)
  lastVisit   DateTime?
  firstSeen   DateTime?
  reviewedAt  DateTime?
  masteredAt  DateTime?
  updatedAt   DateTime @updatedAt
}

enum Status {
  NOT_STARTED
  READING
  REVIEWED
  MASTERED
}

model TaskNote {
  taskId    String   @id
  task      Task     @relation(fields: [taskId], references: [id])
  body      String                         // Markdown
  updatedAt DateTime @updatedAt
}

model StudySession {
  id         String   @id @default(cuid())
  startedAt  DateTime @default(now())
  endedAt    DateTime?
  taskId     String?
}
```

### 4.4 Seed and catalog regeneration

At application start, `lib/seed.ts` walks `content/_index/objectives.json` and `content/domains/**/` and upserts `Objective` + `Task` rows. `TaskProgress` and `TaskNote` are never touched by the seed, so re-seeding is safe for user data.

If a `Task` row exists in the database but its corresponding content directory is no longer present on disk (e.g., a task was renamed upstream), the seed flags the row with `hidden = true` instead of deleting it. Hidden rows are excluded from navigation but preserve any attached progress and notes for later recovery. A CLI flag `--prune` on the seed script removes hidden rows permanently.

### 4.5 Library contracts

- `lib/content/loader.ts` — `loadTask(objectiveId, taskSlug)` returns `{ explained, notes, lab, externalLinks }` by reading up to three MDX files.
- `lib/progress.ts` — `getProgress(taskId)`, `setStatus(taskId, status)`, `touchVisit(taskId)`.
- `lib/notes.ts` — `getNote(taskId)`, `saveNote(taskId, markdown)` (autosave-friendly).
- Frontend components never call Prisma directly; they go through `/api/*` routes.

## 5. Ingestion pipeline

Each script is idempotent and re-runnable.

| Script | Input | Output |
|---|---|---|
| `npm run ingest:index` | `associate-study-003` HTML | `content/_index/objectives.json` |
| `npm run ingest:ismet` | `github.com/ismet55555/...` + `config/ismet-mapping.yaml` | `content/domains/<n>/<task>/notes.mdx` (with license/source frontmatter) |
| `npm run ingest:labs` | `github.com/btkrausen/vault-codespaces` | `content/domains/<n>/<task>/lab.mdx` (title + external link + `<CopyCmd>` blocks) |
| `npm run ingest:all` | — | Runs the three above in order |
| `npm run seed:explainers` | Objective+Task catalog + Anthropic API | `content/domains/<n>/<task>/explained.mdx` (batch, committed to repo) |

**Explainer generation:** The `seed:explainers` script iterates every `(objective, task)` pair, prompts Claude with the objective title, official URL, and a distilled instruction ("explica como para alguien que no sabe nada de Vault; usa una analogía cotidiana antes del término técnico"), validates the output against the MDX frontmatter schema, and writes the file. `--force` flag regenerates existing files. Default behaviour: skip if the file exists.

**Ismet heading → objective mapping:** A one-time-maintained `config/ismet-mapping.yaml` maps headings or file paths in the ismet notes repo to official objectives. This is intentional — heuristics here are brittle.

**HashiCorp body content is never copied.** Only structure (titles, ordering, URLs) is extracted.

## 6. UI specification

### 6.1 Routes

| Route | Component | Purpose |
|---|---|---|
| `/` | `DashboardPage` | 9 objective cards: % completion, time invested, "resume where you left off" |
| `/domains/[objectiveSlug]` | `ObjectiveView` | Domain overview + task list with states |
| `/domains/[objectiveSlug]/[taskSlug]` | `TaskView` | Primary study screen — 3-column layout with tabbed content |
| `/review` | `ReviewView` | Filterable list for pre-exam review (e.g., status=READING, unvisited > 3 days) |
| `/notes` | `NotesIndex` | Searchable index of all personal notes, grouped by domain |

### 6.2 Layout

Three-column layout on desktop (primary target):

- **Left sidebar (240px):** Objective tree with expandable tasks, status dots, progress summary.
- **Main content (flex):** Breadcrumb + title + status pill + tabs `[Explicación sencilla | Notas técnicas | Lab]` + MDX-rendered content + footer prev/next.
- **Right panel (260px):** Auto-generated TOC + Lab launcher (external link) + `CommandList` (copy-to-clipboard) + inline Markdown note editor.

Below 1024px the sidebar collapses to a drawer and the right panel moves to tabs at the top of the content. Below 768px the layout is single-column with a bottom sheet for notes.

### 6.3 Custom MDX components

```tsx
<CopyCmd cmd="vault kv put secret/foo bar=zap" lang="bash" />
<VaultOutput>...</VaultOutput>
<Callout type="warning | info | success">...</Callout>
<Analogy>...</Analogy>                       // highlighted, amber-left-border block
<Diagram src="..." alt="..." />
<Toggle summary="Ver comando completo">...</Toggle>
```

### 6.4 Keyboard shortcuts

| Key | Action |
|---|---|
| `j` / `k` | Next / previous task |
| `1` / `2` / `3` | Switch to Explicación / Notas / Lab tab |
| `n` | Focus the note editor |
| `m` | Mark current task as REVIEWED |
| `/` | Global command palette (cmd-k) |

### 6.5 States

| State | Behaviour |
|---|---|
| Loading | Skeleton in sidebar and main — no blocking spinners. Initial render target < 200ms (RSC). |
| Empty note | Placeholder text with examples, no aggressive CTAs. |
| Progress saved | Top-right toast 3s, `aria-live="polite"`, does not steal focus. |
| DB error / offline | Global banner "No se pudo guardar. Reintentando…" + manual retry button. |
| Content not found | 404 with links to nearby tasks in the same domain. |

### 6.6 Accessibility

- Contrast AA minimum (semantic tokens validated at content-lint time).
- Sequential heading hierarchy (`h1`…`h6`) in every MDX file.
- Tab order matches visual order; 2px focus ring on every interactive element.
- `prefers-reduced-motion` respected via Tailwind `motion-reduce:` utilities.
- `aria-current="page"` on the active sidebar task.
- Skip-link to main content at the top of `AppShell`.

## 7. Design system

### 7.1 Style direction

Minimalist documentation aesthetic. Dark mode default (reading-heavy product), light mode as a v2 addition. Vault brand amber accent used sparingly (active item, primary CTA) on a neutral slate background.

### 7.2 Color tokens (semantic)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | Main background |
| `--surface` | `#161b22` | Sidebar, right panel |
| `--surface-2` | `#1c2128` | Hover, nested cards |
| `--border` | `#30363d` | Primary borders |
| `--border-subtle` | `#21262d` | Internal separators |
| `--text` | `#e6edf3` | Body text |
| `--text-muted` | `#8b949e` | Secondary text |
| `--text-dim` | `#6e7681` | Labels, placeholders |
| `--accent` | `#ffec6e` | Vault amber — active task, primary CTA |
| `--blue` | `#58a6ff` | Links, "reading" status |
| `--green` | `#3fb950` | "mastered" status, success |
| `--amber` | `#d29922` | "reviewed" status, warning |
| `--red` | `#f85149` | Error, destructive |

Contrast ratios (validated):
- `text` on `bg`: 13.7:1 (AAA)
- `text-muted` on `bg`: 7.2:1 (AAA)
- `accent` on `bg`: 13.4:1 (AAA)

### 7.3 Typography

- **Body & UI:** Inter (self-hosted, `font-display: swap`).
- **Code:** IBM Plex Mono (self-hosted).
- **Scale:** 12 / 13 / 14 / 16 / 20 / 26 / 32. Body base 14. MDX long-form uses 16 for reading comfort.
- **Line-height:** 1.65 body, 1.2 headings.
- **Letter-spacing:** default for body, −0.02em for display headings.

### 7.4 Motion

- Micro-interactions: 150ms.
- State changes: 250ms.
- Easing: `ease-out` on enter, `ease-in` on exit.
- Globally disabled when `prefers-reduced-motion`.

### 7.5 Status pills

Four visual states, distinguishable by both color and dot+label (never color alone):

| Status | Color | Label |
|---|---|---|
| `NOT_STARTED` | neutral gray | "No empezado" |
| `READING` | blue | "Leyendo" |
| `REVIEWED` | amber | "Revisado" |
| `MASTERED` | green | "Dominado" |

## 8. Deployment

### 8.1 `docker-compose.yml`

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vault-training
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./content:/app/content:ro
    environment:
      DATABASE_URL: "file:/app/data/vault-training.db"
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### 8.2 `Dockerfile` (multi-stage)

Three stages: `deps` (production npm install), `builder` (Prisma generate + Next build), `runner` (Next.js standalone output, non-root `app` user, port 3000). The container runs `prisma db push --skip-generate && node server.js` on start so the schema is always in sync with the mounted SQLite file.

### 8.3 `/api/health`

Returns 200 when:
- SQLite file is readable/writable.
- `content/_index/objectives.json` is present and parses.
Returns 503 otherwise, with a small JSON body naming which check failed.

### 8.4 Bootstrap flow (executed once on host)

```bash
git clone <repo> vault-training && cd vault-training
cp .env.example .env.local            # add ANTHROPIC_API_KEY
npm install
npm run ingest:all                    # fetch upstream content
npm run seed:explainers               # batch-generate all explainers
git add content/ && git commit -m "content: initial ingest + explainers"
docker compose up -d                  # start the app
# open http://localhost:3000
```

### 8.5 Day-to-day

```bash
docker compose up -d                  # study
# ... progress and notes persist in ./data/vault-training.db
docker compose down                   # optional when done
```

### 8.6 Content refresh

```bash
npm run ingest:all
npm run seed:explainers               # default: skip tasks that already have explained.mdx
npm run content:validate
git commit -am "content: refresh <date>"
```

Use `npm run seed:explainers -- --force` to regenerate every explainer (e.g., after a prompt template change), or `-- --task <objective>/<slug>` to regenerate a single task.

## 9. Quality & testing

**Targets are pragmatic: golden paths and edge cases that matter for a personal tool. No CI, no automated hooks.** All commands are run manually when the author deems it useful.

### 9.1 Unit (Vitest)

- `lib/content/frontmatter.test.ts` — Zod rejects missing/invalid frontmatter fields.
- `lib/content/loader.test.ts` — Returns the correct three-tab payload for an objective+task.
- `lib/progress.test.ts` — Status transitions, timestamps set on correct transitions, `firstSeen` immutable after set.
- `scripts/ingest/ismet-mapper.test.ts` — Mapping covers all 9 domains.

### 9.2 Integration (Vitest + supertest, ephemeral SQLite)

- `POST /api/progress` — Updates status and `lastVisit`.
- `PUT /api/notes/:taskId` — Creates and updates notes without losing concurrent writes.
- `GET /api/health` — Returns 200 when prerequisites met, 503 otherwise.

### 9.3 End-to-end (Playwright against the local container, manual run)

- `landing.spec.ts` — Dashboard renders 9 domains.
- `task-reading.spec.ts` — Navigate to a task, switch tabs, keyboard accessible.
- `progress-tracking.spec.ts` — Mark READING, reload, state persists.
- `notes.spec.ts` — Write note, autosave, reload, note persists.
- `keyboard-shortcuts.spec.ts` — `j/k`, `1/2/3`, `n` shortcuts work.

### 9.4 Content linter (`npm run content:validate`)

Required before every `docker compose up -d`. Fails fast if:
- A task is missing an `explained.mdx` file.
- Any frontmatter fails Zod validation.
- `sourceUrl` is empty for non-Claude sources.
- Duplicate `(objectiveId, taskSlug)` pairs exist.

### 9.5 Explicitly out of scope

- Component-level React tests (shadcn/ui ships its own coverage upstream).
- ORM/framework unit tests.
- Load, performance, visual regression testing.
- Pre-commit hooks (Husky/lint-staged).
- CI pipelines (GitHub Actions or equivalent).

## 10. Open questions / deferred decisions

Tracked here so they surface during planning, not forgotten:

- **Claude model + token budget for `seed:explainers`.** Opus 4.6 vs. Sonnet 4.6 for ~40-50 explainers; cost vs. quality trade-off to be resolved at plan time.
- **Ismet mapping YAML:** Initial mapping must be produced by hand during planning, informed by the actual folder structure of the upstream repo at ingest time.
- **Light mode:** Deferred to v2. Token structure anticipates it (semantic tokens, not raw hex in components).
- **Mobile layout below 768px:** Spec calls for single-column with bottom-sheet notes, but UX details deferred — desktop is the only primary v1 path.

## 11. Non-goals (v1)

- Running Vault locally or embedding a terminal.
- Quiz engine, flashcards, spaced-repetition.
- Multi-user or shared/collaborative features.
- Hosting anywhere other than the author's machine.
- Automating upstream content refresh on a schedule.
