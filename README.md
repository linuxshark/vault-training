# Vault Training

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css)
![Docker](https://img.shields.io/badge/Docker-24+-2496ED?logo=docker)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-black)
![Anthropic](https://img.shields.io/badge/Anthropic-Haiku-orange?logo=anthropic)

Interface de estudio local para la certificación **HashiCorp Vault Associate (003)**. Consolida cuatro fuentes de contenido en un flujo de estudio ordenado, con seguimiento de progreso, notas personales y navegación por teclado.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 14 App                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Sidebar  │  │  Main (MDX)  │  │   Right Panel     │  │
│  │ Nav      │  │  3 tabs:     │  │  TOC / Lab /      │  │
│  │          │  │  Explicado   │  │  Notas propias    │  │
│  │          │  │  Notas       │  │                   │  │
│  │          │  │  Lab         │  │                   │  │
│  └──────────┘  └──────────────┘  └───────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
          ┌─────────────┴──────────────┐
          │                            │
   SQLite (Prisma 7)           MDX content/
   ./data/ (bind-mount)        ./content/ (bind-mount)
```

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router, RSC, standalone output) |
| Lenguaje | TypeScript 5 strict (`noUncheckedIndexedAccess`) |
| Base de datos | SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3` |
| UI | Tailwind CSS + shadcn/ui + Radix primitives + Lucide icons |
| Contenido | MDX via `next-mdx-remote` con rehype plugins |
| Tests unitarios | Vitest |
| Tests E2E | Playwright |
| IA | Anthropic SDK (claude-haiku-4-5) para generar explicadores |
| Deploy | Docker multi-stage con standalone output |

### Fuentes de contenido

| Fuente | Qué aporta | Script |
|--------|-----------|--------|
| HashiCorp oficial | Estructura de objetivos y URLs | `npm run ingest:index` |
| ismet55555/Hashicorp-Certified-Vault-Associate-Notes | Notas técnicas (notes.mdx) | `npm run ingest:ismet` |
| btkrausen/vault-codespaces | Labs prácticos con comandos bash (lab.mdx) | `npm run ingest:labs` |
| Claude Haiku | Explicaciones "para dummies" en español (explained.mdx) | `npm run seed:explainers` |

---

## Inicio rápido (primera vez)

### Requisitos

- Node 20+
- Docker 24+ con Compose
- Git
- Anthropic API key (solo para generar explicadores)

### Pasos

**1. Clonar e instalar dependencias**

```bash
git clone <este-repo> vault-training
cd vault-training
cp .env.example .env.local
npm install
```

Edita `.env.local` y agrega tu API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**2. Descargar estructura de objetivos de HashiCorp**

```bash
npm run ingest:index
```

Esto crea `content/_index/objectives.json` con la lista oficial de objetivos y tareas.

**3. Importar notas de ismet55555**

```bash
npm run ingest:ismet
```

La primera vez avisa que el mapeo está vacío. Inspecciona:
```
node_modules/.ingest-cache/ismet-notes/
```
Edita `config/ismet-mapping.yaml` con los mapeos y vuelve a correr el comando.

**4. Importar labs de btkrausen**

```bash
npm run ingest:labs
```

Igual que el paso anterior: inspecciona `node_modules/.ingest-cache/vault-codespaces/` y edita `config/labs-mapping.yaml`.

**5. Generar explicadores con Claude Haiku** *(requiere API key con créditos)*

```bash
npm run seed:explainers
```

Genera archivos `explained.mdx` para cada tarea. Cuesta aproximadamente $0.02-0.05 para el set completo. Se puede saltar si no tienes API key; la app funciona sin explicadores.

**6. Validar el contenido**

```bash
npm run content:validate
```

Errores son bloqueantes. Warnings (`⚠`) indican explicadores faltantes, no bloquean.

**7. Commitear el contenido y levantar**

```bash
git add content/ config/
git commit -m "content: vault training content"

docker compose up -d
# Abre http://localhost:3000
```

---

## Uso diario

```bash
docker compose up -d     # cuando quieras estudiar
docker compose down      # cuando termines (opcional)
```

El progreso y las notas persisten en `./data/vault-training.db` (SQLite, bind-mount en tu máquina).

---

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `j` | Tarea siguiente |
| `k` | Tarea anterior |
| `1` | Tab: Explicado |
| `2` | Tab: Notas técnicas |
| `3` | Tab: Lab |
| `m` | Avanzar estado (No empezado → Leyendo → Revisado → Dominado) |
| `n` | Enfocar editor de notas |

---

## Actualizar contenido

```bash
npm run ingest:all                         # re-clona las 3 fuentes externas
npm run seed:explainers                    # solo genera los faltantes
npm run seed:explainers -- --force         # regenera todos
npm run seed:explainers -- --task 1a/vault-cli-to-configure-auth-methods  # uno solo
npm run content:validate
git add content/ && git commit -m "content: refresh"
docker compose up -d --build              # rebuild si hubo cambios de código
```

---

## Desarrollo local (sin Docker)

```bash
npm run dev        # http://localhost:3000
npm test           # tests unitarios e integración (Vitest)
npm run test:e2e   # tests E2E (Playwright, requiere dev server)
npm run lint       # ESLint
```

---

## Mapa de archivos

```
vault-training/
├── app/                    # Rutas Next.js (App Router)
│   ├── api/                # API routes (health, progress, notes, nav)
│   ├── domains/            # Páginas de objetivos y tareas
│   ├── review/             # Tareas en revisión
│   └── notes/              # Tareas con notas
├── components/             # Componentes React
│   └── mdx/               # Componentes custom para MDX
├── lib/                    # Lógica servidor
│   ├── content/            # Loader y compilador MDX
│   ├── hooks/              # Hooks cliente (autosave, shortcuts)
│   ├── prisma.ts           # Singleton Prisma
│   ├── progress.ts         # CRUD de progreso
│   ├── notes.ts            # CRUD de notas
│   └── dashboard.ts        # Datos para dashboard y sidebar
├── scripts/                # CLI de ingesta (se ejecutan en el host)
│   ├── ingest/             # Helpers, scrapers, ingesters
│   └── seed-explainers.ts  # Generador de explicadores con Claude
├── config/                 # Mapeos YAML para ingesters
├── content/                # Contenido MDX (gitignoreado, bind-mount)
├── data/                   # Base de datos SQLite (gitignoreado, bind-mount)
├── prisma/                 # Schema de Prisma
├── tests/                  # Tests unitarios, integración y E2E
├── Dockerfile              # Build multi-stage con standalone output
└── docker-compose.yml      # Servicio único con bind-mounts
```

---

## Estado del proyecto

- [x] App Next.js con 3-column layout
- [x] Progreso persistente (NOT_STARTED / READING / REVIEWED / MASTERED)
- [x] Notas con autosave
- [x] Navegación por teclado
- [x] Scripts de ingesta (HashiCorp, ismet55555, btkrausen)
- [x] Docker compose funcional
- [ ] Explicadores Claude Haiku (pendiente créditos API)
- [ ] Tests E2E (requieren contenido completo)
