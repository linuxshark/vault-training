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

## Inicio rápido

**Requisitos:** Docker 24+ con Compose.

```bash
git clone <este-repo> vault-training
cd vault-training
docker compose up -d
# Abre http://localhost:3000
```

El contenido ya está incluido en el repositorio. No se requieren pasos adicionales.

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
| `1` | Tab: Explicación sencilla |
| `2` | Tab: Notas técnicas |
| `3` | Tab: Lab |
| `m` | Avanzar estado (No empezado → Leyendo → Revisado → Dominado) |
| `n` | Enfocar editor de notas personales |

Las notas técnicas incluyen un botón **ES / EN** para alternar entre el original en inglés y la traducción al español.

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
   ./data/ (bind-mount)        (incluido en repo)
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
| IA | Anthropic SDK (claude-haiku-4-5) para explicadores y traducciones |
| Deploy | Docker multi-stage con standalone output |

### Fuentes de contenido

| Fuente | Qué aporta |
|--------|-----------|
| HashiCorp oficial | Estructura de objetivos y URLs |
| ismet55555/Hashicorp-Certified-Vault-Associate-Notes | Notas técnicas en inglés + traducción ES |
| btkrausen/vault-codespaces | Labs prácticos con comandos bash |
| Claude Haiku | Explicaciones "para dummies" en español |

---

## Para colaboradores / actualizar contenido

Si quieres regenerar o actualizar el contenido necesitas Node 20+ y una Anthropic API key.

```bash
npm install
cp .env.example .env.local   # agrega ANTHROPIC_API_KEY (sin comillas)

# Re-descarga la estructura de objetivos
npm run ingest:index

# Re-importa notas y labs (requiere poblar config/*-mapping.yaml)
npm run ingest:ismet
npm run ingest:labs

# Regenera explicadores (solo los que no existen)
npm run seed:explainers
# o forzar todos:
npm run seed:explainers -- --force
# o uno solo:
npm run seed:explainers -- --task 1a/vault-cli-to-configure-auth-methods

# Traduce notas al español
npm run translate:notes

# Valida el contenido
npm run content:validate

# Commitea y rebuild
git add content/ && git commit -m "content: refresh"
docker compose up -d --build
```

---

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests unitarios e integración (Vitest)
npm run test:e2e   # tests E2E (Playwright)
npm run lint       # ESLint + TypeScript
```

---

## Mapa de archivos

```
vault-training/
├── app/                    # Rutas Next.js (App Router)
│   ├── api/                # API routes (health, progress, notes, nav)
│   ├── domains/            # Páginas de objetivos y tareas
│   ├── review/             # Tareas en revisión
│   └── notes/              # Tareas con notas personales
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
│   ├── ingest/             # Scrapers e ingesters por fuente
│   ├── seed-explainers.ts  # Generador de explicadores con Claude
│   └── translate-notes.ts  # Traductor de notas EN→ES con Claude
├── config/                 # Mapeos YAML para ingesters
├── content/                # Contenido MDX (incluido en el repo)
├── data/                   # Base de datos SQLite (gitignoreado)
├── prisma/                 # Schema de Prisma
├── tests/                  # Tests unitarios, integración y E2E
├── Dockerfile              # Build multi-stage con standalone output
└── docker-compose.yml      # Servicio único con bind-mounts
```
