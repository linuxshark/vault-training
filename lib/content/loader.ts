import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { FrontmatterSchema, type Frontmatter } from "./frontmatter";

export interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  tasks: { slug: string; title: string; orderIndex: number }[];
}

export interface LoadedMdx {
  frontmatter: Frontmatter;
  body: string;
}

export interface LoadedTask {
  objectiveId: string;
  taskSlug: string;
  explained?: LoadedMdx;
  notes?: LoadedMdx;
  notesEs?: LoadedMdx;
  lab?: LoadedMdx;
  externalLinks: { label: string; url: string }[];
}

function contentRoot(): string {
  return process.env.CONTENT_ROOT ?? path.resolve(process.cwd(), "content");
}

async function readMdx(filePath: string): Promise<LoadedMdx | undefined> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const frontmatter = FrontmatterSchema.parse(data);
    return { frontmatter, body: content };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

export async function listObjectives(): Promise<ObjectiveIndex[]> {
  const file = path.join(contentRoot(), "_index", "objectives.json");
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as ObjectiveIndex[];
}

export async function loadTask(objectiveId: string, taskSlug: string): Promise<LoadedTask | null> {
  const objectives = await listObjectives();
  const objective = objectives.find((o) => o.id === objectiveId);
  if (!objective) return null;
  const task = objective.tasks.find((t) => t.slug === taskSlug);
  if (!task) return null;

  const dir = path.join(contentRoot(), "domains", `${objective.id}-${objective.slug}`, task.slug);
  const [explained, notes, notesEs, lab] = await Promise.all([
    readMdx(path.join(dir, "explained.mdx")),
    readMdx(path.join(dir, "notes.mdx")),
    readMdx(path.join(dir, "notes-es.mdx")),
    readMdx(path.join(dir, "lab.mdx")),
  ]);

  if (!explained && !notes && !lab) return null;

  const externalLinks: { label: string; url: string }[] = [];
  if (explained?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Tutorial oficial", url: explained.frontmatter.sourceUrl });
  }
  if (notes?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Apuntes ismet55555", url: notes.frontmatter.sourceUrl });
  }
  if (lab?.frontmatter.sourceUrl) {
    externalLinks.push({ label: "Lab codespace", url: lab.frontmatter.sourceUrl });
  }

  return { objectiveId, taskSlug, explained, notes, notesEs, lab, externalLinks };
}
