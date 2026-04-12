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
    if (m && m[1]) {
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
