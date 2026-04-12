import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import type { Frontmatter } from "@/lib/content/frontmatter";

export const CONTENT_ROOT = path.resolve(process.cwd(), "content");
export const TMP_ROOT = path.resolve(process.cwd(), "node_modules/.ingest-cache");

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function shallowClone(repoUrl: string, target: string): Promise<void> {
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(path.dirname(target));
  execSync(`git clone --depth 1 ${repoUrl} ${target}`, { stdio: "inherit" });
}

export function writeMdx(filePath: string, frontmatter: Frontmatter, body: string): Promise<void> {
  const fm = Object.entries(frontmatter)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (typeof v === "string" ? `${k}: "${v.replace(/"/g, '\\"')}"` : `${k}: ${v}`))
    .join("\n");
  const content = `---\n${fm}\n---\n\n${body.trim()}\n`;
  return fs.writeFile(filePath, content, "utf8");
}

export function objectiveDir(objectiveId: string, objectiveSlug: string): string {
  return path.join(CONTENT_ROOT, "domains", `${objectiveId}-${objectiveSlug}`);
}

export function taskDir(objectiveId: string, objectiveSlug: string, taskSlug: string): string {
  return path.join(objectiveDir(objectiveId, objectiveSlug), taskSlug);
}
