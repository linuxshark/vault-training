#!/usr/bin/env tsx
/**
 * Translates every notes.mdx to notes-es.mdx (English → Spanish) using Claude Haiku.
 * Only translates files that don't already have a notes-es.mdx counterpart.
 *
 * Flags:
 *   --force   regenerate all translations even if notes-es.mdx already exists
 *
 * Requires ANTHROPIC_API_KEY in the environment.
 */
import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import fs from "node:fs/promises";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";
import { CONTENT_ROOT, ensureDir } from "./ingest/_lib";

const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `You are a technical translator specializing in HashiCorp Vault and infrastructure security.
Translate the following Markdown content from English to Spanish.

Rules:
- Preserve ALL Markdown formatting exactly: headers, code blocks, bullet points, bold, italics, links
- Do NOT translate code blocks, command examples, technical terms (vault, token, policy, lease, seal, unseal, path, etc.)
- Do NOT translate proper nouns, product names, or URLs
- Translate only prose and explanatory text
- Keep the same document structure
- Use natural, clear technical Spanish — not overly formal, not too casual
- Return ONLY the translated content with no preamble or explanation`;

function parseArgs(): { force: boolean } {
  return { force: process.argv.includes("--force") };
}

async function findNoteFiles(): Promise<string[]> {
  const files: string[] = [];
  const domainsDir = path.join(CONTENT_ROOT, "domains");
  const objectives = await fs.readdir(domainsDir);
  for (const obj of objectives) {
    const objDir = path.join(domainsDir, obj);
    const stat = await fs.stat(objDir);
    if (!stat.isDirectory()) continue;
    const tasks = await fs.readdir(objDir);
    for (const task of tasks) {
      const notesPath = path.join(objDir, task, "notes.mdx");
      try {
        await fs.access(notesPath);
        files.push(notesPath);
      } catch {
        // no notes.mdx in this task
      }
    }
  }
  return files;
}

async function translateFile(notesPath: string, client: Anthropic, force: boolean): Promise<void> {
  const esPath = notesPath.replace(/notes\.mdx$/, "notes-es.mdx");

  if (!force) {
    try {
      await fs.access(esPath);
      console.log(`  skip  ${notesPath} (already translated)`);
      return;
    } catch {
      // proceed
    }
  }

  const raw = await fs.readFile(notesPath, "utf8");
  const { data: frontmatter, content: body } = matter(raw);

  console.log(`  translate  ${notesPath}`);

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: body }],
  });

  const translated = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  if (!translated) {
    console.warn(`  warn  empty response for ${notesPath}, skipping`);
    return;
  }

  // Build frontmatter for notes-es.mdx
  const esFrontmatter = { ...frontmatter, kind: "notes-es" };
  const fm = Object.entries(esFrontmatter)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (typeof v === "string" ? `${k}: "${v.replace(/"/g, '\\"')}"` : `${k}: ${v}`))
    .join("\n");
  const output = `---\n${fm}\n---\n\n${translated}\n`;

  await ensureDir(path.dirname(esPath));
  await fs.writeFile(esPath, output, "utf8");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — add it to .env.local");
  }
  const { force } = parseArgs();
  const client = new Anthropic();
  const files = await findNoteFiles();

  if (files.length === 0) {
    console.log("No notes.mdx files found.");
    return;
  }

  console.log(`Found ${files.length} notes.mdx file(s). Translating...`);
  let written = 0;
  let skipped = 0;

  for (const file of files) {
    const esPath = file.replace(/notes\.mdx$/, "notes-es.mdx");
    const existedBefore = await fs.access(esPath).then(() => true).catch(() => false);
    await translateFile(file, client, force);
    const existsAfter = await fs.access(esPath).then(() => true).catch(() => false);
    if (existsAfter && (!existedBefore || force)) written++;
    else skipped++;
  }

  console.log(`\nDone — translated: ${written}, skipped: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
