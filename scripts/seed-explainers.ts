#!/usr/bin/env tsx
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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
import Anthropic from "@anthropic-ai/sdk";
import { CONTENT_ROOT, ensureDir, taskDir, writeMdx } from "./ingest/_lib";

interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  tasks: { slug: string; title: string; officialUrl: string; orderIndex: number }[];
}

const MODEL = "claude-haiku-4-5";

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
