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
- `docs/superpowers/plans/` — implementation plan
