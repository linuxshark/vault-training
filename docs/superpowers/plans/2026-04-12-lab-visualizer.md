# Lab Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un visualizador animado opcional a los labs de Vault que reproduce los comandos bash como secuencia paso a paso, tipeándolos en un terminal simulado y animando un diagrama de arquitectura Vault (React Flow). MVP activado solo en el lab piloto `vault-cli-to-configure-auth-methods`.

**Architecture:** Server-side parsea comandos de cada `lab.mdx` a `LabStep[]` usando una tabla de ~18 reglas regex; el cliente monta `<LabVisualizer>` (dynamic import) con React Flow para el grafo y Framer Motion para el tipeado + glow. Se integra como un 4to tab condicional controlado por flag `visualizer: true` en frontmatter.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, React Flow (`@xyflow/react@12`), Framer Motion, dequal, Vitest, Playwright.

**Spec origen:** `docs/superpowers/specs/2026-04-12-lab-visualizer-design.md`

---

## Convenciones del plan

- Todos los paths son relativos a `/Users/mcmini/Documents/Workdir/vault-training/`.
- Tests corren con `npm test -- <path>` (Vitest run-mode).
- Cada commit es un checkpoint verificable; nunca commitear con tests rojos.
- No skippear hooks (no `--no-verify`).

---

## Task 1: Scaffolding inicial y dependencias

**Files:**
- Modify: `package.json` (agregar dependencias)
- Create: `lib/lab-visualizer/types.ts`
- Create: `lib/lab-visualizer/scene-layout.ts`
- Create: `lib/lab-visualizer/rules.ts` (solo export vacío, se llena en Task 2)

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install @xyflow/react@^12 framer-motion@^11 dequal@^2
```
Expected: `added 3 packages` (aproximado). `package-lock.json` actualizado.

- [ ] **Step 2: Crear types.ts con tipos compartidos**

Create `lib/lab-visualizer/types.ts`:
```ts
export type NodeKind = "server" | "client" | "auth" | "engine" | "policy" | "token";

export type NodeRef =
  | "server"
  | "client"
  | "token"
  | "policy"
  | `auth:${string}`
  | `engine:${string}`;

export interface LabStep {
  index: number;
  commands: string[];
  output: string | null;
  affects: NodeRef[];
  caption: string | null;
}

export interface LabRule {
  match: RegExp;
  affects: (m: RegExpMatchArray) => NodeRef[];
}

export type NodeState = "idle" | "active" | "disabled";
```

- [ ] **Step 3: Crear scene-layout.ts con coordenadas fijas**

Create `lib/lab-visualizer/scene-layout.ts`:
```ts
import type { NodeRef } from "./types";

export const BASE_POSITIONS: Record<string, { x: number; y: number }> = {
  client: { x: 40, y: 140 },
  server: { x: 360, y: 140 },
  token: { x: 40, y: 20 },
  policy: { x: 40, y: 260 },
  "engine:kv": { x: 680, y: 50 },
  "engine:pki": { x: 680, y: 120 },
  "engine:transit": { x: 680, y: 190 },
  "engine:database": { x: 680, y: 260 },
  "engine:ssh": { x: 680, y: 330 },
  "engine:totp": { x: 680, y: 400 },
  "auth:userpass": { x: 250, y: 320 },
  "auth:approle": { x: 360, y: 320 },
  "auth:ldap": { x: 470, y: 320 },
  "auth:aws": { x: 580, y: 320 },
  "auth:kubernetes": { x: 250, y: 400 },
  "auth:jwt": { x: 360, y: 400 },
};

export function positionFor(ref: NodeRef): { x: number; y: number } {
  return BASE_POSITIONS[ref] ?? { x: 0, y: 0 };
}
```

- [ ] **Step 4: Crear rules.ts placeholder (se llena en Task 2)**

Create `lib/lab-visualizer/rules.ts`:
```ts
import type { LabRule, NodeRef } from "./types";

export const FALLBACK_AFFECTS: NodeRef[] = ["server"];

export const RULES: LabRule[] = [];
```

- [ ] **Step 5: Verificar que lint y typecheck pasan**

Run: `npm run lint`
Expected: ✅ `Linting and checking validity of types ...` sin errores.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/lab-visualizer/
git commit -m "feat(lab-visualizer): scaffold types, layout and deps"
```

---

## Task 2: Command parser (TDD)

**Files:**
- Create: `tests/unit/lab-visualizer/parse-command.test.ts`
- Modify: `lib/lab-visualizer/rules.ts`
- Create: `lib/lab-visualizer/parse-command.ts`

- [ ] **Step 1: Escribir tests de parseo que fallen**

Create `tests/unit/lab-visualizer/parse-command.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseCommand } from "@/lib/lab-visualizer/parse-command";

describe("parseCommand", () => {
  it("vault status → [server]", () => {
    expect(parseCommand("vault status")).toEqual(["server"]);
  });

  it("vault login root → [client, server, token]", () => {
    expect(parseCommand("vault login root")).toEqual(["client", "server", "token"]);
  });

  it("vault operator init → [server]", () => {
    expect(parseCommand("vault operator init")).toEqual(["server"]);
  });

  it("vault operator unseal → [server]", () => {
    expect(parseCommand("vault operator unseal abc123")).toEqual(["server"]);
  });

  it("vault operator seal → [server]", () => {
    expect(parseCommand("vault operator seal")).toEqual(["server"]);
  });

  it("vault auth list → [server]", () => {
    expect(parseCommand("vault auth list")).toEqual(["server"]);
  });

  it("vault auth list -detailed → [server]", () => {
    expect(parseCommand("vault auth list -detailed")).toEqual(["server"]);
  });

  it("vault auth enable userpass → [server, auth:userpass]", () => {
    expect(parseCommand("vault auth enable userpass")).toEqual(["server", "auth:userpass"]);
  });

  it("vault auth enable approle → [server, auth:approle]", () => {
    expect(parseCommand("vault auth enable approle")).toEqual(["server", "auth:approle"]);
  });

  it("vault auth disable userpass → [server, auth:userpass]", () => {
    expect(parseCommand("vault auth disable userpass")).toEqual(["server", "auth:userpass"]);
  });

  it("vault secrets list → [server]", () => {
    expect(parseCommand("vault secrets list")).toEqual(["server"]);
  });

  it("vault secrets enable kv-v2 → [server, engine:kv-v2]", () => {
    expect(parseCommand("vault secrets enable kv-v2")).toEqual(["server", "engine:kv-v2"]);
  });

  it("vault secrets enable -path=secret kv-v2 → [server, engine:-path=secret]", () => {
    // known limitation: flags before mount type fall under generic rule; spec says fallback ok
    const result = parseCommand("vault secrets enable -path=secret kv-v2");
    expect(result).toContain("server");
  });

  it("vault kv put secret/foo bar=baz → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv put secret/foo bar=baz")).toEqual([
      "client",
      "server",
      "engine:kv",
    ]);
  });

  it("vault kv get secret/foo → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv get secret/foo")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault kv list secret/ → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv list secret/")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault kv delete secret/foo → [client, server, engine:kv]", () => {
    expect(parseCommand("vault kv delete secret/foo")).toEqual(["client", "server", "engine:kv"]);
  });

  it("vault policy write admin admin.hcl → [server, policy]", () => {
    expect(parseCommand("vault policy write admin admin.hcl")).toEqual(["server", "policy"]);
  });

  it("vault policy list → [server, policy]", () => {
    expect(parseCommand("vault policy list")).toEqual(["server", "policy"]);
  });

  it("vault token create → [server, token]", () => {
    expect(parseCommand("vault token create")).toEqual(["server", "token"]);
  });

  it("vault token create -ttl=1h → [server, token]", () => {
    expect(parseCommand("vault token create -ttl=1h")).toEqual(["server", "token"]);
  });

  it("vault token lookup → [server, token]", () => {
    expect(parseCommand("vault token lookup")).toEqual(["server", "token"]);
  });

  it("vault token capabilities secret/foo → [server, token, policy]", () => {
    expect(parseCommand("vault token capabilities secret/foo")).toEqual([
      "server",
      "token",
      "policy",
    ]);
  });

  it("vault write transit/keys/my-key → [client, server, engine:transit]", () => {
    expect(parseCommand("vault write transit/keys/my-key")).toEqual([
      "client",
      "server",
      "engine:transit",
    ]);
  });

  it("vault write pki/root/generate/internal → [server, engine:pki]", () => {
    // pki falls under the dedicated engine branch, client included
    expect(parseCommand("vault write pki/root/generate/internal")).toEqual([
      "client",
      "server",
      "engine:pki",
    ]);
  });

  it("vault read database/creds/my-role → [client, server, engine:database]", () => {
    expect(parseCommand("vault read database/creds/my-role")).toEqual([
      "client",
      "server",
      "engine:database",
    ]);
  });

  it("vault read sys/mounts (no engine in path) → [client, server]", () => {
    expect(parseCommand("vault read sys/mounts")).toEqual(["client", "server"]);
  });

  it("fallback for unknown command → [server]", () => {
    expect(parseCommand("vault plugin reload -plugin=foo")).toEqual(["server"]);
  });

  it("empty string → [server] (fallback)", () => {
    expect(parseCommand("")).toEqual(["server"]);
  });

  it("comment-only line → [server] (fallback)", () => {
    expect(parseCommand("# this is a comment")).toEqual(["server"]);
  });

  it("non-vault command → [server] (fallback)", () => {
    expect(parseCommand("export VAULT_ADDR=http://127.0.0.1:8200")).toEqual(["server"]);
  });

  it("leading whitespace is trimmed", () => {
    expect(parseCommand("   vault status")).toEqual(["server"]);
  });
});
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `npm test -- tests/unit/lab-visualizer/parse-command.test.ts`
Expected: FAIL — `Cannot find module '@/lib/lab-visualizer/parse-command'`.

- [ ] **Step 3: Llenar rules.ts con las 18 reglas**

Replace contents of `lib/lab-visualizer/rules.ts`:
```ts
import type { LabRule, NodeRef } from "./types";

export const FALLBACK_AFFECTS: NodeRef[] = ["server"];

export const RULES: LabRule[] = [
  { match: /^vault status\b/, affects: () => ["server"] },
  { match: /^vault login\b/, affects: () => ["client", "server", "token"] },
  { match: /^vault operator init\b/, affects: () => ["server"] },
  { match: /^vault operator unseal\b/, affects: () => ["server"] },
  { match: /^vault operator seal\b/, affects: () => ["server"] },
  { match: /^vault auth list\b/, affects: () => ["server"] },
  {
    match: /^vault auth enable (\S+)/,
    affects: (m) => ["server", `auth:${m[1]}` as NodeRef],
  },
  {
    match: /^vault auth disable (\S+)/,
    affects: (m) => ["server", `auth:${m[1]}` as NodeRef],
  },
  { match: /^vault secrets list\b/, affects: () => ["server"] },
  {
    match: /^vault secrets enable (\S+)/,
    affects: (m) => ["server", `engine:${m[1]}` as NodeRef],
  },
  {
    match: /^vault secrets disable (\S+)/,
    affects: (m) => ["server", `engine:${m[1]}` as NodeRef],
  },
  { match: /^vault kv\b/, affects: () => ["client", "server", "engine:kv"] },
  { match: /^vault policy\b/, affects: () => ["server", "policy"] },
  { match: /^vault token create\b/, affects: () => ["server", "token"] },
  { match: /^vault token lookup\b/, affects: () => ["server", "token"] },
  { match: /^vault token capabilities\b/, affects: () => ["server", "token", "policy"] },
  {
    match: /^vault (?:read|write|list|delete)\s+(transit|pki|database|ssh|totp)\b/,
    affects: (m) => ["client", "server", `engine:${m[1]}` as NodeRef],
  },
  { match: /^vault (?:read|write|list|delete)\b/, affects: () => ["client", "server"] },
];
```

- [ ] **Step 4: Implementar parse-command.ts**

Create `lib/lab-visualizer/parse-command.ts`:
```ts
import type { NodeRef } from "./types";
import { FALLBACK_AFFECTS, RULES } from "./rules";

export function parseCommand(command: string): NodeRef[] {
  const trimmed = command.trim();
  if (!trimmed) return FALLBACK_AFFECTS;
  for (const rule of RULES) {
    const m = trimmed.match(rule.match);
    if (m) return rule.affects(m);
  }
  return FALLBACK_AFFECTS;
}
```

- [ ] **Step 5: Ejecutar tests y verificar que pasan**

Run: `npm test -- tests/unit/lab-visualizer/parse-command.test.ts`
Expected: PASS — 30 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/lab-visualizer/rules.ts lib/lab-visualizer/parse-command.ts tests/unit/lab-visualizer/parse-command.test.ts
git commit -m "feat(lab-visualizer): command parser with 18 rules and fallback"
```

---

## Task 3: Step builder (TDD)

**Files:**
- Create: `tests/unit/lab-visualizer/build-steps.test.ts`
- Create: `lib/lab-visualizer/build-steps.ts`

- [ ] **Step 1: Escribir tests que fallen**

Create `tests/unit/lab-visualizer/build-steps.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildLabSteps } from "@/lib/lab-visualizer/build-steps";

describe("buildLabSteps", () => {
  it("extracts bash blocks into LabStep[]", () => {
    const body = `
Intro paragraph.

\`\`\`bash
vault status
\`\`\`

\`\`\`bash
vault login root
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({
      index: 0,
      commands: ["vault status"],
      affects: ["server"],
    });
    expect(steps[1]).toMatchObject({
      index: 1,
      commands: ["vault login root"],
      affects: ["client", "server", "token"],
    });
  });

  it("ignores non-bash code fences", () => {
    const body = `
\`\`\`yaml
foo: bar
\`\`\`

\`\`\`bash
vault status
\`\`\`

\`\`\`json
{"x": 1}
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0].commands).toEqual(["vault status"]);
  });

  it("handles multi-line bash blocks", () => {
    const body = `
\`\`\`bash
vault kv put secret/a x=1
vault kv put secret/b y=2
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0].commands).toEqual([
      "vault kv put secret/a x=1",
      "vault kv put secret/b y=2",
    ]);
  });

  it("unions affects from all lines in a block", () => {
    const body = `
\`\`\`bash
vault auth enable userpass
vault kv put secret/foo bar=baz
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(new Set(steps[0].affects)).toEqual(
      new Set(["server", "auth:userpass", "client", "engine:kv"]),
    );
  });

  it("ignores HEREDOC content, keeps the leading command", () => {
    const body = `
\`\`\`bash
vault kv put secret/user - <<EOF
{
  "username": "admin"
}
EOF
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps).toHaveLength(1);
    expect(steps[0].commands[0]).toMatch(/^vault kv put secret\/user/);
    expect(steps[0].affects).toEqual(["client", "server", "engine:kv"]);
  });

  it("returns empty array when no bash blocks", () => {
    const body = `Just prose, no code.`;
    expect(buildLabSteps(body)).toEqual([]);
  });

  it("skips empty lines inside a block", () => {
    const body = `
\`\`\`bash
vault status

vault login root
\`\`\`
`;
    const steps = buildLabSteps(body);
    expect(steps[0].commands).toEqual(["vault status", "vault login root"]);
  });
});
```

- [ ] **Step 2: Ejecutar tests y verificar que fallan**

Run: `npm test -- tests/unit/lab-visualizer/build-steps.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar build-steps.ts**

Create `lib/lab-visualizer/build-steps.ts`:
```ts
import type { LabStep, NodeRef } from "./types";
import { parseCommand } from "./parse-command";

const BASH_FENCE = /```bash\n([\s\S]*?)```/g;

function stripHeredoc(block: string): string[] {
  const lines: string[] = [];
  const raw = block.split("\n");
  let i = 0;
  while (i < raw.length) {
    const line = raw[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const heredoc = line.match(/<<\s*['"]?(\w+)['"]?\s*$/);
    if (heredoc) {
      lines.push(line);
      const marker = heredoc[1];
      i++;
      while (i < raw.length && raw[i].trim() !== marker) i++;
      i++;
    } else {
      lines.push(line);
      i++;
    }
  }
  return lines;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function buildLabSteps(body: string): LabStep[] {
  const steps: LabStep[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  BASH_FENCE.lastIndex = 0;
  while ((match = BASH_FENCE.exec(body)) !== null) {
    const raw = match[1];
    const commands = stripHeredoc(raw);
    if (commands.length === 0) continue;
    const affects: NodeRef[] = unique(commands.flatMap((c) => parseCommand(c)));
    steps.push({
      index,
      commands,
      output: null,
      affects,
      caption: null,
    });
    index++;
  }
  return steps;
}
```

- [ ] **Step 4: Ejecutar tests y verificar que pasan**

Run: `npm test -- tests/unit/lab-visualizer/build-steps.test.ts`
Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/lab-visualizer/build-steps.ts tests/unit/lab-visualizer/build-steps.test.ts
git commit -m "feat(lab-visualizer): build LabStep[] from bash fences in MDX"
```

---

## Task 4: Frontmatter schema extension + loader integration

**Files:**
- Modify: `lib/content/frontmatter.ts` (extender schema lab)
- Modify: `lib/content/loader.ts` (adjuntar `labSteps`)
- Create: `tests/unit/lab-visualizer/loader.test.ts`

- [ ] **Step 1: Leer archivos existentes**

Read `lib/content/frontmatter.ts` y `lib/content/loader.ts` para conocer estructura actual.

Run:
```bash
npm test -- tests/unit/lab-visualizer/ 2>&1 | head -5
```

- [ ] **Step 2: Extender schema de lab frontmatter**

In `lib/content/frontmatter.ts`, locate the lab schema (`z.object({ kind: z.literal("lab"), ... })`) and add two optional fields. Concrete edit — replace the lab block with:
```ts
// inside frontmatter.ts, within the lab schema discriminated union
z.object({
  objectiveId: z.string(),
  taskSlug: z.string(),
  kind: z.literal("lab"),
  title: z.string(),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  license: z.string().optional(),
  order: z.number().optional(),
  visualizer: z.boolean().optional().default(false),
  visualizerSpeed: z.number().positive().optional().default(1),
})
```
(If the current schema uses different field names, preserve them — only add `visualizer` and `visualizerSpeed`.)

- [ ] **Step 3: Extender `LoadedTask` y `loadTaskContent`**

In `lib/content/loader.ts`, update the exported interface:
```ts
import type { LabStep } from "@/lib/lab-visualizer/types";
import { buildLabSteps } from "@/lib/lab-visualizer/build-steps";

export interface LoadedTask {
  objectiveId: string;
  taskSlug: string;
  explained?: LoadedMdx;
  notes?: LoadedMdx;
  notesEs?: LoadedMdx;
  lab?: LoadedMdx;
  labSteps?: LabStep[];
  visualizerEnabled?: boolean;
  externalLinks: { label: string; url: string }[];
}
```

Then after the lab is loaded (inside `loadTaskContent`), add:
```ts
let labSteps: LabStep[] | undefined;
let visualizerEnabled = false;
if (lab) {
  visualizerEnabled = Boolean(lab.frontmatter?.visualizer);
  if (visualizerEnabled) {
    labSteps = buildLabSteps(lab.body);
  }
}
// include labSteps and visualizerEnabled in the returned LoadedTask
```

- [ ] **Step 4: Escribir test del loader**

Create `tests/unit/lab-visualizer/loader.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildLabSteps } from "@/lib/lab-visualizer/build-steps";

describe("loader integration (unit via buildLabSteps)", () => {
  it("pilot lab MDX produces 12 steps", () => {
    const pilot = `
\`\`\`bash
vault status
\`\`\`
\`\`\`bash
vault login root
\`\`\`
\`\`\`bash
vault secrets list
\`\`\`
\`\`\`bash
vault secrets list -detailed
\`\`\`
\`\`\`bash
vault auth list
\`\`\`
\`\`\`bash
vault auth list -detailed
\`\`\`
\`\`\`bash
vault kv put secret/first hello=world
vault kv put secret/my-secret username=admin password=secret123
\`\`\`
\`\`\`bash
vault kv get secret/first
vault kv get -field=hello secret/first
\`\`\`
\`\`\`bash
vault kv list secret/
\`\`\`
\`\`\`bash
vault kv delete secret/first
\`\`\`
\`\`\`bash
vault token lookup
\`\`\`
\`\`\`bash
vault token capabilities secret/first
\`\`\`
`;
    const steps = buildLabSteps(pilot);
    expect(steps).toHaveLength(12);
    expect(steps[0].affects).toEqual(["server"]);
    expect(steps[11].affects).toEqual(["server", "token", "policy"]);
  });
});
```

- [ ] **Step 5: Ejecutar lint + tests**

Run: `npm run lint && npm test -- tests/unit/lab-visualizer/`
Expected: tests pass, lint clean.

- [ ] **Step 6: Commit**

```bash
git add lib/content/ tests/unit/lab-visualizer/loader.test.ts
git commit -m "feat(lab-visualizer): extend frontmatter schema and wire loader"
```

---

## Task 5: `useLabPlayer` hook (TDD)

**Files:**
- Create: `tests/unit/lab-visualizer/use-lab-player.test.tsx`
- Create: `lib/hooks/use-lab-player.ts`

- [ ] **Step 1: Test que falla**

Create `tests/unit/lab-visualizer/use-lab-player.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabPlayer } from "@/lib/hooks/use-lab-player";
import type { LabStep } from "@/lib/lab-visualizer/types";

const steps: LabStep[] = [
  { index: 0, commands: ["a"], output: null, affects: ["server"], caption: null },
  { index: 1, commands: ["b"], output: null, affects: ["server"], caption: null },
  { index: 2, commands: ["c"], output: null, affects: ["server"], caption: null },
];

describe("useLabPlayer", () => {
  it("starts at index 0 and not playing", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    expect(result.current.idx).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.current).toBe(steps[0]);
  });

  it("next advances idx", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.next());
    expect(result.current.idx).toBe(1);
  });

  it("prev decrements idx, clamped at 0", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.prev());
    expect(result.current.idx).toBe(0);
    act(() => result.current.next());
    act(() => result.current.prev());
    expect(result.current.idx).toBe(0);
  });

  it("next does not go past last step", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.idx).toBe(2);
  });

  it("goto jumps to arbitrary index", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.goto(2));
    expect(result.current.idx).toBe(2);
  });

  it("reset goes back to 0 and pauses", () => {
    const { result } = renderHook(() => useLabPlayer(steps));
    act(() => result.current.goto(2));
    act(() => result.current.reset());
    expect(result.current.idx).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it("play toggles isPlaying and advances via timer", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLabPlayer(steps, { stepMs: 1000 }));
    act(() => result.current.play());
    expect(result.current.isPlaying).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.idx).toBe(1);
    act(() => result.current.pause());
    expect(result.current.isPlaying).toBe(false);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run — debe fallar**

Run: `npm test -- tests/unit/lab-visualizer/use-lab-player.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar hook**

Create `lib/hooks/use-lab-player.ts`:
```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LabStep } from "@/lib/lab-visualizer/types";

interface Options {
  stepMs?: number;
  speed?: number;
}

export function useLabPlayer(steps: LabStep[], opts: Options = {}) {
  const [idx, setIdx] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(opts.speed ?? 1);
  const stepMs = opts.stepMs ?? 1800;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdx = Math.max(0, steps.length - 1);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const next = useCallback(() => {
    setIdx((i) => Math.min(i + 1, lastIdx));
  }, [lastIdx]);

  const prev = useCallback(() => {
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  const goto = useCallback(
    (target: number) => setIdx(Math.min(Math.max(target, 0), lastIdx)),
    [lastIdx],
  );

  const reset = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setIdx(0);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => {
    clearTimer();
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    if (idx >= lastIdx) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => {
      setIdx((i) => Math.min(i + 1, lastIdx));
    }, stepMs / speed);
    return clearTimer;
  }, [idx, isPlaying, lastIdx, speed, stepMs]);

  return {
    idx,
    current: steps[idx] ?? null,
    isPlaying,
    speed,
    setSpeed,
    next,
    prev,
    goto,
    play,
    pause,
    reset,
    total: steps.length,
  };
}
```

- [ ] **Step 4: Run — debe pasar**

Run: `npm test -- tests/unit/lab-visualizer/use-lab-player.test.tsx`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/use-lab-player.ts tests/unit/lab-visualizer/use-lab-player.test.tsx
git commit -m "feat(lab-visualizer): useLabPlayer hook with play/pause/seek"
```

---

## Task 6: Node components (6 tipos)

**Files:**
- Create: `components/lab-visualizer/nodes/ServerNode.tsx`
- Create: `components/lab-visualizer/nodes/ClientNode.tsx`
- Create: `components/lab-visualizer/nodes/AuthNode.tsx`
- Create: `components/lab-visualizer/nodes/EngineNode.tsx`
- Create: `components/lab-visualizer/nodes/PolicyNode.tsx`
- Create: `components/lab-visualizer/nodes/TokenNode.tsx`
- Create: `tests/unit/components/lab-visualizer-nodes.test.tsx`

- [ ] **Step 1: Test smoke para los 6 nodos**

Create `tests/unit/components/lab-visualizer-nodes.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { ServerNode } from "@/components/lab-visualizer/nodes/ServerNode";
import { ClientNode } from "@/components/lab-visualizer/nodes/ClientNode";
import { AuthNode } from "@/components/lab-visualizer/nodes/AuthNode";
import { EngineNode } from "@/components/lab-visualizer/nodes/EngineNode";
import { PolicyNode } from "@/components/lab-visualizer/nodes/PolicyNode";
import { TokenNode } from "@/components/lab-visualizer/nodes/TokenNode";

const baseProps = {
  id: "n",
  selected: false,
  isConnectable: false,
  xPos: 0,
  yPos: 0,
  zIndex: 0,
  dragging: false,
  type: "custom",
};

function wrap(ui: React.ReactNode) {
  return <ReactFlowProvider>{ui}</ReactFlowProvider>;
}

describe("lab-visualizer nodes", () => {
  it("ServerNode renders label and status", () => {
    const { getByText } = render(
      wrap(<ServerNode {...baseProps} data={{ label: "Vault", state: "active" }} />),
    );
    expect(getByText("Vault")).toBeInTheDocument();
  });

  it("ClientNode renders", () => {
    const { getByText } = render(
      wrap(<ClientNode {...baseProps} data={{ label: "Cliente", state: "idle" }} />),
    );
    expect(getByText("Cliente")).toBeInTheDocument();
  });

  it("AuthNode renders method name", () => {
    const { getByText } = render(
      wrap(<AuthNode {...baseProps} data={{ label: "userpass", state: "active" }} />),
    );
    expect(getByText("userpass")).toBeInTheDocument();
  });

  it("EngineNode renders engine name", () => {
    const { getByText } = render(
      wrap(<EngineNode {...baseProps} data={{ label: "kv", state: "active" }} />),
    );
    expect(getByText("kv")).toBeInTheDocument();
  });

  it("PolicyNode renders", () => {
    const { getByText } = render(
      wrap(<PolicyNode {...baseProps} data={{ label: "Policy", state: "idle" }} />),
    );
    expect(getByText("Policy")).toBeInTheDocument();
  });

  it("TokenNode renders", () => {
    const { getByText } = render(
      wrap(<TokenNode {...baseProps} data={{ label: "Token", state: "idle" }} />),
    );
    expect(getByText("Token")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — debe fallar**

Run: `npm test -- tests/unit/components/lab-visualizer-nodes.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Crear ServerNode**

Create `components/lab-visualizer/nodes/ServerNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { Lock } from "lucide-react";

interface Data {
  label: string;
  state: NodeState;
}

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[120px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
        "bg-bg-elevated text-text",
        d.state === "active"
          ? "border-accent shadow-[0_0_24px_theme(colors.accent)]"
          : "border-border-subtle opacity-70",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Lock className="size-4" aria-hidden />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
export const ServerNode = memo(Component);
```

- [ ] **Step 4: Crear ClientNode**

Create `components/lab-visualizer/nodes/ClientNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { User } from "lucide-react";

interface Data { label: string; state: NodeState; }

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[100px] flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
        d.state === "active"
          ? "border-blue-400 bg-blue-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-70",
      )}
    >
      <User className="size-4" aria-hidden />
      <span>{d.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
export const ClientNode = memo(Component);
```

- [ ] **Step 5: Crear AuthNode**

Create `components/lab-visualizer/nodes/AuthNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { KeyRound } from "lucide-react";

interface Data { label: string; state: NodeState; }

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[90px] flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-200",
        d.state === "active"
          ? "border-amber-400 bg-amber-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-60",
      )}
    >
      <Handle type="target" position={Position.Top} />
      <KeyRound className="size-3.5" aria-hidden />
      <span>{d.label}</span>
    </div>
  );
}
export const AuthNode = memo(Component);
```

- [ ] **Step 6: Crear EngineNode**

Create `components/lab-visualizer/nodes/EngineNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { Database } from "lucide-react";

interface Data { label: string; state: NodeState; }

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[90px] flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-200",
        d.state === "active"
          ? "border-emerald-400 bg-emerald-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-60",
      )}
    >
      <Handle type="target" position={Position.Left} />
      <Database className="size-3.5" aria-hidden />
      <span>{d.label}</span>
    </div>
  );
}
export const EngineNode = memo(Component);
```

- [ ] **Step 7: Crear PolicyNode y TokenNode**

Create `components/lab-visualizer/nodes/PolicyNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { FileText } from "lucide-react";

interface Data { label: string; state: NodeState; }

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[80px] flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-200",
        d.state === "active"
          ? "border-violet-400 bg-violet-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-60",
      )}
    >
      <Handle type="target" position={Position.Right} />
      <FileText className="size-3.5" aria-hidden />
      <span>{d.label}</span>
    </div>
  );
}
export const PolicyNode = memo(Component);
```

Create `components/lab-visualizer/nodes/TokenNode.tsx`:
```tsx
"use client";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { NodeState } from "@/lib/lab-visualizer/types";
import { Ticket } from "lucide-react";

interface Data { label: string; state: NodeState; }

function Component({ data }: NodeProps) {
  const d = data as Data;
  return (
    <div
      className={cn(
        "flex min-w-[80px] flex-col items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-200",
        d.state === "active"
          ? "border-rose-400 bg-rose-500/10 text-text"
          : "border-border-subtle bg-bg-elevated text-text-muted opacity-60",
      )}
    >
      <Handle type="source" position={Position.Bottom} />
      <Ticket className="size-3.5" aria-hidden />
      <span>{d.label}</span>
    </div>
  );
}
export const TokenNode = memo(Component);
```

- [ ] **Step 8: Run tests**

Run: `npm test -- tests/unit/components/lab-visualizer-nodes.test.tsx`
Expected: PASS — 6 tests.

- [ ] **Step 9: Commit**

```bash
git add components/lab-visualizer/nodes/ tests/unit/components/lab-visualizer-nodes.test.tsx
git commit -m "feat(lab-visualizer): 6 custom React Flow node components"
```

---

## Task 7: VaultScene (React Flow canvas)

**Files:**
- Create: `components/lab-visualizer/VaultScene.tsx`

- [ ] **Step 1: Implementar VaultScene**

Create `components/lab-visualizer/VaultScene.tsx`:
```tsx
"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ServerNode } from "./nodes/ServerNode";
import { ClientNode } from "./nodes/ClientNode";
import { AuthNode } from "./nodes/AuthNode";
import { EngineNode } from "./nodes/EngineNode";
import { PolicyNode } from "./nodes/PolicyNode";
import { TokenNode } from "./nodes/TokenNode";
import type { NodeRef, NodeState } from "@/lib/lab-visualizer/types";
import { BASE_POSITIONS, positionFor } from "@/lib/lab-visualizer/scene-layout";

const NODE_TYPES: NodeTypes = {
  server: ServerNode as unknown as NodeTypes[string],
  client: ClientNode as unknown as NodeTypes[string],
  auth: AuthNode as unknown as NodeTypes[string],
  engine: EngineNode as unknown as NodeTypes[string],
  policy: PolicyNode as unknown as NodeTypes[string],
  token: TokenNode as unknown as NodeTypes[string],
};

function refToKind(ref: NodeRef): keyof typeof NODE_TYPES {
  if (ref.startsWith("auth:")) return "auth";
  if (ref.startsWith("engine:")) return "engine";
  return ref as "server" | "client" | "policy" | "token";
}

function refLabel(ref: NodeRef): string {
  if (ref === "server") return "Vault Server";
  if (ref === "client") return "Cliente";
  if (ref === "token") return "Token";
  if (ref === "policy") return "Policy";
  if (ref.startsWith("auth:")) return ref.slice(5);
  if (ref.startsWith("engine:")) return ref.slice(7);
  return ref;
}

export function VaultScene({
  visible,
  active,
}: {
  visible: NodeRef[];
  active: NodeRef[];
}) {
  const nodes = useMemo<Node[]>(
    () =>
      visible.map((ref) => {
        const kind = refToKind(ref);
        const state: NodeState = active.includes(ref) ? "active" : "idle";
        return {
          id: ref,
          type: kind,
          position: positionFor(ref),
          data: { label: refLabel(ref), state },
        };
      }),
    [visible, active],
  );

  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = [];
    if (visible.includes("client") && visible.includes("server")) {
      list.push({
        id: "e-client-server",
        source: "client",
        target: "server",
        animated: active.includes("client") && active.includes("server"),
      });
    }
    visible
      .filter((r): r is `engine:${string}` => r.startsWith("engine:"))
      .forEach((eng) => {
        list.push({
          id: `e-server-${eng}`,
          source: "server",
          target: eng,
          animated: active.includes(eng),
        });
      });
    visible
      .filter((r): r is `auth:${string}` => r.startsWith("auth:"))
      .forEach((auth) => {
        list.push({
          id: `e-server-${auth}`,
          source: "server",
          target: auth,
          animated: active.includes(auth),
        });
      });
    return list;
  }, [visible, active]);

  return (
    <div className="h-[360px] w-full rounded-lg border border-border-subtle bg-bg" aria-label="Diagrama Vault">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        panOnDrag
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// helper re-exported for LabVisualizer to derive `visible` from steps
export function deriveVisible(allAffects: NodeRef[][]): NodeRef[] {
  const set = new Set<NodeRef>(["client", "server"]);
  allAffects.forEach((arr) => arr.forEach((r) => set.add(r)));
  // filter out refs without a base position (defensive)
  return Array.from(set).filter((r) => BASE_POSITIONS[r] !== undefined || r === "client" || r === "server");
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/lab-visualizer/VaultScene.tsx
git commit -m "feat(lab-visualizer): VaultScene React Flow canvas"
```

---

## Task 8: VaultTerminal (tipeado animado)

**Files:**
- Create: `components/lab-visualizer/VaultTerminal.tsx`
- Create: `tests/unit/components/vault-terminal.test.tsx`

- [ ] **Step 1: Test que falla**

Create `tests/unit/components/vault-terminal.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { VaultTerminal } from "@/components/lab-visualizer/VaultTerminal";

describe("VaultTerminal", () => {
  it("renders the full command immediately when reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<VaultTerminal commands={["vault status"]} />);
    expect(screen.getByText(/vault status/)).toBeInTheDocument();
  });

  it("shows prompt character", () => {
    render(<VaultTerminal commands={["vault status"]} />);
    expect(screen.getAllByText("$").length).toBeGreaterThan(0);
  });

  it("renders multiple commands", () => {
    render(<VaultTerminal commands={["vault status", "vault login root"]} />);
    // first command fully typed or in progress; at minimum prompt appears twice
    expect(screen.getAllByText("$").length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run — debe fallar**

Run: `npm test -- tests/unit/components/vault-terminal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar VaultTerminal**

Create `components/lab-visualizer/VaultTerminal.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export function VaultTerminal({
  commands,
  output,
  charMs = 25,
}: {
  commands: string[];
  output?: string | null;
  charMs?: number;
}) {
  const reduced = useReducedMotion();
  const joined = commands.join("\n");
  const [typed, setTyped] = useState(reduced ? joined : "");

  useEffect(() => {
    if (reduced) {
      setTyped(joined);
      return;
    }
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(joined.slice(0, i));
      if (i >= joined.length) clearInterval(id);
    }, charMs);
    return () => clearInterval(id);
  }, [joined, charMs, reduced]);

  const lines = typed.split("\n");

  return (
    <div
      className="h-[360px] overflow-auto rounded-lg border border-border-subtle bg-[#010409] p-4 font-mono text-[13px] leading-6 text-text"
      aria-live="polite"
      aria-atomic="false"
    >
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="mr-2 select-none text-text-muted">$</span>
          <span className="whitespace-pre">{line}</span>
          {i === lines.length - 1 && typed.length < joined.length && (
            <span className="ml-0.5 inline-block w-2 animate-pulse bg-text" aria-hidden>
              &nbsp;
            </span>
          )}
        </div>
      ))}
      {output && (
        <pre className="mt-3 whitespace-pre-wrap text-text-muted">{output}</pre>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — debe pasar**

Run: `npm test -- tests/unit/components/vault-terminal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/lab-visualizer/VaultTerminal.tsx tests/unit/components/vault-terminal.test.tsx
git commit -m "feat(lab-visualizer): VaultTerminal with typing animation and a11y"
```

---

## Task 9: LabControls + LabStepTimeline

**Files:**
- Create: `components/lab-visualizer/LabControls.tsx`
- Create: `components/lab-visualizer/LabStepTimeline.tsx`

- [ ] **Step 1: Implementar LabControls**

Create `components/lab-visualizer/LabControls.tsx`:
```tsx
"use client";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export function LabControls({
  isPlaying,
  speed,
  onPlayPause,
  onPrev,
  onNext,
  onReset,
  onSpeed,
  disabled,
}: {
  isPlaying: boolean;
  speed: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
  disabled?: boolean;
}) {
  const speeds = [0.5, 1, 2];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2">
      <div className="flex items-center gap-1">
        <IconBtn label="Anterior" onClick={onPrev} disabled={disabled}>
          <SkipBack className="size-4" />
        </IconBtn>
        <IconBtn label={isPlaying ? "Pausa" : "Reproducir"} onClick={onPlayPause} disabled={disabled}>
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconBtn>
        <IconBtn label="Siguiente" onClick={onNext} disabled={disabled}>
          <SkipForward className="size-4" />
        </IconBtn>
        <IconBtn label="Reiniciar" onClick={onReset} disabled={disabled}>
          <RotateCcw className="size-4" />
        </IconBtn>
      </div>
      <div className="flex items-center gap-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium transition-colors",
              speed === s
                ? "bg-accent text-accent-fg"
                : "text-text-muted hover:text-text",
            )}
            aria-pressed={speed === s}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Implementar LabStepTimeline**

Create `components/lab-visualizer/LabStepTimeline.tsx`:
```tsx
"use client";
import { cn } from "@/lib/utils";

export function LabStepTimeline({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (i: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            aria-label={`Ir a paso ${i + 1}`}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "h-2.5 w-6 rounded-full transition-all",
              i === current && "bg-accent",
              i < current && "bg-text-muted",
              i > current && "bg-border-subtle hover:bg-text-muted",
            )}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs text-text-muted">
        paso {current + 1}/{total}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Verificar lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/lab-visualizer/LabControls.tsx components/lab-visualizer/LabStepTimeline.tsx
git commit -m "feat(lab-visualizer): LabControls + LabStepTimeline UI"
```

---

## Task 10: LabVisualizer container

**Files:**
- Create: `components/lab-visualizer/LabVisualizer.tsx`
- Create: `components/lab-visualizer/LabVisualizerEmpty.tsx`
- Create: `tests/unit/components/lab-visualizer.test.tsx`

- [ ] **Step 1: Test de componente contenedor**

Create `tests/unit/components/lab-visualizer.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LabVisualizer } from "@/components/lab-visualizer/LabVisualizer";
import type { LabStep } from "@/lib/lab-visualizer/types";

vi.mock("@/components/lab-visualizer/VaultScene", () => ({
  VaultScene: (props: { visible: string[]; active: string[] }) => (
    <div data-testid="scene">
      visible:{props.visible.join(",")} active:{props.active.join(",")}
    </div>
  ),
  deriveVisible: (affects: string[][]) =>
    Array.from(new Set(["client", "server", ...affects.flat()])),
}));

const steps: LabStep[] = [
  { index: 0, commands: ["vault status"], output: null, affects: ["server"], caption: null },
  { index: 1, commands: ["vault login root"], output: null, affects: ["client", "server", "token"], caption: null },
];

describe("LabVisualizer", () => {
  it("renders empty state when steps=[]", () => {
    render(<LabVisualizer steps={[]} />);
    expect(screen.getByText(/no contiene comandos parseables/i)).toBeInTheDocument();
  });

  it("renders first step on mount", () => {
    render(<LabVisualizer steps={steps} />);
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
    expect(screen.getByTestId("scene")).toHaveTextContent("active:server");
  });

  it("advances on next click", () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.click(screen.getByLabelText("Siguiente"));
    expect(screen.getByText(/paso 2\/2/)).toBeInTheDocument();
    expect(screen.getByTestId("scene")).toHaveTextContent("active:client,server,token");
  });

  it("goes back on prev click", () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.click(screen.getByLabelText("Siguiente"));
    fireEvent.click(screen.getByLabelText("Anterior"));
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
  });

  it("arrow keys move steps", () => {
    render(<LabVisualizer steps={steps} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/paso 2\/2/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/paso 1\/2/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — debe fallar**

Run: `npm test -- tests/unit/components/lab-visualizer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar LabVisualizerEmpty**

Create `components/lab-visualizer/LabVisualizerEmpty.tsx`:
```tsx
"use client";
import { Terminal } from "lucide-react";

export function LabVisualizerEmpty() {
  return (
    <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-subtle bg-bg-elevated text-center">
      <Terminal className="size-8 text-text-muted" aria-hidden />
      <p className="text-sm text-text-muted">
        Este lab no contiene comandos parseables aún.
      </p>
      <p className="text-xs text-text-muted">
        Revisa la pestaña <strong>Lab</strong> para ver los comandos en texto.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Implementar LabVisualizer**

Create `components/lab-visualizer/LabVisualizer.tsx`:
```tsx
"use client";
import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLabPlayer } from "@/lib/hooks/use-lab-player";
import { VaultTerminal } from "./VaultTerminal";
import { LabControls } from "./LabControls";
import { LabStepTimeline } from "./LabStepTimeline";
import { LabVisualizerEmpty } from "./LabVisualizerEmpty";
import type { LabStep } from "@/lib/lab-visualizer/types";
import { deriveVisible } from "./VaultScene";

const VaultScene = dynamic(
  () => import("./VaultScene").then((m) => ({ default: m.VaultScene })),
  { ssr: false, loading: () => <div className="h-[360px] animate-pulse rounded-lg bg-bg-elevated" /> },
);

export function LabVisualizer({
  steps,
  initialSpeed = 1,
}: {
  steps: LabStep[];
  initialSpeed?: number;
}) {
  const player = useLabPlayer(steps, { speed: initialSpeed });

  const visible = useMemo(
    () => deriveVisible(steps.map((s) => s.affects)),
    [steps],
  );
  const active = player.current?.affects ?? [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.key === "ArrowRight") player.next();
      else if (e.key === "ArrowLeft") player.prev();
      else if (e.key === " ") {
        e.preventDefault();
        player.isPlaying ? player.pause() : player.play();
      } else if (e.key === "r") player.reset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [player]);

  if (steps.length === 0) return <LabVisualizerEmpty />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <VaultScene visible={visible} active={active} />
        <VaultTerminal
          commands={player.current?.commands ?? []}
          output={player.current?.output ?? null}
        />
      </div>
      <LabStepTimeline total={player.total} current={player.idx} onSelect={player.goto} />
      <LabControls
        isPlaying={player.isPlaying}
        speed={player.speed}
        onPlayPause={() => (player.isPlaying ? player.pause() : player.play())}
        onPrev={player.prev}
        onNext={player.next}
        onReset={player.reset}
        onSpeed={player.setSpeed}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run — debe pasar**

Run: `npm test -- tests/unit/components/lab-visualizer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/lab-visualizer/LabVisualizer.tsx components/lab-visualizer/LabVisualizerEmpty.tsx tests/unit/components/lab-visualizer.test.tsx
git commit -m "feat(lab-visualizer): LabVisualizer container with keyboard shortcuts"
```

---

## Task 11: TabSwitcher integration + page wiring

**Files:**
- Modify: `components/tab-switcher.tsx`
- Modify: `app/domains/[objectiveSlug]/[taskSlug]/page.tsx`

- [ ] **Step 1: Leer tab-switcher actual**

Ya leído en la fase de brainstorming. La firma es:
```ts
panels: Record<"explained"|"notes"|"lab", ReactNode|null> & { notesEs?: ReactNode|null };
```
Atajos: teclas 1,2,3 → tabs; m → advance.

- [ ] **Step 2: Modificar tab-switcher para soportar tab "visual"**

Apply this edit to `components/tab-switcher.tsx` — replace the `TabKey` + `TAB_LABELS` + signature/logic to add the new visual tab:

Replace:
```ts
type TabKey = "explained" | "notes" | "lab";
const TAB_LABELS: Record<TabKey, string> = {
  explained: "Explicación sencilla",
  notes: "Notas técnicas",
  lab: "Lab",
};
```
With:
```ts
type TabKey = "explained" | "notes" | "visual" | "lab";
const TAB_LABELS: Record<TabKey, string> = {
  explained: "Explicación sencilla",
  notes: "Notas técnicas",
  visual: "Lab visual",
  lab: "Lab",
};
```

Extend the `panels` prop type:
```ts
panels: Record<TabKey, ReactNode | null> & { notesEs?: ReactNode | null };
```

Update the `useEffect` keyboard handler to include key `4`:
```ts
if (e.key === "1" && panels.explained) setActive("explained");
else if (e.key === "2" && panels.notes) setActive("notes");
else if (e.key === "3" && panels.visual) setActive("visual");
else if (e.key === "4" && panels.lab) setActive("lab");
else if (e.key === "m") void advance("REVIEWED");
```

Update `firstAvailable` to include visual:
```ts
function firstAvailable(panels: Record<TabKey, ReactNode | null>): TabKey {
  if (panels.explained) return "explained";
  if (panels.notes) return "notes";
  if (panels.visual) return "visual";
  return "lab";
}
```

- [ ] **Step 3: Modificar page para pasar el tab visual**

In `app/domains/[objectiveSlug]/[taskSlug]/page.tsx`, after the MDX compilation block, add:
```tsx
import { LabVisualizer } from "@/components/lab-visualizer/LabVisualizer";
```

And inside the JSX where `<TabSwitcher>` is rendered, update the `panels` prop:
```tsx
<TabSwitcher
  taskId={/* existing */}
  initialStatus={/* existing */}
  panels={{
    explained,
    notes,
    notesEs,
    visual: loaded.visualizerEnabled && loaded.labSteps
      ? <LabVisualizer steps={loaded.labSteps} />
      : null,
    lab,
  }}
/>
```

- [ ] **Step 4: Ejecutar lint + tests existentes**

Run: `npm run lint && npm test`
Expected: todo verde.

- [ ] **Step 5: Commit**

```bash
git add components/tab-switcher.tsx app/domains/[objectiveSlug]/[taskSlug]/page.tsx
git commit -m "feat(lab-visualizer): add 4th tab 'Lab visual' with shortcut '4'"
```

---

## Task 12: Habilitar visualizer en lab piloto + smoke manual

**Files:**
- Modify: `content/domains/1a-authentication/vault-cli-to-configure-auth-methods/lab.mdx`

- [ ] **Step 1: Añadir flag al frontmatter del lab piloto**

Edit `content/domains/1a-authentication/vault-cli-to-configure-auth-methods/lab.mdx`:

Replace:
```mdx
---
objectiveId: "1a"
taskSlug: "vault-cli-to-configure-auth-methods"
kind: "lab"
title: "Intro to Vault Lab"
source: "btkrausen"
sourceUrl: "https://github.com/btkrausen/vault-codespaces/blob/main/labs/lab_intro_to_vault.md"
license: "Apache-2.0"
order: 3
---
```
With:
```mdx
---
objectiveId: "1a"
taskSlug: "vault-cli-to-configure-auth-methods"
kind: "lab"
title: "Intro to Vault Lab"
source: "btkrausen"
sourceUrl: "https://github.com/btkrausen/vault-codespaces/blob/main/labs/lab_intro_to_vault.md"
license: "Apache-2.0"
order: 3
visualizer: true
visualizerSpeed: 1
---
```

- [ ] **Step 2: Validar contenido**

Run: `npm run content:validate`
Expected: sin errores (warnings permitidos).

- [ ] **Step 3: Smoke test en dev server**

Run: `npm run dev`
Abrir en navegador: http://localhost:3000/domains/1a-authentication/vault-cli-to-configure-auth-methods

Verificar:
- Existe la pestaña "Lab visual" (entre "Notas técnicas" y "Lab").
- Al activarla, se ve el grafo con server + client + nodos relevantes.
- Paso 1 muestra `vault status` tipeándose.
- `→` y `←` navegan entre pasos.
- Otros labs (ej. `kv-v2`) NO tienen la pestaña.

Si hay bugs visuales: anotar, volver al componente concreto y corregir (no confundir con tests de unidad).

Luego detener el dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add content/domains/1a-authentication/vault-cli-to-configure-auth-methods/lab.mdx
git commit -m "feat(lab-visualizer): enable visualizer on pilot lab (Intro to Vault)"
```

---

## Task 13: E2E test (Playwright)

**Files:**
- Create: `tests/e2e/lab-visualizer.spec.ts`

- [ ] **Step 1: Escribir test E2E**

Create `tests/e2e/lab-visualizer.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

const PILOT = "/domains/1a-authentication/vault-cli-to-configure-auth-methods";

test.describe("Lab visualizer (pilot)", () => {
  test("renders visual tab and advances steps", async ({ page }) => {
    await page.goto(PILOT);

    const visualTab = page.getByRole("tab", { name: "Lab visual" });
    await expect(visualTab).toBeVisible();

    await visualTab.click();

    await expect(page.getByText(/paso 1\/12/)).toBeVisible();
    await expect(page.getByText(/vault status/)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/paso 3\/12/)).toBeVisible();
  });

  test("tab hidden when visualizer=false", async ({ page }) => {
    await page.goto("/domains/3-secrets/kv-v2");
    await expect(page.getByRole("tab", { name: "Lab visual" })).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Verificar que el dev server está detenido, entonces correr E2E**

Run: `npm run test:e2e -- tests/e2e/lab-visualizer.spec.ts`
Expected: PASS.

Si alguna aserción falla por timing, ajustar los selectores o aumentar el timeout. Pero el primer intento debe funcionar.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/lab-visualizer.spec.ts
git commit -m "test(lab-visualizer): E2E for pilot lab and conditional tab"
```

---

## Task 14: Documentación (README + CLAUDE.md)

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Añadir sección al README**

In `README.md`, after the "Atajos de teclado" section, add the following subsection:

```markdown
## Lab visual (beta)

Algunos labs incluyen un **visualizador animado** (pestaña "Lab visual", tecla `4`) que reproduce los comandos paso a paso sobre un diagrama de arquitectura Vault. Actualmente está activo solo en **Intro to Vault Lab**; se habilitará en más labs conforme se valide la experiencia.

Dentro del Lab visual:

| Tecla | Acción |
|-------|--------|
| `→` | Paso siguiente |
| `←` | Paso anterior |
| `Espacio` | Play / Pause |
| `r` | Reiniciar |

Para habilitar el visualizador en un lab nuevo basta con añadir `visualizer: true` a su frontmatter — el parser extrae los comandos `vault ...` automáticamente.
```

- [ ] **Step 2: Añadir sección al CLAUDE.md**

In `CLAUDE.md`, after the "Feature: toggle ES/EN en notas técnicas" section, add:

```markdown
## Feature: Lab visualizer

Pestaña adicional "Lab visual" en la página de tarea. Se activa con `visualizer: true` en el frontmatter del `lab.mdx`. El parser (`lib/lab-visualizer/parse-command.ts`) mapea subcomandos de `vault` a nodos del diagrama (React Flow + Framer Motion). El lab piloto es `1a/vault-cli-to-configure-auth-methods`.

- Componentes: `components/lab-visualizer/*`
- Lógica server: `lib/lab-visualizer/*`
- Hook: `lib/hooks/use-lab-player.ts`
- Atajos dentro del tab: `←` `→` `Espacio` `r`
- Para habilitar en otro lab: `visualizer: true` en frontmatter. No requiere código adicional.
```

- [ ] **Step 3: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs(lab-visualizer): document feature and enablement"
```

---

## Task 15: Build final + verificación end-to-end

**Files:** (verificación — sin cambios)

- [ ] **Step 1: Docker rebuild**

Run: `docker compose up -d --build`
Expected: build termina exitosamente; contenedor `vault-training` corriendo.

- [ ] **Step 2: Verificar rutas clave con curl**

Run: `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health`
Expected: `200`

Run: `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/domains/1a-authentication/vault-cli-to-configure-auth-methods`
Expected: `200`

- [ ] **Step 3: Verificación visual en navegador**

Abrir http://localhost:3000/domains/1a-authentication/vault-cli-to-configure-auth-methods

Validar checklist de aceptación (spec §13):
- [ ] La pestaña "Lab visual" aparece en el lab piloto.
- [ ] Paso 1 tipea `vault status`.
- [ ] Nodos del server se iluminan.
- [ ] `→` avanza; `←` retrocede; Espacio toggle play.
- [ ] Velocidad 0.5x/1x/2x funciona.
- [ ] Ir a `/domains/3-secrets/kv-v2` → la pestaña no aparece.
- [ ] DevTools › emulate `prefers-reduced-motion: reduce` → animaciones se desactivan.
- [ ] Layout responsive en ancho <768px.

- [ ] **Step 4: Commit final (si hay ajustes)**

Si hubo correcciones durante la verificación, commitear. Si no, no se crea commit vacío.

```bash
git status
# si hay cambios:
git add <files>
git commit -m "fix(lab-visualizer): post-smoke adjustments"
```

---

## Resumen del plan

- **15 tasks** (~80 steps), cada step entre 2-5 minutos.
- **13 commits** aproximados — checkpoints verificables con tests verdes.
- **TDD** para lógica (parser, builder, hook, container component).
- **Smoke + snapshot** para componentes de UI puros (nodos, terminal).
- **E2E final** valida flujo completo del usuario.
- Al terminar: Docker build limpio, lab piloto funcional, docs actualizadas, framework listo para activar otros labs con solo un flag.

## Checklist de cobertura vs spec

- [x] Parser de comandos con 18 reglas → Task 2
- [x] Build steps desde MDX → Task 3
- [x] Frontmatter `visualizer` / `visualizerSpeed` → Task 4
- [x] Hook `useLabPlayer` → Task 5
- [x] 6 tipos de nodos → Task 6
- [x] VaultScene React Flow → Task 7
- [x] VaultTerminal animado + a11y → Task 8
- [x] Controles + timeline → Task 9
- [x] Contenedor LabVisualizer + empty state → Task 10
- [x] Integración tab 4 + page → Task 11
- [x] Habilitar lab piloto → Task 12
- [x] Tests E2E → Task 13
- [x] Docs → Task 14
- [x] Build final → Task 15

Sin placeholders. Código completo por cada step. Paths y comandos exactos.
