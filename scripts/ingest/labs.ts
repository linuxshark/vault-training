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
