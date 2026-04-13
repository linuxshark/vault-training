# Lab Visualizer — Design Spec

**Fecha:** 2026-04-12
**Estado:** Aprobado por usuario, listo para implementation planning
**Branch destino:** `feat/vault-training-app`

## 1. Resumen

Añadir un visualizador animado a los labs de Vault que reproduce los comandos `vault` como una secuencia paso a paso, tipeándolos en un terminal simulado y animando nodos de un diagrama de arquitectura (servidor, clientes, auth methods, secret engines, policies, tokens). El objetivo es ayudar al usuario a visualizar qué ocurre en el sistema cuando ejecuta cada comando — sin escribir código, sin Vault real, sin interactividad de input.

El visualizador se expone como un nuevo tab **"Lab visual"** (tecla `4`) dentro de la página de tarea. Se activa lab por lab mediante un flag en frontmatter (`visualizer: true`). MVP: 1 lab piloto (`vault-cli-to-configure-auth-methods`); framework reutilizable para activar los otros 11 en iteraciones posteriores.

## 2. Goals

- Reproducir los comandos de un `lab.mdx` como animación step-by-step sincronizada entre terminal y diagrama.
- Framework reutilizable: agregar un nuevo lab al visualizer debe requerir solo `visualizer: true` en frontmatter — sin código.
- Parseo automático de comandos con una tabla de ~15-20 reglas; fallback seguro si una regla no matchea.
- Accesibilidad: soportar `prefers-reduced-motion`, `aria-live` en terminal, navegación por teclado completa.
- No romper la experiencia actual: cuando `visualizer=false` (o ausente), la página funciona exactamente como hoy.

## 3. Non-goals

- Input del usuario / autocompletado de comandos (tipo k8sgames).
- Conexión a un Vault real en Docker.
- Activar el visualizer en los 12 labs desde el MVP.
- Layout dinámico de nodos / fuerza dirigida — coordenadas fijas por ahora.
- Gamificación (XP, badges, streaks, progreso persistente del playback).
- Exportar GIF/video del lab.
- Modos colaborativos / compartir.
- Soporte 3D (Three.js).

## 4. Arquitectura

### 4.1 Diagrama de alto nivel

```
┌─ app/domains/[obj]/[task]/page.tsx  (Server Component) ────────────┐
│                                                                    │
│  loadTaskContent()  ──►  compileTaskMdx()                          │
│          │                       │                                 │
│          ▼                       ▼                                 │
│   LoadedTask { lab?: LoadedMdx, ... }                              │
│          │                                                         │
│          ▼                                                         │
│   buildLabSteps(lab.body)  ── lib/lab-visualizer/build-steps.ts    │
│          │                                                         │
│          ▼                                                         │
│   LabStep[] + visualizerEnabled                                    │
│          │                                                         │
│          ▼                                                         │
│  <TabSwitcher panels={{ explained, notes, notesEs, lab }}          │
│              labSteps={steps} visualizerEnabled={true}/>           │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌─ components/tab-switcher.tsx  (Client Component, existente) ───────┐
│                                                                    │
│  Tab '[3] Lab visual' → <LabVisualizer steps={labSteps}/>          │
│  Tab '[4] Lab'        → MDX panel bash existente                   │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌─ components/lab-visualizer/LabVisualizer.tsx  (Client) ────────────┐
│                                                                    │
│  useLabPlayer(steps) → { current, idx, isPlaying, next, prev, … }  │
│                                                                    │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐    │
│  │       <VaultScene/>          │  │    <VaultTerminal/>      │    │
│  │  React Flow canvas           │  │  líneas animadas +       │    │
│  │  affects → glow/edges        │  │  cursor tipeante         │    │
│  └──────────────────────────────┘  └──────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   <LabStepTimeline/>                          │  │
│  │  [●●●○○○○○○○○○]  paso 3/12                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              <LabControls/>  ◀  ⏸/▶  ▶  0.5× 1× 2×           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Responsabilidades por módulo

| Módulo | Responsabilidad |
|--------|-----------------|
| `lib/lab-visualizer/parse-command.ts` | Tomar un string de comando y devolver `NodeRef[]` afectados. |
| `lib/lab-visualizer/rules.ts` | Tabla de `{ match: RegExp, affects: (m) => NodeRef[] }`. |
| `lib/lab-visualizer/build-steps.ts` | Extraer bloques bash de MDX body y convertirlos a `LabStep[]`. |
| `lib/lab-visualizer/scene-layout.ts` | Coordenadas fijas de los 6 tipos de nodos base. |
| `lib/lab-visualizer/types.ts` | Tipos compartidos (`NodeRef`, `NodeKind`, `LabStep`, `NodeState`). |
| `components/lab-visualizer/LabVisualizer.tsx` | Contenedor; combina escena + terminal + controles. |
| `components/lab-visualizer/VaultScene.tsx` | React Flow canvas con nodos custom. |
| `components/lab-visualizer/nodes/*.tsx` | 6 componentes de nodo: Server, Client, Auth, Engine, Policy, Token. |
| `components/lab-visualizer/VaultTerminal.tsx` | Terminal simulado con tipeado por carácter. |
| `components/lab-visualizer/LabControls.tsx` | Barra de transport (prev/play/next/speed). |
| `components/lab-visualizer/LabStepTimeline.tsx` | Pills clicables, progreso visual. |
| `lib/hooks/use-lab-player.ts` | Hook de playback (idx, play/pause, speed, reduced-motion). |

### 4.3 Decisión: client-side vs server-side

El **parseo** corre en el server (en `loadTaskContent` o `buildLabSteps`) para:
- Mantener el bundle cliente más pequeño (reglas + regex no viajan al navegador).
- Permitir cachear resultados fácilmente en SSR.

El **playback** corre en el cliente (`"use client"`), porque depende de timers, estado de UI y eventos de teclado.

## 5. Modelo de datos

### 5.1 Tipos TypeScript

```ts
// lib/lab-visualizer/types.ts
export type NodeKind = 'server' | 'client' | 'auth' | 'engine' | 'policy' | 'token';

export type NodeRef =
  | 'server' | 'client' | 'token' | 'policy'
  | `auth:${string}`     // auth:userpass, auth:approle, auth:*
  | `engine:${string}`;  // engine:kv, engine:pki, engine:transit, engine:*

export interface LabStep {
  /** índice 0-based */
  index: number;
  /** comando(s) del bloque bash — puede ser multiline */
  commands: string[];
  /** output simulado (por ahora: null; futuro: extraído del MDX o hardcoded). */
  output: string | null;
  /** nodos afectados, unión de parseCommand() de cada línea */
  affects: NodeRef[];
  /** comentario opcional extraído del frontmatter o una línea previa "# ..." */
  caption: string | null;
}

export interface LabRule {
  /** regex que matchea el comienzo del comando */
  match: RegExp;
  /** función que extrae nodos (puede usar grupos del match) */
  affects: (m: RegExpMatchArray) => NodeRef[];
}
```

### 5.2 Coordenadas del diagrama (fijas v1)

```
 (0, 100) Client          (400, 100) Server          (800, 50) engine:kv
                                                     (800, 130) engine:pki
                                                     (800, 210) engine:transit
                          (400, 250) Storage         (800, 290) engine:db

 (-50, 20) Token          (200, 300) auth:userpass
 (-50, 250) Policy        (350, 300) auth:approle
                          (500, 300) auth:ldap
                          (650, 300) auth:aws
```

Los nodos `auth:*` y `engine:*` cuya regla no se active en ningún paso del lab **no se renderizan** (filtrado pre-render).

### 5.3 Reglas de parseo (v1 — 18 reglas)

```ts
// lib/lab-visualizer/rules.ts
export const RULES: LabRule[] = [
  { match: /^vault status\b/,                    affects: () => ['server'] },
  { match: /^vault login\b/,                     affects: () => ['client','server','token'] },
  { match: /^vault operator init\b/,             affects: () => ['server'] },
  { match: /^vault operator unseal\b/,           affects: () => ['server'] },
  { match: /^vault operator seal\b/,             affects: () => ['server'] },
  { match: /^vault auth list\b/,                 affects: () => ['server'] },
  { match: /^vault auth enable (\S+)/,           affects: m => ['server', `auth:${m[1]}`] },
  { match: /^vault auth disable (\S+)/,          affects: m => ['server', `auth:${m[1]}`] },
  { match: /^vault secrets list\b/,              affects: () => ['server'] },
  { match: /^vault secrets enable (\S+)/,        affects: m => ['server', `engine:${m[1]}`] },
  { match: /^vault secrets disable (\S+)/,       affects: m => ['server', `engine:${m[1]}`] },
  { match: /^vault kv\b/,                        affects: () => ['client','server','engine:kv'] },
  { match: /^vault policy\b/,                    affects: () => ['server','policy'] },
  { match: /^vault token create\b/,              affects: () => ['server','token'] },
  { match: /^vault token lookup\b/,              affects: () => ['server','token'] },
  { match: /^vault token capabilities\b/,        affects: () => ['server','token','policy'] },
  { match: /^vault (read|write|list|delete) (transit|pki|database|ssh|totp)\b/,
                                                 affects: m => ['client','server',`engine:${m[2]}`] },
  { match: /^vault (read|write|list|delete)\b/,  affects: () => ['client','server'] },
];

export const FALLBACK_AFFECTS: NodeRef[] = ['server'];
```

### 5.4 Frontmatter extendido

```ts
// lib/content/frontmatter.ts (existente, extender schema)
export const labFrontmatter = baseFrontmatter.extend({
  kind: z.literal('lab'),
  visualizer: z.boolean().optional().default(false),
  visualizerSpeed: z.number().positive().optional().default(1),
});
```

## 6. UX

### 6.1 Ubicación en la página

El `TabSwitcher` actual tiene 3 tabs. Pasa a tener 4:

| Tecla | Label (frontmatter `visualizer=true`) | Label (sin visualizer) |
|-------|---------------------------------------|------------------------|
| `1` | Explicación sencilla | Explicación sencilla |
| `2` | Notas técnicas | Notas técnicas |
| `3` | **Lab visual** 🆕 | — (oculto) |
| `4` | Lab | Lab (hoy tecla 3) |

Cuando `visualizer=false` el tab 3 no se renderiza; los tabs existentes mantienen sus teclas actuales (`1`, `2`, `3` para Lab) → **cambio mínimo para labs sin visualizer**.

### 6.2 Layout del visualizer

**Desktop (≥768px):**
```
┌───────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │                         │  │ $ vault status          │ │
│  │     <VaultScene/>       │  │ Key     Value           │ │
│  │                         │  │ ---     -----           │ │
│  │    (React Flow)         │  │ Sealed  false           │ │
│  │                         │  │                         │ │
│  │                         │  │ $ vault login root_     │ │
│  │                         │  │                         │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  ●─●─●─○─○─○─○─○─○─○─○─○       paso 3/12            │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  ◀  ⏸   ▶      0.5×  1×  2×      🔄 Reiniciar      │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

**Mobile (<768px):** Scene arriba (aspect 4:3), terminal debajo, controles fijos en bottom.

### 6.3 Animaciones

| Evento | Animación |
|--------|-----------|
| Comando tipea | cadencia 25ms/char; cursor parpadea 1Hz |
| Nodo `affects[]` | `opacity 0.4 → 1` + glow `box-shadow` pulsante 2s |
| Edge cliente→server | trazo animado (stroke-dashoffset) 1s |
| Edge server→engine | trazo animado 0.8s, delay 0.3s |
| Nodo nuevo aparece | `scale 0.8 → 1` + `opacity 0 → 1` 400ms |
| Reduced motion | todas las animaciones → fade instantáneo, sin pulsos |

### 6.4 Atajos de teclado (en tab 3)

| Tecla | Acción |
|-------|--------|
| `←` | Paso anterior |
| `→` | Paso siguiente |
| `Espacio` | Play/Pause |
| `r` | Reiniciar (idx=0) |
| `1-4` | Cambiar tab (coherente con existente) |
| `Escape` | Salir de fullscreen si está activo (post-MVP) |

### 6.5 Estados

- **Empty (no hay steps parseables):** card con mensaje "Este lab no contiene comandos parseables aún" + botón "Ir al Lab" que cambia a tab 4.
- **Loading (SSR → hydratation de React Flow):** skeleton box con el layout del scene (gris).
- **Error (error boundary captura excepciones):** fallback "No se pudo cargar el visualizador. [Ver Lab en texto]" — con tab 4 link.

## 7. Dependencias nuevas

```json
{
  "@xyflow/react": "^12",
  "framer-motion": "^11",
  "dequal": "^2"
}
```

- **@xyflow/react** — MIT, ~70KB gzip. React Flow moderno (no el antiguo `reactflow`).
- **framer-motion** — MIT, ~50KB gzip. Animaciones de nodos y tipeado.
- **dequal** — MIT, ~2KB. Comparación profunda para memoización de `affects[]`.

Total extra en bundle: ~120KB gzip, cargado lazy via `next/dynamic` → impacto cero en rutas sin visualizer.

## 8. Estrategia de testing

### 8.1 Tests unitarios (Vitest)

- `tests/unit/lab-visualizer/parse-command.test.ts` — 30+ casos:
  - Cada una de las 18 reglas al menos un caso positivo.
  - 3 casos de fallback (comandos desconocidos, comentarios, vacíos).
  - Multi-línea HEREDOC (toma solo primera línea significativa).
  - Comandos con flags (`vault kv put -cas=0 secret/foo`).
- `tests/unit/lab-visualizer/build-steps.test.ts`:
  - Extrae N bloques bash → N LabSteps.
  - Ignora bloques no-bash (` ```yaml `, ` ```json `).
  - `affects[]` es unión de líneas dentro del bloque.
  - Fixture MDX del lab piloto → snapshot de steps esperados.

### 8.2 Tests de componente (Vitest + Testing Library)

- `tests/unit/components/lab-visualizer.test.tsx`:
  - Renderiza con 3 steps → terminal muestra primer comando.
  - Click en `▶ next` → terminal muestra segundo comando.
  - Click en pill #3 del timeline → salta a paso 3.
  - `visualizerEnabled=false` → no renderiza nada (null).
  - Empty steps → renderiza empty state.

### 8.3 Tests E2E (Playwright)

- `tests/e2e/lab-visualizer.spec.ts`:
  - Navegar a `/domains/1a-authentication/vault-cli-to-configure-auth-methods`.
  - Verificar tab "Lab visual" visible; click.
  - Verificar paso 1 (`vault status`) en terminal.
  - Flecha derecha 2 veces → paso 3; verificar texto en terminal.
  - `prefers-reduced-motion: reduce` emulado → las animaciones están desactivadas.

### 8.4 Cobertura meta

- `parse-command.ts`: 100% branch coverage (reglas + fallback).
- `build-steps.ts`: 100% statement coverage.
- Componentes: smoke test por cada uno.

## 9. Rollout plan

1. **MVP (este plan):** framework + piloto en `vault-cli-to-configure-auth-methods`.
2. **Fase 2** (fuera de este plan): activar `visualizer: true` en 2-3 labs adicionales según feedback UX. Ajustar reglas si hay comandos no parseables.
3. **Fase 3**: activar resto de labs; agregar opcionalmente output simulado extraído del README original de btkrausen.
4. **Fase 4** (opt-in): script Claude Haiku para sugerir `output` y `caption` por paso a partir del MDX.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| React Flow añade demasiado peso al bundle | Lazy load con `next/dynamic({ ssr: false })`. Solo carga al entrar al tab 3. |
| `prefers-reduced-motion` no funciona en Safari antiguo | Usar `useReducedMotion` de framer-motion (cubre fallbacks). |
| Comandos con HEREDOC confunden al parser | `build-steps` parsea línea por línea, tomando la primera línea no vacía como "comando representativo". |
| 18 reglas no son suficientes para los otros 11 labs | Fallback a `['server']` evita crashes. Agregamos reglas en Fase 2 según necesidad. |
| Layout fijo se rompe en viewport pequeño | React Flow tiene zoom/pan por defecto; fitView on mount. Responsive CSS del contenedor. |
| SSR de React Flow genera warnings de hydratation | Dynamic import con `ssr: false` — componente solo monta client-side. |

## 11. Archivos a crear (resumen)

```
components/lab-visualizer/
  LabVisualizer.tsx
  VaultScene.tsx
  VaultTerminal.tsx
  LabControls.tsx
  LabStepTimeline.tsx
  nodes/ServerNode.tsx
  nodes/ClientNode.tsx
  nodes/AuthNode.tsx
  nodes/EngineNode.tsx
  nodes/PolicyNode.tsx
  nodes/TokenNode.tsx

lib/lab-visualizer/
  types.ts
  rules.ts
  parse-command.ts
  build-steps.ts
  scene-layout.ts

lib/hooks/
  use-lab-player.ts

tests/unit/lab-visualizer/
  parse-command.test.ts
  build-steps.test.ts
tests/unit/components/
  lab-visualizer.test.tsx
tests/e2e/
  lab-visualizer.spec.ts
```

## 12. Archivos a modificar (resumen)

- `lib/content/frontmatter.ts` — agregar campos `visualizer`, `visualizerSpeed` al schema de `lab`.
- `lib/content/loader.ts` — invocar `buildLabSteps(lab.body)` y adjuntar a `LoadedTask`.
- `app/domains/[objectiveSlug]/[taskSlug]/page.tsx` — pasar `labSteps` y `visualizerEnabled` a `TabSwitcher`.
- `components/tab-switcher.tsx` — agregar 4to tab condicional; manejar tecla `4`; montar `<LabVisualizer/>`.
- `content/domains/1a-authentication/vault-cli-to-configure-auth-methods/lab.mdx` — agregar `visualizer: true` al frontmatter.
- `package.json` — agregar 3 dependencias nuevas.
- `README.md` — documentar el visualizer (1 párrafo + screenshot).
- `CLAUDE.md` — anotar la feature en "Features".

## 13. Criterios de aceptación (done)

- [ ] El tab "Lab visual" aparece SOLO en el lab piloto.
- [ ] Los otros 11 labs funcionan idénticos a hoy (sin el tab).
- [ ] El lab piloto reproduce los 12 pasos correctamente con animación sincronizada.
- [ ] Atajos `←`, `→`, `Espacio`, `r`, `1-4` funcionan.
- [ ] `prefers-reduced-motion: reduce` desactiva animaciones.
- [ ] Tests unitarios + componente + E2E pasan en CI local (`npm test` y `npm run test:e2e`).
- [ ] `npm run lint` pasa sin errores.
- [ ] `docker compose up -d --build` arranca sin regresiones.
- [ ] Bundle JS total de la ruta `/domains/*/*` no crece más de 150KB gzip.
