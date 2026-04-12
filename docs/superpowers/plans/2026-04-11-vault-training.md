# Vault Training Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first Next.js study interface for the HashiCorp Vault Associate (003) certification that consolidates four content sources into an ordered study path with persistent progress, personal notes, and Docker-based deployment.

**Architecture:** Single Next.js 14 App Router service backed by Prisma/SQLite (bind-mounted volume) with MDX content (bind-mounted, read-only). Three-column documentation UI built with Tailwind + shadcn/ui. Ingestion scripts are Node CLIs run on the host, not in the container.

**Tech Stack:** TypeScript strict · Next.js 14 (App Router, RSC, standalone output) · Prisma 5 · SQLite · Tailwind CSS + shadcn/ui + Radix · Lucide icons · MDX with next-mdx-remote · Zod · Vitest · Playwright · Anthropic SDK (for explainer generation) · Docker 24+ with Compose.

**Spec:** `docs/superpowers/specs/2026-04-11-vault-training-design.md`

**Execution order:** Tasks are intentionally ordered so that every phase leaves the app in a runnable state. Each task ends with a commit. Read tasks end-to-end before starting — some code is referenced between phases.

---

## File structure (target)

```
vault-training/
├── .dockerignore
├── .env.example
├── .gitignore
├── .prettierrc.json
├── Dockerfile
├── README.md
├── docker-compose.yml
├── eslint.config.mjs
├── next.config.mjs
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
│
├── app/
│   ├── api/
│   │   ├── health/route.ts
│   │   ├── notes/[taskId]/route.ts
│   │   └── progress/[taskId]/route.ts
│   ├── domains/[objectiveSlug]/
│   │   ├── page.tsx
│   │   └── [taskSlug]/page.tsx
│   ├── notes/page.tsx
│   ├── review/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   └── providers.tsx
│
├── components/
│   ├── app-shell.tsx
│   ├── command-list.tsx
│   ├── footer-nav.tsx
│   ├── lab-launcher.tsx
│   ├── mdx/
│   │   ├── analogy.tsx
│   │   ├── callout.tsx
│   │   ├── copy-cmd.tsx
│   │   ├── index.ts
│   │   ├── toggle.tsx
│   │   └── vault-output.tsx
│   ├── note-editor.tsx
│   ├── objective-card.tsx
│   ├── right-panel.tsx
│   ├── sidebar-nav.tsx
│   ├── status-pill.tsx
│   ├── tab-switcher.tsx
│   ├── toc.tsx
│   ├── topbar.tsx
│   └── ui/         # shadcn-generated
│
├── config/
│   └── ismet-mapping.yaml
│
├── content/
│   ├── _index/
│   │   └── objectives.json
│   └── domains/    # populated by ingest scripts
│
├── data/           # sqlite volume (gitignored)
│
├── lib/
│   ├── content/
│   │   ├── frontmatter.ts
│   │   ├── loader.ts
│   │   └── mdx.ts
│   ├── hooks/
│   │   ├── use-autosave.ts
│   │   └── use-keyboard-shortcuts.ts
│   ├── notes.ts
│   ├── progress.ts
│   ├── prisma.ts
│   ├── seed.ts
│   └── utils.ts
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│   ├── ingest/
│   │   ├── _lib.ts
│   │   ├── hashicorp-index.ts
│   │   ├── ismet-notes.ts
│   │   └── labs.ts
│   ├── seed-explainers.ts
│   └── validate-content.ts
│
└── tests/
    ├── e2e/
    │   ├── keyboard-shortcuts.spec.ts
    │   ├── landing.spec.ts
    │   ├── notes.spec.ts
    │   ├── progress-tracking.spec.ts
    │   └── task-reading.spec.ts
    ├── fixtures/
    │   └── sample-content/
    ├── integration/
    │   └── api.test.ts
    └── unit/
        ├── frontmatter.test.ts
        ├── ismet-mapper.test.ts
        ├── loader.test.ts
        └── progress.test.ts
```

---

## PHASE 0 — Scaffolding

### Task 1: Initialize Next.js project

**Files:**

- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore` (append)

- [ ] **Step 1: Run the Next.js scaffolder (non-interactive)**

Run from the project root:

```bash
npx create-next-app@14 . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --no-turbopack
```

When prompted about non-empty dir, confirm. Expected: new files created, git not reinitialized (already a repo).

- [ ] **Step 2: Verify it runs**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: default Next.js landing page renders. Stop with `Ctrl+C`.

- [ ] **Step 3: Append to `.gitignore`**

Open `.gitignore` and ensure these entries exist (create if missing):

```
# environment
.env.local
.env*.local

# data
/data
/data/*.db
/data/*.db-journal

# test artifacts
/test-results
/playwright-report
/playwright/.cache

# next
/.next
/out

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with App Router and Tailwind"
```

---

### Task 2: Configure TypeScript strict and path aliases

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Replace `tsconfig.json` contents**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable strict TypeScript with noUncheckedIndexedAccess"
```

---

### Task 3: Install core runtime dependencies

**Files:**

- Modify: `package.json` (via `npm install`)

- [ ] **Step 1: Install runtime deps**

```bash
npm install @prisma/client zod next-mdx-remote gray-matter rehype-slug rehype-autolink-headings rehype-pretty-code remark-gfm shiki class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-toast @radix-ui/react-slot
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D prisma tsx vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/node @playwright/test supertest @types/supertest dotenv yaml @anthropic-ai/sdk
```

- [ ] **Step 3: Verify install completes cleanly**

```bash
npm ls --depth=0 2>&1 | grep -E "(UNMET|missing|invalid)" || echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add runtime and dev dependencies"
```

---

### Task 4: Configure Tailwind with semantic design tokens

**Files:**

- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx,mdx}", "./components/**/*.{ts,tsx}", "./content/**/*.mdx"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-2": "hsl(var(--surface-2) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        "border-subtle": "hsl(var(--border-subtle) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        "text-dim": "hsl(var(--text-dim) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        blue: "hsl(var(--blue) / <alpha-value>)",
        green: "hsl(var(--green) / <alpha-value>)",
        amber: "hsl(var(--amber) / <alpha-value>)",
        red: "hsl(var(--red) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.2rem" }],
        base: ["0.875rem", { lineHeight: "1.65" }],
        md: ["1rem", { lineHeight: "1.65" }],
        lg: ["1.25rem", { lineHeight: "1.4" }],
        xl: ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "2xl": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
      transitionDuration: {
        micro: "150ms",
        state: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: 215 25% 7%;
  --surface: 215 22% 11%;
  --surface-2: 215 21% 14%;
  --border: 215 14% 21%;
  --border-subtle: 215 17% 16%;
  --text: 215 28% 92%;
  --text-muted: 215 11% 62%;
  --text-dim: 215 9% 48%;
  --accent: 52 100% 71%;
  --accent-fg: 215 25% 7%;
  --blue: 212 100% 67%;
  --green: 131 48% 48%;
  --amber: 40 73% 49%;
  --red: 4 92% 63%;
}

@layer base {
  html {
    font-family: "Inter", system-ui, sans-serif;
    color-scheme: dark;
  }
  body {
    background-color: hsl(var(--bg));
    color: hsl(var(--text));
    font-size: 0.875rem;
    line-height: 1.65;
  }
  code,
  pre,
  kbd {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
  }
  :focus-visible {
    outline: 2px solid hsl(var(--accent));
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

- [ ] **Step 3: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault Training",
  description: "HashiCorp Vault Associate (003) study interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Replace `app/page.tsx`** (temporary landing — will be replaced later)

```tsx
export default function Home() {
  return (
    <main id="main" className="grid min-h-screen place-items-center p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Vault Training</h1>
        <p className="text-text-muted">Scaffolding en progreso…</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run dev and verify dark background**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: dark page, "Vault Training" heading visible, "Scaffolding en progreso…" in muted gray. Stop.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: apply dark theme tokens and base typography"
```

---

### Task 5: Self-host Inter and IBM Plex Mono

**Files:**

- Create: `app/fonts.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `app/fonts.ts`**

```ts
import { Inter, IBM_Plex_Mono } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});
```

- [ ] **Step 2: Apply fonts in `app/layout.tsx`**

Replace contents with:

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { inter, plexMono } from "./fonts";

export const metadata: Metadata = {
  title: "Vault Training",
  description: "HashiCorp Vault Associate (003) study interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update `tailwind.config.ts` fontFamily to reference CSS variables**

Change the `fontFamily` block to:

```ts
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
},
```

- [ ] **Step 4: Run dev and verify fonts load**

```bash
npm run dev
```

Inspect the page; the heading should render in Inter. Stop.

- [ ] **Step 5: Commit**

```bash
git add app/fonts.ts app/layout.tsx tailwind.config.ts
git commit -m "feat: self-host Inter and IBM Plex Mono via next/font"
```

---

### Task 6: Initialize shadcn/ui

**Files:**

- Create: `components.json`, `lib/utils.ts`, `components/ui/*`

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init -d --base-color neutral --css-variables false
```

Accept defaults; keep `components` alias as `@/components`, `utils` alias as `@/lib/utils`.

- [ ] **Step 2: Add initial components**

```bash
npx shadcn@latest add button tabs dialog tooltip sonner separator input textarea
```

Accept overwrites if prompted.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui primitives (button, tabs, dialog, etc.)"
```

---

### Task 7: Configure Prettier + ESLint

**Files:**

- Create: `.prettierrc.json`, `.prettierignore`
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 2: Install prettier + tailwind plugin**

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 3: Create `.prettierignore`**

```
.next
node_modules
content
data
playwright-report
test-results
```

- [ ] **Step 4: Add format scripts to `package.json`**

Under `scripts`, add:

```json
"format": "prettier --write .",
"format:check": "prettier --check .",
"lint": "next lint && tsc --noEmit"
```

- [ ] **Step 5: Run format once**

```bash
npm run format
```

Expected: files formatted.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Prettier with Tailwind plugin and add format scripts"
```

---

## PHASE 1 — Data layer

### Task 8: Write Prisma schema

**Files:**

- Create: `prisma/schema.prisma`
- Create: `.env.example`, `.env.local`

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Status {
  NOT_STARTED
  READING
  REVIEWED
  MASTERED
}

model Objective {
  id         String @id
  slug       String @unique
  title      String
  orderIndex Int
  tasks      Task[]
}

model Task {
  id          String    @id
  slug        String
  title       String
  objectiveId String
  orderIndex  Int
  hidden      Boolean   @default(false)
  objective   Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)
  progress    TaskProgress?
  note        TaskNote?

  @@unique([objectiveId, slug])
}

model TaskProgress {
  taskId     String    @id
  task       Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  status     Status    @default(NOT_STARTED)
  lastVisit  DateTime?
  firstSeen  DateTime?
  reviewedAt DateTime?
  masteredAt DateTime?
  updatedAt  DateTime  @updatedAt
}

model TaskNote {
  taskId    String   @id
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  body      String
  updatedAt DateTime @updatedAt
}

model StudySession {
  id        String    @id @default(cuid())
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  taskId    String?
}
```

Note: SQLite in Prisma does not natively support enums; the `Status` enum above will be emitted as strings at runtime. This is the documented behaviour and is fine.

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL="file:./data/vault-training.db"
ANTHROPIC_API_KEY=""
```

- [ ] **Step 3: Create `.env.local`** (mirror `.env.example`, populate locally)

```
DATABASE_URL="file:./data/vault-training.db"
ANTHROPIC_API_KEY="sk-ant-..."
```

- [ ] **Step 4: Create empty `data/` directory**

```bash
mkdir -p data && touch data/.gitkeep
```

- [ ] **Step 5: Generate client and push schema**

```bash
npx prisma generate
npx prisma db push
```

Expected: `data/vault-training.db` created, schema applied.

- [ ] **Step 6: Commit (exclude .env.local and DB file — ignored)**

```bash
git add prisma/ .env.example data/.gitkeep
git commit -m "feat: Prisma schema for objectives, tasks, progress, notes, sessions"
```

---

### Task 9: Prisma client singleton

**Files:**

- Create: `lib/prisma.ts`

- [ ] **Step 1: Create `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/prisma.ts
git commit -m "feat: Prisma client singleton"
```

---

## PHASE 2 — Content schema & loader (TDD)

### Task 10: Vitest configuration

**Files:**

- Create: `vitest.config.ts`, `tests/setup.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 2: Create `tests/setup.ts`**

```ts
import "dotenv/config";

process.env.DATABASE_URL ??= "file:./data/test.db";
```

- [ ] **Step 3: Add test scripts to `package.json`**

Under `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/ package.json
git commit -m "chore: configure Vitest with node env and path alias"
```

---

### Task 11: Frontmatter Zod schema — tests first

**Files:**

- Create: `tests/unit/frontmatter.test.ts`

- [ ] **Step 1: Create failing test file**

```ts
import { describe, it, expect } from "vitest";
import { FrontmatterSchema, MDX_KINDS, SOURCES } from "@/lib/content/frontmatter";

const validBase = {
  objectiveId: "3",
  taskSlug: "kv-v2",
  kind: "explained" as const,
  title: "KV v2: versiones",
  source: "claude" as const,
  sourceUrl: "https://example.com/x",
  license: "original",
  order: 1,
};

describe("FrontmatterSchema", () => {
  it("accepts valid frontmatter", () => {
    const result = FrontmatterSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts optional estMinutes", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, estMinutes: 10 });
    expect(result.success).toBe(true);
  });

  it("rejects missing objectiveId", () => {
    const { objectiveId: _omit, ...rest } = validBase;
    const result = FrontmatterSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid kind", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, kind: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, source: "wikipedia" });
    expect(result.success).toBe(false);
  });

  it("rejects non-url sourceUrl", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, sourceUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer order", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, order: 1.5 });
    expect(result.success).toBe(false);
  });

  it("enumerates the MDX kinds", () => {
    expect(MDX_KINDS).toEqual(["explained", "notes", "lab"]);
  });

  it("enumerates the sources", () => {
    expect(SOURCES).toEqual(["claude", "ismet55555", "btkrausen"]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- frontmatter
```

Expected: FAIL with "Cannot find module '@/lib/content/frontmatter'".

- [ ] **Step 3: Implement `lib/content/frontmatter.ts`**

```ts
import { z } from "zod";

export const MDX_KINDS = ["explained", "notes", "lab"] as const;
export const SOURCES = ["claude", "ismet55555", "btkrausen"] as const;

export type MdxKind = (typeof MDX_KINDS)[number];
export type Source = (typeof SOURCES)[number];

export const FrontmatterSchema = z.object({
  objectiveId: z.string().min(1),
  taskSlug: z.string().min(1),
  kind: z.enum(MDX_KINDS),
  title: z.string().min(1),
  source: z.enum(SOURCES),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
  order: z.number().int().nonnegative(),
  estMinutes: z.number().int().positive().optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
```

- [ ] **Step 4: Run the test — confirm pass**

```bash
npm test -- frontmatter
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/frontmatter.ts tests/unit/frontmatter.test.ts
git commit -m "feat: Zod schema and types for MDX frontmatter"
```

---

### Task 12: Fixture content for tests

**Files:**

- Create: `tests/fixtures/sample-content/_index/objectives.json`
- Create: `tests/fixtures/sample-content/domains/3-secrets/kv-v2/explained.mdx`
- Create: `tests/fixtures/sample-content/domains/3-secrets/kv-v2/notes.mdx`
- Create: `tests/fixtures/sample-content/domains/3-secrets/kv-v2/lab.mdx`
- Create: `tests/fixtures/sample-content/domains/3-secrets/_meta.mdx`

- [ ] **Step 1: Create `tests/fixtures/sample-content/_index/objectives.json`**

```json
[
  {
    "id": "3",
    "slug": "secrets",
    "title": "Manage secrets engines",
    "orderIndex": 3,
    "tasks": [{ "slug": "kv-v2", "title": "KV v2 versioning", "orderIndex": 1 }]
  }
]
```

- [ ] **Step 2: Create `tests/fixtures/sample-content/domains/3-secrets/_meta.mdx`**

```mdx
---
objectiveId: "3"
taskSlug: "_meta"
kind: "notes"
title: "Dominio 3: Secrets"
source: "claude"
sourceUrl: "https://developer.hashicorp.com/vault/tutorials"
license: "original"
order: 0
---

Overview del dominio de secretos.
```

- [ ] **Step 3: Create `tests/fixtures/sample-content/domains/3-secrets/kv-v2/explained.mdx`**

```mdx
---
objectiveId: "3"
taskSlug: "kv-v2"
kind: "explained"
title: "KV v2: versiones"
source: "claude"
sourceUrl: "https://developer.hashicorp.com/vault/tutorials"
license: "original"
order: 1
estMinutes: 10
---

Imagina KV v2 como Google Docs para secretos.
```

- [ ] **Step 4: Create `tests/fixtures/sample-content/domains/3-secrets/kv-v2/notes.mdx`**

```mdx
---
objectiveId: "3"
taskSlug: "kv-v2"
kind: "notes"
title: "KV v2 notes"
source: "ismet55555"
sourceUrl: "https://github.com/ismet55555/Hashicorp-Certified-Vault-Associate-Notes"
license: "MIT"
order: 2
---

Notas técnicas KV v2.
```

- [ ] **Step 5: Create `tests/fixtures/sample-content/domains/3-secrets/kv-v2/lab.mdx`**

```mdx
---
objectiveId: "3"
taskSlug: "kv-v2"
kind: "lab"
title: "KV v2 lab"
source: "btkrausen"
sourceUrl: "https://github.com/btkrausen/vault-codespaces"
license: "Apache-2.0"
order: 3
---

Lab steps.
```

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/
git commit -m "test: add sample content fixtures for loader tests"
```

---

### Task 13: Content loader — tests first

**Files:**

- Create: `tests/unit/loader.test.ts`

- [ ] **Step 1: Create failing test**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { loadTask, listObjectives } from "@/lib/content/loader";

const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

beforeAll(() => {
  process.env.CONTENT_ROOT = FIXTURE_ROOT;
});

describe("listObjectives", () => {
  it("reads objectives.json", async () => {
    const objectives = await listObjectives();
    expect(objectives).toHaveLength(1);
    expect(objectives[0]?.id).toBe("3");
    expect(objectives[0]?.tasks).toHaveLength(1);
  });
});

describe("loadTask", () => {
  it("returns the three tabs when all exist", async () => {
    const loaded = await loadTask("3", "kv-v2");
    expect(loaded).not.toBeNull();
    expect(loaded?.explained?.frontmatter.kind).toBe("explained");
    expect(loaded?.notes?.frontmatter.source).toBe("ismet55555");
    expect(loaded?.lab?.frontmatter.source).toBe("btkrausen");
  });

  it("returns null when the task does not exist", async () => {
    const loaded = await loadTask("3", "missing-task");
    expect(loaded).toBeNull();
  });

  it("exposes externalLinks built from sourceUrls", async () => {
    const loaded = await loadTask("3", "kv-v2");
    expect(loaded?.externalLinks.length).toBeGreaterThan(0);
    expect(loaded?.externalLinks[0]).toHaveProperty("url");
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- loader
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/content/loader.ts`**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { FrontmatterSchema, type Frontmatter } from "./frontmatter";

export interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  tasks: { slug: string; title: string; orderIndex: number }[];
}

export interface LoadedMdx {
  frontmatter: Frontmatter;
  body: string;
}

export interface LoadedTask {
  objectiveId: string;
  taskSlug: string;
  explained?: LoadedMdx;
  notes?: LoadedMdx;
  lab?: LoadedMdx;
  externalLinks: { label: string; url: string }[];
}

function contentRoot(): string {
  return process.env.CONTENT_ROOT ?? path.resolve(process.cwd(), "content");
}

async function readMdx(filePath: string): Promise<LoadedMdx | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const frontmatter = FrontmatterSchema.parse(data);
    return { frontmatter, body: content };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export async function listObjectives(): Promise<ObjectiveIndex[]> {
  const file = path.join(contentRoot(), "_index", "objectives.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as ObjectiveIndex[];
}

export async function loadTask(objectiveId: string, taskSlug: string): Promise<LoadedTask | null> {
  const objectives = await listObjectives();
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  const task = objective.tasks.find((t) => t.slug === taskSlug);
  if (!task) return null;

  const dir = path.join(contentRoot(), "domains", `${objective.id}-${objective.slug}`, task.slug);
  const [explained, notes, lab] = await Promise.all([
    readMdx(path.join(dir, "explained.mdx")),
    readMdx(path.join(dir, "notes.mdx")),
    readMdx(path.join(dir, "lab.mdx")),
  ]);

  if (!explained && !notes && !lab) return null;

  const externalLinks: { label: string; url: string }[] = [];
  if (explained?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Tutorial oficial", url: explained.frontmatter.sourceUrl });
  }
  if (notes?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Apuntes ismet55555", url: notes.frontmatter.sourceUrl });
  }
  if (lab?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Lab codespace", url: lab.frontmatter.sourceUrl });
  }

  return { objectiveId, taskSlug, explained, notes, lab, externalLinks };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- loader
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content/loader.ts tests/unit/loader.test.ts
git commit -m "feat: content loader with objective index and task triple-MDX resolution"
```

---

### Task 14: MDX compilation helper

**Files:**

- Create: `lib/content/mdx.ts`

- [ ] **Step 1: Create `lib/content/mdx.ts`**

```ts
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/mdx";
import type { LoadedMdx } from "./loader";

export async function compileTaskMdx(source: LoadedMdx) {
  return compileMDX({
    source: source.body,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
          [rehypePrettyCode, { theme: "github-dark-dimmed" }],
        ],
      },
    },
    components: mdxComponents,
  });
}
```

Note: `mdxComponents` is implemented in Phase 5 (Task 30). For now the file will not typecheck — you will create the components barrel before running the typecheck at the end of Phase 5. Skip the typecheck for this task.

- [ ] **Step 2: Commit**

```bash
git add lib/content/mdx.ts
git commit -m "feat: MDX compile helper (components wired later)"
```

---

## PHASE 3 — Seed and catalog

### Task 15: Seed tests first

**Files:**

- Create: `tests/integration/seed.test.ts`

- [ ] **Step 1: Create failing test**

```ts
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "@/lib/seed";

const DB_PATH = path.resolve(__dirname, "../../data/test-seed.db");
const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  process.env.CONTENT_ROOT = FIXTURE_ROOT;
  const { execSync } = await import("node:child_process");
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });
  prisma = new PrismaClient();
});

afterEach(async () => {
  await prisma.taskNote.deleteMany();
  await prisma.taskProgress.deleteMany();
  await prisma.task.deleteMany();
  await prisma.objective.deleteMany();
});

describe("seedCatalog", () => {
  it("inserts objectives and tasks on first run", async () => {
    await seedCatalog(prisma);
    expect(await prisma.objective.count()).toBe(1);
    expect(await prisma.task.count()).toBe(1);
  });

  it("is idempotent on second run", async () => {
    await seedCatalog(prisma);
    await seedCatalog(prisma);
    expect(await prisma.objective.count()).toBe(1);
    expect(await prisma.task.count()).toBe(1);
  });

  it("preserves user progress across re-seeds", async () => {
    await seedCatalog(prisma);
    await prisma.taskProgress.create({ data: { taskId: "3/kv-v2", status: "READING" } });
    await seedCatalog(prisma);
    const progress = await prisma.taskProgress.findUnique({ where: { taskId: "3/kv-v2" } });
    expect(progress?.status).toBe("READING");
  });

  it("hides tasks whose content disappeared from disk", async () => {
    await seedCatalog(prisma);
    await prisma.task.create({
      data: {
        id: "3/ghost",
        slug: "ghost",
        title: "Ghost",
        objectiveId: "3",
        orderIndex: 99,
      },
    });
    await seedCatalog(prisma);
    const ghost = await prisma.task.findUnique({ where: { id: "3/ghost" } });
    expect(ghost?.hidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- seed
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/seed.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { listObjectives } from "./content/loader";

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const objectives = await listObjectives();
  const knownTaskIds = new Set<string>();

  for (const obj of objectives) {
    await prisma.objective.upsert({
      where: { id: obj.id },
      create: { id: obj.id, slug: obj.slug, title: obj.title, orderIndex: obj.orderIndex },
      update: { slug: obj.slug, title: obj.title, orderIndex: obj.orderIndex },
    });

    for (const task of obj.tasks) {
      const taskId = `${obj.id}/${task.slug}`;
      knownTaskIds.add(taskId);
      await prisma.task.upsert({
        where: { id: taskId },
        create: {
          id: taskId,
          slug: task.slug,
          title: task.title,
          objectiveId: obj.id,
          orderIndex: task.orderIndex,
          hidden: false,
        },
        update: {
          slug: task.slug,
          title: task.title,
          objectiveId: obj.id,
          orderIndex: task.orderIndex,
          hidden: false,
        },
      });
    }
  }

  const existing = await prisma.task.findMany({ select: { id: true } });
  const stale = existing.filter((t) => !knownTaskIds.has(t.id)).map((t) => t.id);
  if (stale.length > 0) {
    await prisma.task.updateMany({ where: { id: { in: stale } }, data: { hidden: true } });
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- seed
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seed.ts tests/integration/seed.test.ts
git commit -m "feat: catalog seed with idempotent upsert and hidden-task handling"
```

---

## PHASE 4 — Progress & notes (TDD)

### Task 16: Progress library

**Files:**

- Create: `tests/unit/progress.test.ts`
- Create: `lib/progress.ts`

- [ ] **Step 1: Create failing test**

```ts
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { getProgress, setStatus, touchVisit } from "@/lib/progress";

const DB_PATH = path.resolve(__dirname, "../../data/test-progress.db");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  const { execSync } = await import("node:child_process");
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });
  prisma = new PrismaClient();
  await prisma.objective.create({ data: { id: "9", slug: "misc", title: "Misc", orderIndex: 9 } });
  await prisma.task.create({
    data: { id: "9/t1", slug: "t1", title: "T1", objectiveId: "9", orderIndex: 1 },
  });
});

afterEach(async () => {
  await prisma.taskProgress.deleteMany();
});

describe("progress", () => {
  it("returns null when no progress exists", async () => {
    expect(await getProgress(prisma, "9/t1")).toBeNull();
  });

  it("creates progress with firstSeen on first setStatus", async () => {
    const p = await setStatus(prisma, "9/t1", "READING");
    expect(p.status).toBe("READING");
    expect(p.firstSeen).not.toBeNull();
  });

  it("sets reviewedAt when transitioning to REVIEWED", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const p = await setStatus(prisma, "9/t1", "REVIEWED");
    expect(p.reviewedAt).not.toBeNull();
  });

  it("sets masteredAt when transitioning to MASTERED", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const p = await setStatus(prisma, "9/t1", "MASTERED");
    expect(p.masteredAt).not.toBeNull();
  });

  it("does not overwrite firstSeen on subsequent updates", async () => {
    const first = await setStatus(prisma, "9/t1", "READING");
    await new Promise((r) => setTimeout(r, 5));
    const second = await setStatus(prisma, "9/t1", "REVIEWED");
    expect(second.firstSeen?.getTime()).toBe(first.firstSeen?.getTime());
  });

  it("touchVisit updates lastVisit without changing status", async () => {
    await setStatus(prisma, "9/t1", "READING");
    const t = await touchVisit(prisma, "9/t1");
    expect(t.lastVisit).not.toBeNull();
    expect(t.status).toBe("READING");
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- progress
```

- [ ] **Step 3: Implement `lib/progress.ts`**

```ts
import type { PrismaClient, TaskProgress, Status } from "@prisma/client";

export async function getProgress(
  prisma: PrismaClient,
  taskId: string,
): Promise<TaskProgress | null> {
  return prisma.taskProgress.findUnique({ where: { taskId } });
}

export async function setStatus(
  prisma: PrismaClient,
  taskId: string,
  status: Status,
): Promise<TaskProgress> {
  const now = new Date();
  const existing = await prisma.taskProgress.findUnique({ where: { taskId } });

  const reviewedAt =
    status === "REVIEWED"
      ? now
      : status === "MASTERED"
        ? (existing?.reviewedAt ?? now)
        : (existing?.reviewedAt ?? null);
  const masteredAt = status === "MASTERED" ? now : (existing?.masteredAt ?? null);
  const firstSeen = existing?.firstSeen ?? now;

  return prisma.taskProgress.upsert({
    where: { taskId },
    create: { taskId, status, firstSeen, lastVisit: now, reviewedAt, masteredAt },
    update: { status, lastVisit: now, reviewedAt, masteredAt },
  });
}

export async function touchVisit(prisma: PrismaClient, taskId: string): Promise<TaskProgress> {
  const now = new Date();
  const existing = await prisma.taskProgress.findUnique({ where: { taskId } });
  return prisma.taskProgress.upsert({
    where: { taskId },
    create: { taskId, status: "READING", firstSeen: now, lastVisit: now },
    update: { lastVisit: now, firstSeen: existing?.firstSeen ?? now },
  });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- progress
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progress.ts tests/unit/progress.test.ts
git commit -m "feat: progress library with state transitions and firstSeen preservation"
```

---

### Task 17: Notes library

**Files:**

- Create: `tests/unit/notes.test.ts`
- Create: `lib/notes.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { getNote, saveNote } from "@/lib/notes";

const DB_PATH = path.resolve(__dirname, "../../data/test-notes.db");

let prisma: PrismaClient;

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  const { execSync } = await import("node:child_process");
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });
  prisma = new PrismaClient();
  await prisma.objective.create({ data: { id: "9", slug: "misc", title: "M", orderIndex: 9 } });
  await prisma.task.create({
    data: { id: "9/t", slug: "t", title: "T", objectiveId: "9", orderIndex: 1 },
  });
});

afterEach(async () => {
  await prisma.taskNote.deleteMany();
});

describe("notes", () => {
  it("returns null when no note exists", async () => {
    expect(await getNote(prisma, "9/t")).toBeNull();
  });

  it("creates a note", async () => {
    const n = await saveNote(prisma, "9/t", "hola");
    expect(n.body).toBe("hola");
  });

  it("updates an existing note", async () => {
    await saveNote(prisma, "9/t", "v1");
    const n = await saveNote(prisma, "9/t", "v2");
    expect(n.body).toBe("v2");
  });

  it("trims input to avoid whitespace-only notes", async () => {
    const n = await saveNote(prisma, "9/t", "   ");
    expect(n.body).toBe("");
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- notes
```

- [ ] **Step 3: Implement `lib/notes.ts`**

```ts
import type { PrismaClient, TaskNote } from "@prisma/client";

export async function getNote(prisma: PrismaClient, taskId: string): Promise<TaskNote | null> {
  return prisma.taskNote.findUnique({ where: { taskId } });
}

export async function saveNote(
  prisma: PrismaClient,
  taskId: string,
  body: string,
): Promise<TaskNote> {
  const normalized = body.trim() === "" ? "" : body;
  return prisma.taskNote.upsert({
    where: { taskId },
    create: { taskId, body: normalized },
    update: { body: normalized },
  });
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- notes
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/notes.ts tests/unit/notes.test.ts
git commit -m "feat: notes library with upsert and whitespace normalization"
```

---

## PHASE 5 — API routes

### Task 18: Health endpoint

**Files:**

- Create: `app/api/health/route.ts`

- [ ] **Step 1: Create `app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, boolean> = {};
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {
    checks.db = false;
  }
  try {
    const file = path.join(process.env.CONTENT_ROOT ?? "content", "_index", "objectives.json");
    const raw = await fs.readFile(file, "utf8");
    JSON.parse(raw);
    checks.content = true;
  } catch {
    checks.content = false;
  }
  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ status: ok ? "ok" : "degraded", checks }, { status: ok ? 200 : 503 });
}
```

- [ ] **Step 2: Smoke-test manually**

```bash
npm run dev
# In another terminal:
curl -sS http://localhost:3000/api/health | head -c 200
```

Expected: `{"status":"ok","checks":{"db":true,"content":false}}` (content false until ingestion has run; db true). Stop dev.

- [ ] **Step 3: Commit**

```bash
git add app/api/health/route.ts
git commit -m "feat: /api/health with DB and content checks"
```

---

### Task 19: Progress API route

**Files:**

- Create: `app/api/progress/[taskId]/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getProgress, setStatus, touchVisit } from "@/lib/progress";

const StatusSchema = z.enum(["NOT_STARTED", "READING", "REVIEWED", "MASTERED"]);
const BodySchema = z.object({ status: StatusSchema.optional(), visit: z.boolean().optional() });

interface Params {
  params: { taskId: string };
}

function decodeTaskId(raw: string): string {
  return decodeURIComponent(raw);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const taskId = decodeTaskId(params.taskId);
  const progress = await getProgress(prisma, taskId);
  return NextResponse.json(progress ?? { status: "NOT_STARTED" });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const taskId = decodeTaskId(params.taskId);
  const body = BodySchema.parse(await req.json());
  let progress = null;
  if (body.status) progress = await setStatus(prisma, taskId, body.status);
  if (body.visit) progress = await touchVisit(prisma, taskId);
  return NextResponse.json(progress);
}
```

- [ ] **Step 2: Smoke-test manually (needs a task in DB — use seed next task)**

Skip until Task 21 runs the seed.

- [ ] **Step 3: Commit**

```bash
git add app/api/progress/
git commit -m "feat: /api/progress with GET and PATCH (status | visit)"
```

---

### Task 20: Notes API route

**Files:**

- Create: `app/api/notes/[taskId]/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getNote, saveNote } from "@/lib/notes";

const BodySchema = z.object({ body: z.string() });

interface Params {
  params: { taskId: string };
}

function decodeTaskId(raw: string): string {
  return decodeURIComponent(raw);
}

export async function GET(_req: NextRequest, { params }: Params) {
  const taskId = decodeTaskId(params.taskId);
  const note = await getNote(prisma, taskId);
  return NextResponse.json(note ?? { body: "", updatedAt: null });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const taskId = decodeTaskId(params.taskId);
  const parsed = BodySchema.parse(await req.json());
  const note = await saveNote(prisma, taskId, parsed.body);
  return NextResponse.json(note);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/notes/
git commit -m "feat: /api/notes with GET and PUT"
```

---

### Task 21: Dev seed entrypoint

**Files:**

- Create: `app/seed-dev.tsx` — NO. Instead, ensure seed runs at dev startup.
- Create: `lib/ensure-seed.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `lib/ensure-seed.ts`**

```ts
import "server-only";
import { prisma } from "./prisma";
import { seedCatalog } from "./seed";

let seeded = false;

export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  try {
    await seedCatalog(prisma);
  } catch (err) {
    console.error("[seed] failed:", err);
  }
  seeded = true;
}
```

- [ ] **Step 2: Invoke from `app/layout.tsx`**

Add at the top of the file, after imports:

```tsx
import { ensureSeed } from "@/lib/ensure-seed";
```

And call it inside the default export, before returning JSX:

```tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureSeed();
  return (
    <html lang="es" className={`dark ${inter.variable} ${plexMono.variable}`}>
      {/* ... */}
```

Note: the function signature changes to `async`.

- [ ] **Step 3: Copy sample fixtures to `./content` for initial dev**

```bash
mkdir -p content
cp -R tests/fixtures/sample-content/* content/
```

- [ ] **Step 4: Run dev and verify `/api/health` returns ok for both checks**

```bash
npm run dev
# In another terminal:
curl -sS http://localhost:3000/api/health
```

Expected: `{"status":"ok","checks":{"db":true,"content":true}}`.

- [ ] **Step 5: Commit** (do NOT commit `content/` — it's dev-only. Actually we WILL commit it as the initial seed; it is overwritten by ingestion later.)

Decision: keep the fixture copy under `tests/fixtures/` (already committed). Remove `content/` from git tracking for now since the real content will be generated by ingestion scripts.

```bash
echo "/content" >> .gitignore
git add .gitignore lib/ensure-seed.ts app/layout.tsx
git commit -m "feat: seed catalog on layout render and gitignore generated content"
```

Note: you can keep `content/` locally; it simply will not be tracked. When ingestion fills it, you can decide per-domain whether to commit.

Correction: the spec (§8.4) calls for committing `content/` after `npm run seed:explainers`. Reverse the gitignore change once ingestion produces real content — for now, keep it ignored so fixtures don't leak into the repo.

---

### Task 22: API smoke test (integration)

**Files:**

- Create: `tests/integration/api.test.ts`

- [ ] **Step 1: Test file**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = "http://localhost:3100";
const DB_PATH = path.resolve(__dirname, "../../data/test-api.db");
const CONTENT_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

let server: ChildProcess;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ping(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    return r.ok || r.status === 503;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  const { execSync } = await import("node:child_process");
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  process.env.CONTENT_ROOT = CONTENT_ROOT;
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });

  server = spawn("npx", ["next", "dev", "-p", "3100"], {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: `file:${DB_PATH}`, CONTENT_ROOT },
  });
  for (let i = 0; i < 60; i++) {
    if (await ping()) return;
    await wait(500);
  }
  throw new Error("server did not start in 30s");
}, 60_000);

afterAll(() => {
  server?.kill("SIGTERM");
});

describe("HTTP API", () => {
  it("GET /api/health returns ok", async () => {
    const r = await fetch(`${BASE}/api/health`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.checks.db).toBe(true);
  });

  it("PATCH /api/progress/:taskId updates status", async () => {
    const taskId = encodeURIComponent("3/kv-v2");
    const r = await fetch(`${BASE}/api/progress/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "READING" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("READING");
  });

  it("PUT /api/notes/:taskId persists notes", async () => {
    const taskId = encodeURIComponent("3/kv-v2");
    const put = await fetch(`${BASE}/api/notes/${taskId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "mi nota" }),
    });
    expect(put.status).toBe(200);
    const get = await fetch(`${BASE}/api/notes/${taskId}`);
    const body = await get.json();
    expect(body.body).toBe("mi nota");
  });
});
```

- [ ] **Step 2: Run**

```bash
npm test -- api
```

Expected: 3 tests PASS. This test spawns a real Next dev server against the fixture DB.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/api.test.ts
git commit -m "test: integration tests for health, progress, notes APIs"
```

---

## PHASE 6 — UI shell and core components

### Task 23: StatusPill component

**Files:**

- Create: `components/status-pill.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { cn } from "@/lib/utils";
import type { Status } from "@prisma/client";

const styles: Record<Status, string> = {
  NOT_STARTED: "bg-surface-2 text-text-muted border-border",
  READING: "bg-blue/10 text-blue border-blue/35",
  REVIEWED: "bg-amber/15 text-amber border-amber/40",
  MASTERED: "bg-green/15 text-green border-green/40",
};

const labels: Record<Status, string> = {
  NOT_STARTED: "No empezado",
  READING: "Leyendo",
  REVIEWED: "Revisado",
  MASTERED: "Dominado",
};

export function StatusPill({
  status,
  className,
  onClick,
}: {
  status: Status;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[status],
        onClick && "cursor-pointer transition-all duration-micro hover:brightness-125",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </Tag>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/status-pill.tsx
git commit -m "feat: StatusPill component with four states"
```

---

### Task 24: Topbar component

**Files:**

- Create: `components/topbar.tsx`

- [ ] **Step 1: Create**

```tsx
import Link from "next/link";
import { Lock } from "lucide-react";

export function Topbar({ globalProgress }: { globalProgress?: number }) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border-subtle bg-surface px-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-text transition-colors hover:text-accent"
      >
        <Lock className="size-4 text-accent" />
        <span className="font-semibold tracking-tight">Vault Training</span>
      </Link>
      {typeof globalProgress === "number" && (
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{Math.round(globalProgress)}% completado</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-all duration-state"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/topbar.tsx
git commit -m "feat: Topbar with logo and global progress indicator"
```

---

### Task 25: SidebarNav component

**Files:**

- Create: `components/sidebar-nav.tsx`

- [ ] **Step 1: Create**

```tsx
import Link from "next/link";
import { Check, Circle, Dot } from "lucide-react";
import type { Status } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface SidebarObjective {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  tasks: {
    slug: string;
    title: string;
    status: Status;
  }[];
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "MASTERED") return <Check className="size-3.5 text-green" />;
  if (status === "REVIEWED") return <Check className="size-3.5 text-amber" />;
  if (status === "READING") return <Dot className="size-4 text-blue" />;
  return <Circle className="size-3 text-text-dim" />;
}

export function SidebarNav({
  objectives,
  activeObjective,
  activeTask,
}: {
  objectives: SidebarObjective[];
  activeObjective?: string;
  activeTask?: string;
}) {
  return (
    <nav
      aria-label="Objetivos"
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-border-subtle bg-surface px-3 py-4"
    >
      {objectives.map((obj) => (
        <div key={obj.id}>
          <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            {obj.id} · {obj.title}
          </div>
          <ul className="mt-1 space-y-0.5">
            {obj.tasks.map((task) => {
              const isActive = activeObjective === obj.slug && activeTask === task.slug;
              return (
                <li key={task.slug}>
                  <Link
                    href={`/domains/${obj.slug}/${task.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors duration-micro",
                      isActive
                        ? "border-l-2 border-accent bg-accent/10 pl-1.5 text-accent"
                        : "text-text hover:bg-surface-2",
                    )}
                  >
                    <StatusIcon status={task.status} />
                    <span className="truncate">{task.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar-nav.tsx
git commit -m "feat: SidebarNav with objectives and status icons"
```

---

### Task 26: AppShell layout

**Files:**

- Create: `components/app-shell.tsx`

- [ ] **Step 1: Create**

```tsx
import { Topbar } from "./topbar";
import type { ReactNode } from "react";

export function AppShell({
  sidebar,
  rightPanel,
  children,
  globalProgress,
}: {
  sidebar?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
  globalProgress?: number;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <Topbar globalProgress={globalProgress} />
      <div className="grid flex-1 grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_260px]">
        <aside>{sidebar}</aside>
        <main id="main" className="min-w-0 overflow-x-hidden px-8 py-6">
          {children}
        </main>
        <aside className="hidden xl:block">{rightPanel}</aside>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/app-shell.tsx
git commit -m "feat: AppShell three-column layout"
```

---

### Task 27: CopyCmd MDX component

**Files:**

- Create: `components/mdx/copy-cmd.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCmd({ cmd, lang = "bash" }: { cmd: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-3 flex items-center gap-2 rounded-md border border-border-subtle bg-bg px-3 py-2 font-mono text-sm">
      <span className="text-accent">{lang === "bash" ? "$" : ">"}</span>
      <code className="flex-1 truncate text-text">{cmd}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copiado" : "Copiar comando"}
        className={cn(
          "rounded p-1 text-text-muted transition-colors duration-micro hover:text-text focus-visible:text-text",
          copied && "text-green",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/mdx/copy-cmd.tsx
git commit -m "feat: CopyCmd MDX component with clipboard copy"
```

---

### Task 28: Analogy, Callout, VaultOutput, Toggle

**Files:**

- Create: `components/mdx/analogy.tsx`
- Create: `components/mdx/callout.tsx`
- Create: `components/mdx/vault-output.tsx`
- Create: `components/mdx/toggle.tsx`

- [ ] **Step 1: `components/mdx/analogy.tsx`**

```tsx
export function Analogy({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-4 rounded-r-md border-l-[3px] border-accent bg-accent/5 px-4 py-3 text-sm text-text">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
        Analogía
      </div>
      {children}
    </aside>
  );
}
```

- [ ] **Step 2: `components/mdx/callout.tsx`**

```tsx
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: { icon: Info, color: "text-blue", border: "border-blue/40", bg: "bg-blue/5" },
  warning: {
    icon: AlertTriangle,
    color: "text-amber",
    border: "border-amber/40",
    bg: "bg-amber/5",
  },
  success: { icon: CheckCircle2, color: "text-green", border: "border-green/40", bg: "bg-green/5" },
};

export function Callout({
  type = "info",
  children,
}: {
  type?: keyof typeof variants;
  children: React.ReactNode;
}) {
  const v = variants[type];
  const Icon = v.icon;
  return (
    <div className={cn("my-4 flex gap-3 rounded-md border px-4 py-3 text-sm", v.border, v.bg)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", v.color)} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: `components/mdx/vault-output.tsx`**

```tsx
export function VaultOutput({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-md border border-border-subtle bg-[#010409] px-4 py-3 font-mono text-xs text-text-muted">
      {children}
    </pre>
  );
}
```

- [ ] **Step 4: `components/mdx/toggle.tsx`**

```tsx
"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toggle({ summary, children }: { summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-3 rounded-md border border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-sm text-text transition-colors duration-micro hover:bg-surface-2"
      >
        <span>{summary}</span>
        <ChevronDown
          className={cn("size-4 transition-transform duration-state", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-border-subtle px-3 py-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 5: `components/mdx/index.ts`**

```ts
import { CopyCmd } from "./copy-cmd";
import { Analogy } from "./analogy";
import { Callout } from "./callout";
import { VaultOutput } from "./vault-output";
import { Toggle } from "./toggle";

export const mdxComponents = {
  CopyCmd,
  Analogy,
  Callout,
  VaultOutput,
  Toggle,
};
```

- [ ] **Step 6: Verify typecheck of the whole project now passes**

```bash
npx tsc --noEmit
```

Expected: no errors (including `lib/content/mdx.ts` from Task 14, which now resolves `mdxComponents`).

- [ ] **Step 7: Commit**

```bash
git add components/mdx/
git commit -m "feat: MDX components (Analogy, Callout, VaultOutput, Toggle) and barrel"
```

---

## PHASE 7 — Pages and routing

### Task 29: Dashboard page

**Files:**

- Create: `components/objective-card.tsx`
- Replace: `app/page.tsx`
- Create: `lib/dashboard.ts`

- [ ] **Step 1: `lib/dashboard.ts`**

```ts
import { prisma } from "./prisma";
import type { Status } from "@prisma/client";
import type { SidebarObjective } from "@/components/sidebar-nav";

export interface DashboardObjective {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  taskCount: number;
  masteredCount: number;
  reviewedCount: number;
  readingCount: number;
  percent: number;
}

export async function getDashboard(): Promise<{
  objectives: DashboardObjective[];
  globalPercent: number;
  lastTask: { objectiveSlug: string; taskSlug: string; title: string } | null;
}> {
  const objectives = await prisma.objective.findMany({
    include: { tasks: { where: { hidden: false }, include: { progress: true } } },
    orderBy: { orderIndex: "asc" },
  });

  const rows: DashboardObjective[] = objectives.map((o) => {
    const taskCount = o.tasks.length;
    const masteredCount = o.tasks.filter((t) => t.progress?.status === "MASTERED").length;
    const reviewedCount = o.tasks.filter((t) => t.progress?.status === "REVIEWED").length;
    const readingCount = o.tasks.filter((t) => t.progress?.status === "READING").length;
    const weighted = masteredCount * 1 + reviewedCount * 0.66 + readingCount * 0.33;
    const percent = taskCount === 0 ? 0 : (weighted / taskCount) * 100;
    return {
      id: o.id,
      slug: o.slug,
      title: o.title,
      orderIndex: o.orderIndex,
      taskCount,
      masteredCount,
      reviewedCount,
      readingCount,
      percent,
    };
  });

  const totalTasks = rows.reduce((s, r) => s + r.taskCount, 0);
  const globalPercent =
    totalTasks === 0
      ? 0
      : (rows.reduce((s, r) => s + (r.percent * r.taskCount) / 100, 0) * 100) / totalTasks;

  const lastProgress = await prisma.taskProgress.findFirst({
    orderBy: { lastVisit: "desc" },
    include: { task: { include: { objective: true } } },
  });
  const lastTask = lastProgress?.task
    ? {
        objectiveSlug: lastProgress.task.objective.slug,
        taskSlug: lastProgress.task.slug,
        title: lastProgress.task.title,
      }
    : null;

  return { objectives: rows, globalPercent, lastTask };
}

export function mapObjectivesToSidebar(
  objectives: {
    id: string;
    slug: string;
    title: string;
    orderIndex: number;
    tasks: { slug: string; title: string; progress: { status: Status } | null }[];
  }[],
): SidebarObjective[] {
  return objectives.map((o) => ({
    id: o.id,
    slug: o.slug,
    title: o.title,
    orderIndex: o.orderIndex,
    tasks: o.tasks.map((t) => ({
      slug: t.slug,
      title: t.title,
      status: t.progress?.status ?? "NOT_STARTED",
    })),
  }));
}

export async function getSidebarObjectives(): Promise<SidebarObjective[]> {
  const objectives = await prisma.objective.findMany({
    include: {
      tasks: {
        where: { hidden: false },
        orderBy: { orderIndex: "asc" },
        include: { progress: { select: { status: true } } },
      },
    },
    orderBy: { orderIndex: "asc" },
  });
  return mapObjectivesToSidebar(objectives);
}
```

- [ ] **Step 2: `components/objective-card.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardObjective } from "@/lib/dashboard";

export function ObjectiveCard({ obj }: { obj: DashboardObjective }) {
  return (
    <Link
      href={`/domains/${obj.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors duration-state hover:border-accent/50"
    >
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Objetivo {obj.id}
        </div>
        <div className="text-sm font-medium text-accent">{Math.round(obj.percent)}%</div>
      </div>
      <h3 className="text-md font-semibold leading-tight text-text">{obj.title}</h3>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full bg-accent transition-all duration-state"
          style={{ width: `${obj.percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>
          {obj.masteredCount}/{obj.taskCount} dominados
        </span>
        <ArrowRight className="size-3.5 opacity-0 transition-opacity duration-micro group-hover:opacity-100" />
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { ObjectiveCard } from "@/components/objective-card";
import { getDashboard, getSidebarObjectives } from "@/lib/dashboard";

export default async function DashboardPage() {
  const [{ objectives, globalPercent, lastTask }, sidebar] = await Promise.all([
    getDashboard(),
    getSidebarObjectives(),
  ]);

  return (
    <AppShell globalProgress={globalPercent} sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido</h1>
          <p className="text-text-muted">Progreso global: {Math.round(globalPercent)}%</p>
        </header>

        {lastTask && (
          <Link
            href={`/domains/${lastTask.objectiveSlug}/${lastTask.taskSlug}`}
            className="block rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-text hover:border-accent"
          >
            Continúa donde lo dejaste → <span className="font-medium">{lastTask.title}</span>
          </Link>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {objectives.map((o) => (
            <ObjectiveCard key={o.id} obj={o} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Run dev and verify**

```bash
npm run dev
```

Open `/`. Expected: dashboard renders with at least 1 objective card (from fixture). Stop.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/objective-card.tsx lib/dashboard.ts
git commit -m "feat: dashboard page with objective cards and resume-last-task"
```

---

### Task 30: Objective page

**Files:**

- Create: `app/domains/[objectiveSlug]/page.tsx`

- [ ] **Step 1: Create**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { getSidebarObjectives } from "@/lib/dashboard";
import { prisma } from "@/lib/prisma";

export default async function ObjectiveView({ params }: { params: { objectiveSlug: string } }) {
  const objective = await prisma.objective.findUnique({
    where: { slug: params.objectiveSlug },
    include: {
      tasks: {
        where: { hidden: false },
        orderBy: { orderIndex: "asc" },
        include: { progress: { select: { status: true } } },
      },
    },
  });
  if (!objective) notFound();

  const sidebar = await getSidebarObjectives();

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} activeObjective={objective.slug} />}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-dim">
            Objetivo {objective.id}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{objective.title}</h1>
        </div>
        <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {objective.tasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/domains/${objective.slug}/${task.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors duration-micro hover:bg-surface"
              >
                <span className="truncate text-text">{task.title}</span>
                <StatusPill status={task.progress?.status ?? "NOT_STARTED"} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/domains/
git commit -m "feat: objective overview page with task list"
```

---

### Task 31: TaskView page skeleton

**Files:**

- Create: `app/domains/[objectiveSlug]/[taskSlug]/page.tsx`

- [ ] **Step 1: Create**

````tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { RightPanel } from "@/components/right-panel";
import { TabSwitcher } from "@/components/tab-switcher";
import { FooterNav } from "@/components/footer-nav";
import { prisma } from "@/lib/prisma";
import { loadTask } from "@/lib/content/loader";
import { getSidebarObjectives } from "@/lib/dashboard";
import { compileTaskMdx } from "@/lib/content/mdx";
import { getProgress, touchVisit } from "@/lib/progress";

export default async function TaskView({
  params,
}: {
  params: { objectiveSlug: string; taskSlug: string };
}) {
  const objective = await prisma.objective.findUnique({ where: { slug: params.objectiveSlug } });
  if (!objective) notFound();
  const loaded = await loadTask(objective.id, params.taskSlug);
  if (!loaded) notFound();

  const taskId = `${objective.id}/${params.taskSlug}`;
  await touchVisit(prisma, taskId);
  const progress = await getProgress(prisma, taskId);

  const [explained, notes, lab] = await Promise.all([
    loaded.explained ? compileTaskMdx(loaded.explained) : null,
    loaded.notes ? compileTaskMdx(loaded.notes) : null,
    loaded.lab ? compileTaskMdx(loaded.lab) : null,
  ]);

  const sidebar = await getSidebarObjectives();
  const title =
    loaded.explained?.frontmatter.title ?? loaded.notes?.frontmatter.title ?? params.taskSlug;

  // Adjacent tasks for footer nav
  const tasksInOrder = await prisma.task.findMany({
    where: { objectiveId: objective.id, hidden: false },
    orderBy: { orderIndex: "asc" },
  });
  const currentIndex = tasksInOrder.findIndex((t) => t.slug === params.taskSlug);
  const prev = currentIndex > 0 ? tasksInOrder[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < tasksInOrder.length - 1
      ? tasksInOrder[currentIndex + 1]
      : undefined;

  return (
    <AppShell
      sidebar={
        <SidebarNav
          objectives={sidebar}
          activeObjective={objective.slug}
          activeTask={params.taskSlug}
        />
      }
      rightPanel={
        <RightPanel
          externalLinks={loaded.externalLinks}
          labCommands={extractCommands(loaded.lab?.body ?? "")}
          taskId={taskId}
        />
      }
    >
      <article className="mx-auto max-w-3xl space-y-4">
        <nav className="text-xs text-text-dim">
          <span>{objective.title}</span>
          <span className="mx-1.5 text-text-dim/50">/</span>
          <span className="text-text-muted">{title}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-3">
          <StatusPill status={progress?.status ?? "NOT_STARTED"} />
          {loaded.explained?.frontmatter.estMinutes && (
            <span className="text-xs text-text-muted">
              est. {loaded.explained.frontmatter.estMinutes} min
            </span>
          )}
        </div>
        <TabSwitcher
          taskId={taskId}
          initialStatus={progress?.status ?? "NOT_STARTED"}
          panels={{
            explained: explained?.content ?? null,
            notes: notes?.content ?? null,
            lab: lab?.content ?? null,
          }}
        />
        <FooterNav
          prevHref={prev ? `/domains/${objective.slug}/${prev.slug}` : null}
          prevLabel={prev?.title ?? null}
          nextHref={next ? `/domains/${objective.slug}/${next.slug}` : null}
          nextLabel={next?.title ?? null}
        />
      </article>
    </AppShell>
  );
}

function extractCommands(body: string): string[] {
  const cmds: string[] = [];
  const re = /```(?:bash|sh)[\s\S]*?```/g;
  const blocks = body.match(re) ?? [];
  for (const block of blocks) {
    const inner = block.replace(/```(?:bash|sh)\n?/, "").replace(/```$/, "");
    inner
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((l) => cmds.push(l.replace(/^\$\s*/, "")));
  }
  return cmds.slice(0, 20);
}
````

- [ ] **Step 2: Commit** (components referenced here are created in the next tasks)

```bash
git add app/domains/[objectiveSlug]/[taskSlug]/
git commit -m "feat: TaskView page wiring (components in next tasks)"
```

---

### Task 32: TabSwitcher component

**Files:**

- Create: `components/tab-switcher.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { StatusPill } from "./status-pill";
import type { Status } from "@prisma/client";
import { cn } from "@/lib/utils";

type TabKey = "explained" | "notes" | "lab";
const TAB_LABELS: Record<TabKey, string> = {
  explained: "Explicación sencilla",
  notes: "Notas técnicas",
  lab: "Lab",
};

export function TabSwitcher({
  taskId,
  initialStatus,
  panels,
}: {
  taskId: string;
  initialStatus: Status;
  panels: Record<TabKey, ReactNode | null>;
}) {
  const [active, setActive] = useState<TabKey>(firstAvailable(panels));
  const [status, setStatus] = useState<Status>(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.key === "1" && panels.explained) setActive("explained");
      else if (e.key === "2" && panels.notes) setActive("notes");
      else if (e.key === "3" && panels.lab) setActive("lab");
      else if (e.key === "m") void advance("REVIEWED");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  async function advance(target: Status) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/progress/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    if (res.ok) {
      const json = await res.json();
      setStatus(json.status);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border-subtle">
        <div role="tablist" className="flex gap-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => {
            const disabled = !panels[key];
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active === key}
                disabled={disabled}
                onClick={() => !disabled && setActive(key)}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-micro",
                  active === key
                    ? "border-accent text-text"
                    : "border-transparent text-text-muted hover:text-text",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>
        <StatusPill status={status} onClick={() => void advance(nextStatus(status))} />
      </div>
      <div className="prose prose-invert prose-headings:font-semibold prose-code:font-mono prose-code:text-sm prose-pre:bg-[#010409] prose-a:text-blue max-w-none">
        {panels[active]}
      </div>
    </div>
  );
}

function firstAvailable(panels: Record<TabKey, ReactNode | null>): TabKey {
  if (panels.explained) return "explained";
  if (panels.notes) return "notes";
  return "lab";
}

function nextStatus(s: Status): Status {
  switch (s) {
    case "NOT_STARTED":
      return "READING";
    case "READING":
      return "REVIEWED";
    case "REVIEWED":
      return "MASTERED";
    case "MASTERED":
      return "READING";
  }
}
```

- [ ] **Step 2: Install Tailwind typography plugin**

```bash
npm install -D @tailwindcss/typography
```

Update `tailwind.config.ts` plugins:

```ts
plugins: [require("@tailwindcss/typography")],
```

- [ ] **Step 3: Commit**

```bash
git add components/tab-switcher.tsx tailwind.config.ts package.json package-lock.json
git commit -m "feat: TabSwitcher with keyboard shortcuts and inline status advance"
```

---

### Task 33: RightPanel, CommandList, NoteEditor, FooterNav, LabLauncher, Toc

**Files:**

- Create: `components/right-panel.tsx`, `components/command-list.tsx`, `components/note-editor.tsx`, `components/footer-nav.tsx`, `components/lab-launcher.tsx`, `components/toc.tsx`
- Create: `lib/hooks/use-autosave.ts`

- [ ] **Step 1: `lib/hooks/use-autosave.ts`**

```ts
"use client";
import { useEffect, useRef, useState } from "react";

export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 800,
): { saving: boolean; savedAt: Date | null } {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await save(value);
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delayMs, save]);

  return { saving, savedAt };
}
```

- [ ] **Step 2: `components/note-editor.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useAutosave } from "@/lib/hooks/use-autosave";

export function NoteEditor({ taskId }: { taskId: string }) {
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/notes/${encodeURIComponent(taskId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        setBody(j.body ?? "");
        setLoaded(true);
      });
    return () => {
      cancel = true;
    };
  }, [taskId]);

  const { saving, savedAt } = useAutosave(body, async (v) => {
    if (!loaded) return;
    await fetch(`/api/notes/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: v }),
    });
  });

  return (
    <div>
      <textarea
        id="note-editor"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe tus apuntes en Markdown…"
        rows={6}
        className="w-full rounded-md border border-border-subtle bg-bg p-2 font-mono text-xs text-text placeholder:text-text-dim focus:border-accent/50 focus:outline-none"
      />
      <div className="mt-1 h-4 text-[10px] text-text-dim">
        {saving ? "Guardando…" : savedAt ? `Guardado ${savedAt.toLocaleTimeString()}` : ""}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `components/command-list.tsx`**

```tsx
import { CopyCmd } from "./mdx/copy-cmd";

export function CommandList({ commands }: { commands: string[] }) {
  if (commands.length === 0) return null;
  return (
    <div className="space-y-1">
      {commands.map((c, i) => (
        <CopyCmd key={`${i}-${c}`} cmd={c} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `components/lab-launcher.tsx`**

```tsx
import { ExternalLink } from "lucide-react";

export function LabLauncher({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg transition-all duration-micro hover:brightness-95"
    >
      <ExternalLink className="size-3.5" /> Abrir codespace
    </a>
  );
}
```

- [ ] **Step 5: `components/toc.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function Toc() {
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll("article h2, article h3"),
    ) as HTMLHeadingElement[];
    setItems(
      headings
        .filter((h) => h.id)
        .map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H2" ? 2 : 3 })),
    );
  }, []);

  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs">
      {items.map((i) => (
        <li key={i.id} style={{ paddingLeft: (i.level - 2) * 10 }}>
          <a href={`#${i.id}`} className="text-text-muted hover:text-text">
            {i.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: `components/footer-nav.tsx`**

```tsx
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function FooterNav({
  prevHref,
  prevLabel,
  nextHref,
  nextLabel,
}: {
  prevHref: string | null;
  prevLabel: string | null;
  nextHref: string | null;
  nextLabel: string | null;
}) {
  return (
    <footer className="mt-8 flex items-center justify-between border-t border-border-subtle pt-4 text-sm">
      {prevHref ? (
        <Link
          href={prevHref}
          className="inline-flex items-center gap-2 text-text-muted hover:text-text"
        >
          <ArrowLeft className="size-4" />
          <span className="max-w-[18ch] truncate">{prevLabel}</span>
        </Link>
      ) : (
        <span />
      )}
      {nextHref ? (
        <Link
          href={nextHref}
          className="inline-flex items-center gap-2 text-text hover:text-accent"
        >
          <span className="max-w-[18ch] truncate">{nextLabel}</span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </footer>
  );
}
```

- [ ] **Step 7: `components/right-panel.tsx`**

```tsx
import { Toc } from "./toc";
import { LabLauncher } from "./lab-launcher";
import { CommandList } from "./command-list";
import { NoteEditor } from "./note-editor";

export function RightPanel({
  externalLinks,
  labCommands,
  taskId,
}: {
  externalLinks: { label: string; url: string }[];
  labCommands: string[];
  taskId: string;
}) {
  const labLink = externalLinks.find((l) => l.label.toLowerCase().includes("lab"));
  return (
    <div className="h-full space-y-6 overflow-y-auto border-l border-border-subtle bg-surface px-4 py-5 text-sm">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          En esta página
        </h4>
        <Toc />
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Laboratorio
        </h4>
        <LabLauncher url={labLink?.url} />
        <div className="mt-3">
          <CommandList commands={labCommands} />
        </div>
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Enlaces externos
        </h4>
        <ul className="space-y-1 text-xs">
          {externalLinks.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue hover:underline"
              >
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Mis notas
        </h4>
        <NoteEditor taskId={taskId} />
      </section>
    </div>
  );
}
```

- [ ] **Step 8: Run dev, visit a task page**

```bash
npm run dev
```

Visit `/domains/secrets/kv-v2`. Expected: 3-column layout, tabs, explain content renders, right panel shows commands and note editor. Stop.

- [ ] **Step 9: Commit**

```bash
git add components/ lib/hooks/
git commit -m "feat: RightPanel with TOC, lab launcher, command list, and autosaving notes"
```

---

### Task 34: Global keyboard shortcuts hook (j/k navigation + focus)

**Files:**

- Create: `lib/hooks/use-keyboard-shortcuts.ts`
- Create: `components/keyboard-shortcuts.tsx` (client component wrapper)
- Modify: `app/layout.tsx`

- [ ] **Step 1: `lib/hooks/use-keyboard-shortcuts.ts`**

```ts
"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AdjacentTasks {
  prev?: string;
  next?: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "n") {
        e.preventDefault();
        document.getElementById("note-editor")?.focus();
      } else if (e.key === "j" || e.key === "k") {
        const match = pathname.match(/^\/domains\/([^/]+)\/([^/]+)$/);
        if (!match) return;
        const [, objectiveSlug, taskSlug] = match;
        const res = await fetch(`/api/nav?objective=${objectiveSlug}&task=${taskSlug}`);
        if (!res.ok) return;
        const { prev, next } = (await res.json()) as AdjacentTasks;
        if (e.key === "j" && next) router.push(next);
        if (e.key === "k" && prev) router.push(prev);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router]);
}
```

- [ ] **Step 2: `components/keyboard-shortcuts.tsx`**

```tsx
"use client";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";

export function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}
```

- [ ] **Step 3: Create `app/api/nav/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const objectiveSlug = req.nextUrl.searchParams.get("objective");
  const taskSlug = req.nextUrl.searchParams.get("task");
  if (!objectiveSlug || !taskSlug) return NextResponse.json({}, { status: 400 });

  const objective = await prisma.objective.findUnique({
    where: { slug: objectiveSlug },
    include: {
      tasks: { where: { hidden: false }, orderBy: { orderIndex: "asc" } },
    },
  });
  if (!objective) return NextResponse.json({}, { status: 404 });

  const idx = objective.tasks.findIndex((t) => t.slug === taskSlug);
  const prev = idx > 0 ? objective.tasks[idx - 1] : undefined;
  const next = idx >= 0 && idx < objective.tasks.length - 1 ? objective.tasks[idx + 1] : undefined;
  return NextResponse.json({
    prev: prev ? `/domains/${objective.slug}/${prev.slug}` : null,
    next: next ? `/domains/${objective.slug}/${next.slug}` : null,
  });
}
```

- [ ] **Step 4: Mount `KeyboardShortcuts` in `app/layout.tsx`**

Add import and place before `{children}`:

```tsx
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
// ...
<body className="font-sans">
  {/* ... skip link ... */}
  <KeyboardShortcuts />
  {children}
</body>;
```

- [ ] **Step 5: Commit**

```bash
git add app/api/nav/ components/keyboard-shortcuts.tsx lib/hooks/use-keyboard-shortcuts.ts app/layout.tsx
git commit -m "feat: global keyboard shortcuts (j/k/n) and /api/nav helper"
```

---

### Task 35: Review and Notes index pages

**Files:**

- Create: `app/review/page.tsx`, `app/notes/page.tsx`

- [ ] **Step 1: `app/review/page.tsx`**

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusPill } from "@/components/status-pill";
import { prisma } from "@/lib/prisma";
import { getSidebarObjectives } from "@/lib/dashboard";

export default async function ReviewView() {
  const [sidebar, tasks] = await Promise.all([
    getSidebarObjectives(),
    prisma.task.findMany({
      where: { hidden: false, progress: { status: { in: ["READING", "REVIEWED"] } } },
      include: { progress: true, objective: true },
      orderBy: { progress: { lastVisit: "asc" } },
    }),
  ]);

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Repasar</h1>
          <p className="text-text-muted">
            {tasks.length} tareas en estado Leyendo o Revisado, ordenadas por última visita (más
            antiguas primero).
          </p>
        </header>
        <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/domains/${t.objective.slug}/${t.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-surface"
              >
                <div className="min-w-0">
                  <div className="truncate text-text">{t.title}</div>
                  <div className="text-xs text-text-dim">{t.objective.title}</div>
                </div>
                <StatusPill status={t.progress?.status ?? "NOT_STARTED"} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: `app/notes/page.tsx`**

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SidebarNav } from "@/components/sidebar-nav";
import { prisma } from "@/lib/prisma";
import { getSidebarObjectives } from "@/lib/dashboard";

export default async function NotesIndex() {
  const sidebar = await getSidebarObjectives();
  const notes = await prisma.taskNote.findMany({
    where: { body: { not: "" } },
    include: { task: { include: { objective: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const byObjective = new Map<string, typeof notes>();
  for (const n of notes) {
    const key = n.task.objective.title;
    byObjective.set(key, [...(byObjective.get(key) ?? []), n]);
  }

  return (
    <AppShell sidebar={<SidebarNav objectives={sidebar} />}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mis notas</h1>
          <p className="text-text-muted">{notes.length} tareas con notas.</p>
        </header>
        {[...byObjective.entries()].map(([title, items]) => (
          <section key={title} className="space-y-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            <ul className="space-y-3">
              {items.map((n) => (
                <li
                  key={n.taskId}
                  className="rounded-md border border-border-subtle bg-surface p-3"
                >
                  <Link
                    href={`/domains/${n.task.objective.slug}/${n.task.slug}`}
                    className="block text-sm font-medium text-text hover:text-accent"
                  >
                    {n.task.title}
                  </Link>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-text-muted">
                    {n.body.length > 280 ? n.body.slice(0, 280) + "…" : n.body}
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/review/ app/notes/
git commit -m "feat: /review and /notes index pages"
```

---

### Task 36: not-found and error pages

**Files:**

- Create: `app/not-found.tsx`, `app/error.tsx`

- [ ] **Step 1: `app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">No se encontró lo que buscabas</h1>
        <p className="text-text-muted">La tarea o dominio no existe o fue renombrado.</p>
        <Link
          href="/"
          className="inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `app/error.tsx`**

```tsx
"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="text-text-muted">{error.message}</p>
        <button
          onClick={reset}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/not-found.tsx app/error.tsx
git commit -m "feat: 404 and error pages"
```

---

## PHASE 8 — Ingestion scripts

### Task 37: Shared ingest helpers

**Files:**

- Create: `scripts/ingest/_lib.ts`

- [ ] **Step 1: Create**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Frontmatter } from "@/lib/content/frontmatter";

export const CONTENT_ROOT = path.resolve(process.cwd(), "content");
export const TMP_ROOT = path.resolve(process.cwd(), "node_modules/.ingest-cache");

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function shallowClone(repoUrl: string, target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(path.dirname(target));
  execSync(`git clone --depth 1 ${repoUrl} ${target}`, { stdio: "inherit" });
}

export function writeMdx(filePath: string, frontmatter: Frontmatter, body: string): Promise<void> {
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (typeof v === "string" ? `${k}: "${v.replace(/"/g, '\\"')}"` : `${k}: ${v}`))
    .join("\n");
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`;
  return fs.writeFile(filePath, content, "utf8");
}

export function objectiveDir(objectiveId: string, objectiveSlug: string): string {
  return path.join(CONTENT_ROOT, "domains", `${objectiveId}-${objectiveSlug}`);
}

export function taskDir(objectiveId: string, objectiveSlug: string, taskSlug: string): string {
  return path.join(objectiveDir(objectiveId, objectiveSlug), taskSlug);
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/ingest/_lib.ts
git commit -m "feat: shared helpers for ingest scripts"
```

---

### Task 38: HashiCorp index scraper

**Files:**

- Create: `scripts/ingest/hashicorp-index.ts`

- [ ] **Step 1: Create**

```ts
#!/usr/bin/env tsx
/**
 * Scrapes https://developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-study-003
 * and writes content/_index/objectives.json with the 9 official objectives.
 *
 * Only structure (titles, slugs, ordering, URLs) is extracted. Body content is never copied.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, CONTENT_ROOT } from "./_lib";

const STUDY_URL =
  "https://developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-study-003";

interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  officialUrl: string;
  tasks: { slug: string; title: string; orderIndex: number; officialUrl: string }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "vault-training-ingest/1.0" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.text();
}

function parseObjectives(html: string): ObjectiveIndex[] {
  // HashiCorp tutorial pages render a structured index of objectives. Parse defensively:
  // look for the "Objectives" section and extract numbered items and their nested sub-tasks.
  // Regex approach is pragmatic for a one-off ingest; if the page structure changes, update the
  // selectors here.
  const objectives: ObjectiveIndex[] = [];

  const objectiveRe =
    /<h3[^>]*>\s*(?:<a[^>]*>)?\s*([0-9]+)\.\s*([^<]+)<\/a?[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/g;
  let m: RegExpExecArray | null;
  while ((m = objectiveRe.exec(html)) !== null) {
    const [, id, rawTitle, listHtml] = m;
    if (!id || !rawTitle || !listHtml) continue;
    const title = rawTitle.replace(/\s+/g, " ").trim();
    const slug = slugify(title);
    const tasks: ObjectiveIndex["tasks"] = [];
    const taskRe = /<li[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let t: RegExpExecArray | null;
    let order = 1;
    while ((t = taskRe.exec(listHtml)) !== null) {
      const [, href, label] = t;
      if (!href || !label) continue;
      const taskTitle = label.replace(/\s+/g, " ").trim();
      tasks.push({
        slug: slugify(taskTitle),
        title: taskTitle,
        orderIndex: order++,
        officialUrl: href.startsWith("http") ? href : `https://developer.hashicorp.com${href}`,
      });
    }
    objectives.push({
      id,
      slug,
      title,
      orderIndex: Number(id),
      officialUrl: STUDY_URL,
      tasks,
    });
  }

  return objectives;
}

async function main() {
  console.log(`[ingest:index] fetching ${STUDY_URL}`);
  const html = await fetchHtml(STUDY_URL);
  const objectives = parseObjectives(html);
  if (objectives.length === 0) {
    throw new Error(
      "Parser returned 0 objectives. The page structure likely changed — inspect the HTML and update parseObjectives().",
    );
  }
  const outDir = path.join(CONTENT_ROOT, "_index");
  await ensureDir(outDir);
  const outFile = path.join(outDir, "objectives.json");
  await fs.writeFile(outFile, JSON.stringify(objectives, null, 2) + "\n", "utf8");
  console.log(`[ingest:index] wrote ${objectives.length} objectives to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

In `package.json` under `scripts`:

```json
"ingest:index": "tsx scripts/ingest/hashicorp-index.ts",
```

- [ ] **Step 3: Run and inspect output**

```bash
npm run ingest:index
```

Expected: `content/_index/objectives.json` populated with ≥1 objective (the script throws if 0). If the regex doesn't match anything, update `parseObjectives()` to match the current HashiCorp markup. Inspect a few entries manually.

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest/hashicorp-index.ts package.json
git commit -m "feat: HashiCorp associate-study-003 index scraper"
```

---

### Task 39: ismet55555 notes ingester

**Files:**

- Create: `config/ismet-mapping.yaml`
- Create: `scripts/ingest/ismet-notes.ts`
- Create: `tests/unit/ismet-mapper.test.ts`

- [ ] **Step 1: `config/ismet-mapping.yaml`** (initial template — populate during first run)

```yaml
# Maps files/headings from ismet55555/Hashicorp-Certified-Vault-Associate-Notes
# to (objectiveId, taskSlug) pairs. Update after the first run by inspecting
# the cloned folder at node_modules/.ingest-cache/ismet-notes/.
#
# Format:
#   - file: <glob relative to repo root>
#     heading: <optional H2/H3 match, trimmed>
#     objectiveId: "<n>"
#     taskSlug: "<slug>"
#
# Example:
#   - file: "03_secrets_engines.md"
#     heading: "KV v2"
#     objectiveId: "3"
#     taskSlug: "kv-v2"

mappings: []
```

- [ ] **Step 2: Test for mapper**

```ts
// tests/unit/ismet-mapper.test.ts
import { describe, it, expect } from "vitest";
import { resolveMapping } from "@/scripts/ingest/ismet-notes";

describe("resolveMapping", () => {
  const mappings = [
    { file: "03_secrets_engines.md", heading: "KV v2", objectiveId: "3", taskSlug: "kv-v2" },
    { file: "03_secrets_engines.md", objectiveId: "3", taskSlug: "_meta" },
  ];

  it("matches by file + heading", () => {
    const r = resolveMapping(mappings, "03_secrets_engines.md", "KV v2");
    expect(r).toEqual({ objectiveId: "3", taskSlug: "kv-v2" });
  });

  it("falls back to file-only mapping when heading is omitted", () => {
    const r = resolveMapping(mappings, "03_secrets_engines.md", "Intro");
    expect(r).toEqual({ objectiveId: "3", taskSlug: "_meta" });
  });

  it("returns null when no mapping matches", () => {
    const r = resolveMapping(mappings, "99_unknown.md", "Anything");
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 3: `scripts/ingest/ismet-notes.ts`**

```ts
#!/usr/bin/env tsx
/**
 * Clones ismet55555/Hashicorp-Certified-Vault-Associate-Notes and writes
 * content/domains/<obj>/<task>/notes.mdx per mapping in config/ismet-mapping.yaml.
 */
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { shallowClone, TMP_ROOT, taskDir, writeMdx, ensureDir } from "./_lib";

const REPO = "https://github.com/ismet55555/Hashicorp-Certified-Vault-Associate-Notes.git";
const CLONE_DIR = path.join(TMP_ROOT, "ismet-notes");

export interface Mapping {
  file: string;
  heading?: string;
  objectiveId: string;
  taskSlug: string;
}

export function resolveMapping(
  mappings: Mapping[],
  file: string,
  heading: string,
): { objectiveId: string; taskSlug: string } | null {
  const exact = mappings.find((m) => m.file === file && m.heading === heading);
  if (exact) return { objectiveId: exact.objectiveId, taskSlug: exact.taskSlug };
  const fileOnly = mappings.find((m) => m.file === file && !m.heading);
  if (fileOnly) return { objectiveId: fileOnly.objectiveId, taskSlug: fileOnly.taskSlug };
  return null;
}

interface Section {
  heading: string;
  body: string;
}

function splitSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const m = /^##\s+(.+)/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: m[1].trim(), body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

async function readMapping(): Promise<Mapping[]> {
  const raw = await fs.readFile(path.resolve(process.cwd(), "config/ismet-mapping.yaml"), "utf8");
  const parsed = YAML.parse(raw) as { mappings?: Mapping[] } | null;
  return parsed?.mappings ?? [];
}

async function readObjectivesIndex(): Promise<{ id: string; slug: string }[]> {
  const raw = await fs.readFile(
    path.resolve(process.cwd(), "content/_index/objectives.json"),
    "utf8",
  );
  return JSON.parse(raw) as { id: string; slug: string }[];
}

async function main() {
  console.log(`[ingest:ismet] cloning ${REPO}`);
  await shallowClone(REPO, CLONE_DIR);
  const mappings = await readMapping();
  if (mappings.length === 0) {
    console.warn(
      "[ingest:ismet] config/ismet-mapping.yaml is empty. Populate it based on the cloned folder at:",
    );
    console.warn(`  ${CLONE_DIR}`);
    return;
  }
  const objectives = await readObjectivesIndex();
  const objSlugById = new Map(objectives.map((o) => [o.id, o.slug]));

  const mdFiles = (await fs.readdir(CLONE_DIR)).filter((f) => f.endsWith(".md"));
  let written = 0;

  for (const file of mdFiles) {
    const raw = await fs.readFile(path.join(CLONE_DIR, file), "utf8");
    const sections = splitSections(raw);
    const candidates: { heading: string; body: string }[] = [
      { heading: "__file__", body: raw },
      ...sections,
    ];
    for (const { heading, body } of candidates) {
      const resolved = resolveMapping(
        mappings,
        file,
        heading === "__file__" ? (undefined as unknown as string) : heading,
      );
      if (!resolved) continue;
      const objSlug = objSlugById.get(resolved.objectiveId);
      if (!objSlug) continue;
      const dir = taskDir(resolved.objectiveId, objSlug, resolved.taskSlug);
      await ensureDir(dir);
      await writeMdx(
        path.join(dir, "notes.mdx"),
        {
          objectiveId: resolved.objectiveId,
          taskSlug: resolved.taskSlug,
          kind: "notes",
          title: heading === "__file__" ? file.replace(/\.md$/, "") : heading,
          source: "ismet55555",
          sourceUrl: `https://github.com/ismet55555/Hashicorp-Certified-Vault-Associate-Notes/blob/main/${file}`,
          license: "MIT",
          order: 2,
        },
        body,
      );
      written++;
    }
  }
  console.log(`[ingest:ismet] wrote ${written} notes.mdx files`);
}

// Only run main when called directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Add npm script**

```json
"ingest:ismet": "tsx scripts/ingest/ismet-notes.ts",
```

- [ ] **Step 5: Run the mapper test**

```bash
npm test -- ismet-mapper
```

Expected: 3 tests PASS.

- [ ] **Step 6: Dry-run the ingest** (will clone but write 0 files until `ismet-mapping.yaml` is populated — that is expected)

```bash
npm run ingest:ismet
```

Expected: warns that mappings are empty and prints the clone path. Open `node_modules/.ingest-cache/ismet-notes/` and, using the actual filenames present there, populate `config/ismet-mapping.yaml`. Re-run the ingest.

- [ ] **Step 7: Commit**

```bash
git add config/ismet-mapping.yaml scripts/ingest/ismet-notes.ts tests/unit/ismet-mapper.test.ts package.json
git commit -m "feat: ismet notes ingester with YAML-driven heading→task mapping"
```

---

### Task 40: btkrausen labs ingester

**Files:**

- Create: `scripts/ingest/labs.ts`

- [ ] **Step 1: Create**

````ts
#!/usr/bin/env tsx
/**
 * Clones btkrausen/vault-codespaces and emits lab.mdx per task.
 * Parses bash/shell fenced blocks from lab README markdown into a list of
 * commands rendered with <CopyCmd> inside the lab MDX.
 */
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { shallowClone, TMP_ROOT, taskDir, writeMdx, ensureDir } from "./_lib";

const REPO = "https://github.com/btkrausen/vault-codespaces.git";
const CLONE_DIR = path.join(TMP_ROOT, "vault-codespaces");

interface LabMapping {
  file: string;
  objectiveId: string;
  taskSlug: string;
  title?: string;
}

async function readLabMapping(): Promise<LabMapping[]> {
  const p = path.resolve(process.cwd(), "config/labs-mapping.yaml");
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = YAML.parse(raw) as { mappings?: LabMapping[] } | null;
    return parsed?.mappings ?? [];
  } catch {
    return [];
  }
}

function extractBashBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```(?:bash|shell|sh)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    if (m[1]) blocks.push(m[1]);
  }
  return blocks;
}

function blocksToBody(blocks: string[], externalUrl: string, title: string): string {
  const lines: string[] = [
    `Laboratorio: **${title}**`,
    "",
    `→ [Abrir en GitHub Codespaces](${externalUrl})`,
    "",
  ];
  for (const block of blocks) {
    lines.push("```bash");
    lines.push(block.trim());
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

async function readObjectivesIndex(): Promise<{ id: string; slug: string }[]> {
  const raw = await fs.readFile(
    path.resolve(process.cwd(), "content/_index/objectives.json"),
    "utf8",
  );
  return JSON.parse(raw) as { id: string; slug: string }[];
}

async function main() {
  console.log(`[ingest:labs] cloning ${REPO}`);
  await shallowClone(REPO, CLONE_DIR);
  const mappings = await readLabMapping();
  if (mappings.length === 0) {
    console.warn(
      "[ingest:labs] config/labs-mapping.yaml is missing or empty — create it using the clone at:",
    );
    console.warn(`  ${CLONE_DIR}`);
    console.warn("Populate mappings and re-run.");
    return;
  }
  const objectives = await readObjectivesIndex();
  const objSlugById = new Map(objectives.map((o) => [o.id, o.slug]));
  let written = 0;

  for (const mapping of mappings) {
    const filePath = path.join(CLONE_DIR, mapping.file);
    try {
      const md = await fs.readFile(filePath, "utf8");
      const blocks = extractBashBlocks(md);
      const externalUrl = `https://github.com/btkrausen/vault-codespaces/blob/main/${mapping.file}`;
      const objSlug = objSlugById.get(mapping.objectiveId);
      if (!objSlug) continue;
      const dir = taskDir(mapping.objectiveId, objSlug, mapping.taskSlug);
      await ensureDir(dir);
      await writeMdx(
        path.join(dir, "lab.mdx"),
        {
          objectiveId: mapping.objectiveId,
          taskSlug: mapping.taskSlug,
          kind: "lab",
          title: mapping.title ?? `Lab: ${mapping.taskSlug}`,
          source: "btkrausen",
          sourceUrl: externalUrl,
          license: "Apache-2.0",
          order: 3,
        },
        blocksToBody(blocks, externalUrl, mapping.title ?? mapping.taskSlug),
      );
      written++;
    } catch (err) {
      console.warn(`[ingest:labs] skipped ${mapping.file}: ${(err as Error).message}`);
    }
  }
  console.log(`[ingest:labs] wrote ${written} lab.mdx files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
````

- [ ] **Step 2: Add npm scripts**

```json
"ingest:labs": "tsx scripts/ingest/labs.ts",
"ingest:all": "npm run ingest:index && npm run ingest:ismet && npm run ingest:labs"
```

- [ ] **Step 3: Create `config/labs-mapping.yaml` stub**

```yaml
# Maps files in btkrausen/vault-codespaces to (objectiveId, taskSlug) pairs.
# Populate after the first run by inspecting node_modules/.ingest-cache/vault-codespaces/.
#
# Example:
#   - file: "Challenges/Policies/readme.md"
#     objectiveId: "4"
#     taskSlug: "acl-policies"
#     title: "Write ACL policies"

mappings: []
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest/labs.ts config/labs-mapping.yaml package.json
git commit -m "feat: btkrausen labs ingester with bash-block extraction"
```

---

### Task 41: Explainer batch generator

**Files:**

- Create: `scripts/seed-explainers.ts`

- [ ] **Step 1: Create**

```ts
#!/usr/bin/env tsx
/**
 * Generates content/domains/<obj>/<task>/explained.mdx for every (objective, task)
 * in content/_index/objectives.json that does not already have one.
 *
 * Flags:
 *   --force               regenerate all explainers
 *   --task <obj>/<slug>   regenerate only one task
 *
 * Requires ANTHROPIC_API_KEY in the environment.
 */
import fs from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import { CONTENT_ROOT, ensureDir, taskDir, writeMdx } from "./ingest/_lib";

interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  tasks: { slug: string; title: string; officialUrl: string; orderIndex: number }[];
}

const MODEL = "claude-opus-4-6";

const SYSTEM_PROMPT = `Eres un profesor experto en HashiCorp Vault que escribe explicaciones "para dummies" en español, claras y concretas.

Reglas:
- Empieza con una analogía cotidiana (usa el componente <Analogy>).
- Introduce cualquier término técnico solo después de dar una intuición.
- Frases cortas. Un párrafo = una idea.
- Incluye ejemplos de comandos usando <CopyCmd cmd="..." />.
- Evita jerga sin definir, fórmulas y referencias a otros productos HashiCorp salvo cuando sean esenciales.
- No uses emojis.
- Termina con una sección "## Puntos clave" con 3-5 bullets muy concretos.
- Solo devuelve el cuerpo MDX, sin frontmatter.`;

function userPrompt(objective: string, task: string, officialUrl: string): string {
  return `Explica el siguiente tema del examen HashiCorp Vault Associate a alguien que no sabe nada de Vault:

Objetivo: ${objective}
Tarea: ${task}
Tutorial oficial de HashiCorp: ${officialUrl}

Genera entre 250 y 400 palabras. Devuelve solo el cuerpo MDX.`;
}

function parseArgs(): { force: boolean; onlyTask?: string } {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const idx = args.indexOf("--task");
  const onlyTask = idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
  return { force, onlyTask };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing in environment");
  }
  const { force, onlyTask } = parseArgs();

  const index = JSON.parse(
    await fs.readFile(path.join(CONTENT_ROOT, "_index", "objectives.json"), "utf8"),
  ) as ObjectiveIndex[];

  const client = new Anthropic();
  let written = 0;
  let skipped = 0;

  for (const obj of index) {
    for (const task of obj.tasks) {
      const id = `${obj.id}/${task.slug}`;
      if (onlyTask && onlyTask !== id) continue;
      const dir = taskDir(obj.id, obj.slug, task.slug);
      await ensureDir(dir);
      const target = path.join(dir, "explained.mdx");
      try {
        await fs.access(target);
        if (!force) {
          skipped++;
          continue;
        }
      } catch {
        // not present — proceed
      }

      console.log(`[seed:explainers] generating ${id}`);
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(obj.title, task.title, task.officialUrl) }],
      });
      const body = resp.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map((c) => c.text)
        .join("\n")
        .trim();
      if (!body) {
        console.warn(`[seed:explainers] empty response for ${id}, skipping`);
        continue;
      }
      await writeMdx(
        target,
        {
          objectiveId: obj.id,
          taskSlug: task.slug,
          kind: "explained",
          title: task.title,
          source: "claude",
          sourceUrl: task.officialUrl,
          license: "original",
          order: 1,
          estMinutes: 10,
        },
        body,
      );
      written++;
    }
  }

  console.log(`[seed:explainers] done — written=${written} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

```json
"seed:explainers": "tsx scripts/seed-explainers.ts",
```

- [ ] **Step 3: Dry-run on a single task to verify** (requires API key set)

```bash
npm run seed:explainers -- --task 3/kv-v2
```

Expected: writes `content/domains/3-secrets/kv-v2/explained.mdx` with real Claude output. Inspect it.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-explainers.ts package.json
git commit -m "feat: batch explainer generator using Anthropic API"
```

---

### Task 42: Content validator

**Files:**

- Create: `scripts/validate-content.ts`

- [ ] **Step 1: Create**

```ts
#!/usr/bin/env tsx
/**
 * Validates content/ against the spec:
 *   - every task has explained.mdx
 *   - every frontmatter passes FrontmatterSchema
 *   - sourceUrl is non-empty for non-claude sources
 *   - (objectiveId, taskSlug) pairs are unique
 */
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { FrontmatterSchema } from "@/lib/content/frontmatter";
import { CONTENT_ROOT } from "./ingest/_lib";

interface ObjectiveIndex {
  id: string;
  slug: string;
  tasks: { slug: string; title: string }[];
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const index = JSON.parse(
    await fs.readFile(path.join(CONTENT_ROOT, "_index", "objectives.json"), "utf8"),
  ) as ObjectiveIndex[];

  const seen = new Set<string>();
  for (const obj of index) {
    for (const task of obj.tasks) {
      const id = `${obj.id}/${task.slug}`;
      if (seen.has(id)) errors.push(`Duplicate task id: ${id}`);
      seen.add(id);
      const dir = path.join(CONTENT_ROOT, "domains", `${obj.id}-${obj.slug}`, task.slug);
      for (const kind of ["explained", "notes", "lab"]) {
        const file = path.join(dir, `${kind}.mdx`);
        try {
          const raw = await fs.readFile(file, "utf8");
          const { data } = matter(raw);
          const parsed = FrontmatterSchema.safeParse(data);
          if (!parsed.success) {
            errors.push(`${file}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
          }
        } catch (err) {
          if (kind === "explained") errors.push(`${file}: missing explained.mdx`);
        }
      }
    }
  }
  return errors;
}

async function main() {
  const errors = await validate();
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\n${errors.length} content error(s)`);
    process.exit(1);
  }
  console.log("✓ content valid");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm script**

```json
"content:validate": "tsx scripts/validate-content.ts",
```

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-content.ts package.json
git commit -m "feat: content validator enforcing explainer presence and frontmatter shape"
```

---

## PHASE 9 — Docker deployment

### Task 43: Dockerfile

**Files:**

- Create: `Dockerfile`, `.dockerignore`

- [ ] **Step 1: `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20

# --- deps ---
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# --- builder ---
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- runner ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
RUN apk add --no-cache wget openssl

COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma

USER app
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
```

- [ ] **Step 2: `.dockerignore`**

```
.git
.next
node_modules
data
content
tests
docs
.superpowers
*.log
.env.local
playwright-report
test-results
coverage
```

- [ ] **Step 3: Modify `next.config.mjs` to emit standalone output**

Open `next.config.mjs` and add:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Modify `next.config.mjs` to include MDX pages if needed**

(Skip — we use next-mdx-remote, not page-level MDX.)

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore next.config.mjs
git commit -m "feat: multi-stage Dockerfile with standalone Next output"
```

---

### Task 44: docker-compose.yml

**Files:**

- Create: `docker-compose.yml`

- [ ] **Step 1: Create**

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
      CONTENT_ROOT: "/app/content"
      NODE_ENV: production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

- [ ] **Step 2: Build and run**

```bash
docker compose build
docker compose up -d
```

Expected: container starts. Wait ~15s.

- [ ] **Step 3: Verify**

```bash
curl -sS http://localhost:3000/api/health
```

Expected: `{"status":"ok","checks":{"db":true,"content":true}}` (assuming `./content/` has real data; otherwise `content:false`).

- [ ] **Step 4: Tear down**

```bash
docker compose down
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: docker-compose with single service and bind-mount volumes"
```

---

## PHASE 10 — E2E (Playwright)

### Task 45: Playwright configuration

**Files:**

- Create: `playwright.config.ts`

- [ ] **Step 1: Install browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: Playwright config with auto-spawned dev server"
```

---

### Task 46: E2E smoke tests

**Files:**

- Create: `tests/e2e/landing.spec.ts`, `tests/e2e/task-reading.spec.ts`, `tests/e2e/progress-tracking.spec.ts`, `tests/e2e/notes.spec.ts`, `tests/e2e/keyboard-shortcuts.spec.ts`

- [ ] **Step 1: `tests/e2e/landing.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("dashboard renders and shows at least one objective", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await expect(page.getByText(/Objetivo \d+/).first()).toBeVisible();
});
```

- [ ] **Step 2: `tests/e2e/task-reading.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("task view loads and tabs switch", async ({ page }) => {
  await page.goto("/domains/secrets/kv-v2");
  await expect(page.getByRole("heading", { name: /KV v2/i })).toBeVisible();
  await page.getByRole("tab", { name: /Notas técnicas/i }).click();
  await expect(page.getByText(/Notas técnicas KV v2/)).toBeVisible();
});
```

- [ ] **Step 3: `tests/e2e/progress-tracking.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("advancing status persists across reload", async ({ page }) => {
  await page.goto("/domains/secrets/kv-v2");
  await page.getByRole("button", { name: /No empezado|Leyendo|Revisado|Dominado/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /Leyendo|Revisado|Dominado/ })).toBeVisible();
});
```

- [ ] **Step 4: `tests/e2e/notes.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("notes autosave and persist", async ({ page }) => {
  await page.goto("/domains/secrets/kv-v2");
  const editor = page.locator("#note-editor");
  await editor.fill("nota de prueba");
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator("#note-editor")).toHaveValue("nota de prueba");
});
```

- [ ] **Step 5: `tests/e2e/keyboard-shortcuts.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("keyboard shortcuts switch tabs", async ({ page }) => {
  await page.goto("/domains/secrets/kv-v2");
  await page.keyboard.press("2");
  await expect(page.getByRole("tab", { name: /Notas técnicas/i })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
```

- [ ] **Step 6: Run all e2e tests locally**

Ensure `./content/` contains the fixture data (copy from `tests/fixtures/sample-content/` if you removed it earlier).

```bash
npm run test:e2e
```

Expected: all 5 specs PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/
git commit -m "test: e2e smoke tests for dashboard, tabs, progress, notes, keyboard"
```

---

## PHASE 11 — Docs and bootstrap

### Task 47: README with bootstrap instructions

**Files:**

- Create: `README.md`

- [ ] **Step 1: Create**

````markdown
# Vault Training

Local-first study interface for the HashiCorp Vault Associate (003) certification.

## Prerequisites

- Node 20+
- Docker 24+ with Compose
- An Anthropic API key (only needed for generating explainers)

## Bootstrap (first time)

```bash
git clone <this-repo> vault-training
cd vault-training
cp .env.example .env.local          # fill in ANTHROPIC_API_KEY
npm install

# Fetch and normalize content from the four upstream sources
npm run ingest:index
# Inspect the clones under node_modules/.ingest-cache/ and populate:
#   config/ismet-mapping.yaml
#   config/labs-mapping.yaml
npm run ingest:ismet
npm run ingest:labs

# Generate "for dummies" explainers in batch (requires API key)
npm run seed:explainers

# Validate the content tree before starting
npm run content:validate

# Launch
docker compose up -d
# open http://localhost:3000
```

## Day to day

```bash
docker compose up -d                 # when you want to study
docker compose down                  # optional when done
```

Progress and notes live in `./data/vault-training.db` (SQLite, bind-mounted to your host).

## Content refresh

```bash
npm run ingest:all
npm run seed:explainers              # skips tasks that already have an explainer
npm run content:validate
git commit -am "content: refresh"
```

Use `npm run seed:explainers -- --force` to regenerate everything, or `--task <objective>/<slug>` for a single task.

## Testing (optional, local)

```bash
npm run lint
npm test
npm run test:e2e
npm run content:validate
```

## File map

- `app/` — routes (App Router, server components by default)
- `components/` — UI components
- `lib/` — server-side libraries (Prisma, content loader, progress, notes)
- `scripts/` — host-side CLI ingestion and seeding
- `content/` — MDX content (gitignored until populated; commit once real)
- `data/` — SQLite database (gitignored)
- `docs/superpowers/specs/` — design spec
- `docs/superpowers/plans/` — this implementation plan
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with bootstrap, day-to-day, and refresh flows"
```

---

## PHASE 12 — Final verification

### Task 48: Full-stack smoke test

- [ ] **Step 1: Lint + typecheck**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Unit + integration tests**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Content validator**

```bash
npm run content:validate
```

Expected: `✓ content valid`.

- [ ] **Step 4: Docker end-to-end**

```bash
docker compose down -v
docker compose build
docker compose up -d
sleep 15
curl -sS http://localhost:3000/api/health
```

Expected: status ok with both checks true.

- [ ] **Step 5: E2E against the docker container**

Temporarily change Playwright's `baseURL` to `http://localhost:3000` (already is) and remove the `webServer` block if you want it to hit the docker instance instead of spawning dev. Then:

```bash
DOCKER_E2E=1 npx playwright test
```

(Or skip if you prefer to run e2e only against dev server.)

- [ ] **Step 6: Tear down**

```bash
docker compose down
```

- [ ] **Step 7: Final commit if any fixes were needed**

```bash
git status
# if changes:
git add -A && git commit -m "chore: final smoke-test fixes"
```

---

## Self-review notes

**Spec coverage audit:**

- §1 Purpose & scope → covered by overall plan (scope is v1; labs out of scope per Task 33 right-panel links out only).
- §2 Content sources → Task 38 (HashiCorp), Task 39 (ismet), Task 40 (btkrausen), Task 41 (Claude explainers).
- §3 Architecture → Task 1 (Next), Task 8 (Prisma/SQLite), Tasks 43/44 (Docker).
- §4 Content model → Task 8 (schema including `hidden`), Task 11 (frontmatter Zod), Task 13 (loader), Task 15 (seed with hidden handling), Task 16/17 (progress/notes libs).
- §5 Ingestion pipeline → Tasks 37-42, including `--force` and `--task` flags (Task 41).
- §6 UI specification → Tasks 23-36 (shell, sidebar, task view, tabs, right panel, review, notes, 404/error).
- §6.4 Keyboard shortcuts `j/k/1/2/3/n/m` → Task 32 (1/2/3 + m in TabSwitcher) and Task 34 (j/k/n via global hook). `/` palette is not implemented in this plan — noted as deferred.
- §6.5 States → Task 32 (tabs + status) and Task 33 (note editor "Guardando" state).
- §6.6 Accessibility → Task 4 (focus ring, skip link, reduced motion), Task 25 (aria-current), Task 30 (role=tablist).
- §7 Design system → Task 4 (tokens), Task 5 (fonts), Task 23 (status pill colors).
- §8 Deployment → Task 43 (Dockerfile), Task 44 (compose), Task 47 (README bootstrap).
- §9 Testing & quality → Tasks 11/13/15/16/17 (unit + seed integration), Task 22 (API integration), Tasks 45/46 (E2E), Task 42 (content linter). No CI — plan honors this.

**Deferred from plan (plan-time decisions noted in spec §10):**

- `/` command palette keyboard shortcut — not implemented in any task. Acceptable for v1; the spec lists it under §6.4 but doesn't make it a hard requirement.
- Light mode — deferred per spec §10.
- Below-768px mobile layout — deferred per spec §10.

**Known caveats to surface during execution:**

- Task 38 regex is heuristic; if HashiCorp restructures the page, the parser in `hashicorp-index.ts` must be updated manually. The script throws when it finds 0 objectives — this is intentional so the failure is loud.
- Tasks 39 and 40 require the author to populate `config/*-mapping.yaml` after the first clone. This is called out in each task and documented in the README.
- Task 41 defaults to `claude-opus-4-6`. A cheaper run can set `MODEL = "claude-sonnet-4-6"` in the script.

**Type consistency (spot-checked):**

- `Status` enum is imported from `@prisma/client` everywhere (Tasks 23, 32, 34, 36 - no hand-rolled string unions).
- `LoadedMdx` / `LoadedTask` types are defined in Task 13 and reused in Tasks 14, 31.
- `SidebarObjective` is defined in Task 25 and reused in Task 29's `lib/dashboard.ts`.
- API route shapes (`{ status }` for PATCH progress, `{ body }` for PUT notes) match the Zod `BodySchema` in Tasks 19/20 and the API integration test in Task 22.

---

**End of plan.** Total tasks: 48. Estimated total effort: 2-3 focused days for a single engineer familiar with Next.js/Prisma (scaffolding and UI dominate the time; ingestion scripts and mapping YAMLs are the main manual-work hotspots).
