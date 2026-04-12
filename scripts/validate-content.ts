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
