# Vault Training — Instrucciones para Claude

## Contexto del proyecto

App local-first de estudio para la certificación HashiCorp Vault Associate (003).
El contenido ya está generado y commitado en `content/`. Para usar la app basta con `docker compose up -d`.

## Stack

- Next.js 14 App Router · TypeScript strict · Prisma 7 + better-sqlite3 · SQLite
- Tailwind CSS + shadcn/ui + Radix · MDX (next-mdx-remote) · Vitest · Playwright
- Docker multi-stage con standalone output

## Comandos frecuentes

```bash
npm run dev                  # desarrollo local
npm test                     # tests unitarios (Vitest)
npm run lint                 # ESLint + tsc --noEmit
docker compose up -d         # levantar producción
docker compose up -d --build # rebuild + levantar
docker logs vault-training   # logs del contenedor
```

## Scripts de contenido (solo para actualizar)

```bash
npm run ingest:index         # descarga estructura de objetivos de HashiCorp
npm run ingest:ismet         # clona notas ismet55555 (requiere config/ismet-mapping.yaml)
npm run ingest:labs          # clona labs btkrausen (requiere config/labs-mapping.yaml)
npm run ingest:all           # los tres anteriores en secuencia
npm run seed:explainers      # genera explained.mdx con claude-haiku-4-5
npm run translate:notes      # genera notes-es.mdx (traducción EN→ES) con claude-haiku-4-5
npm run content:validate     # valida frontmatter (explained faltante = warning, no error)
```

## Notas importantes

- `ANTHROPIC_API_KEY` en `.env.local` NO debe tener comillas dobles
- Prisma 7: la URL de la DB está en `prisma.config.ts`, no en `schema.prisma`
- El contenido está en `content/` (commitado). La DB está en `data/` (gitignoreado)
- Docker copia `node_modules` completo al runner (no piezas sueltas) — necesario para archivos WASM de Prisma
- `app/layout.tsx` tiene `export const dynamic = "force-dynamic"` para evitar prerender estático

## Estructura de contenido

```
content/
├── _index/objectives.json          # estructura oficial de HashiCorp
└── domains/
    └── {id}-{slug}/
        └── {taskSlug}/
            ├── explained.mdx       # explicación "para dummies" de Claude Haiku
            ├── notes.mdx           # notas técnicas de ismet55555 (inglés)
            ├── notes-es.mdx        # traducción al español de las notas
            └── lab.mdx             # lab práctico de btkrausen
```

## Mapeos de contenido

- `config/ismet-mapping.yaml` — mapea secciones del README de ismet55555 a tareas
- `config/labs-mapping.yaml` — mapea archivos de vault-codespaces a tareas
- Los `taskSlug` en los mapeos DEBEN coincidir con slugs en `content/_index/objectives.json`

## Feature: toggle ES/EN en notas técnicas

El tab "Notas técnicas" tiene un botón ES/EN que aparece solo cuando existe `notes-es.mdx`.
El estado del toggle es local al componente `TabSwitcher` (se pierde al recargar).
