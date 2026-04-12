#!/usr/bin/env tsx
/**
 * Scrapes https://developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-study-003
 * and writes content/_index/objectives.json with the official objectives.
 *
 * Only structure (titles, slugs, ordering, URLs) is extracted. Body content is never copied.
 *
 * Page structure (as of 2026):
 *   H2: <Topic> — covers objectives like "1a - 1f, 2a - 2e, 3a - 3f"
 *     H3: <Sub-topic> — covers sub-objectives like "1a - 1f"
 *       links → tutorial tasks
 *   H2 with no H3 → links are tasks directly
 */
import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { ensureDir, CONTENT_ROOT } from "./_lib";

const STUDY_URL =
  "https://developer.hashicorp.com/vault/tutorials/associate-cert-003/associate-study-003";

interface ObjectiveIndex {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  officialUrl: string;
  tasks: { slug: string; title: string; orderIndex: number; officialUrl: string }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchHtml(url: string): Promise<string> {
  // Use curl with --compressed to get the full page (the page uses gzip which fetch may truncate)
  const html = execSync(
    `curl -s -L --compressed -A "vault-training-ingest/1.0" "${url}"`,
    { maxBuffer: 10 * 1024 * 1024 },
  ).toString("utf8");
  if (!html || html.length < 1000) throw new Error(`Failed to fetch ${url}: empty response`);
  return html;
}

function extractLinks(
  html: string,
): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];
  const seen = new Set<string>();
  const re = /href="(\/vault\/tutorials\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const label = (m[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (href && label && label.length > 2 && !seen.has(href)) {
      // Skip meta/index pages
      if (
        href === "/vault/tutorials/associate-cert-003/associate-study-003" ||
        href === "/vault/tutorials/associate-cert-003/associate-review-003" ||
        href === "/vault/tutorials/associate-cert-003/associate-questions-003" ||
        href === "/vault/tutorials/associate-cert-003"
      ) {
        continue;
      }
      seen.add(href);
      links.push({ href, label });
    }
  }
  return links;
}

interface Section {
  tag: "h2" | "h3";
  text: string;
  objectivesLabel: string;
  pos: number;
  links: { href: string; label: string }[];
}

function parseSections(html: string): Section[] {
  const sections: Section[] = [];
  const headingRe = /<(h[23])[^>]*>([\s\S]*?)<\/h[23]>/g;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const tag = m[1] as "h2" | "h3";
    const text = (m[2] ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    sections.push({ tag, text, objectivesLabel: "", pos: m.index + m[0].length, links: [] });
  }

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    const end = sections[i + 1]?.pos ?? html.length;
    const chunk = html.slice(s.pos, end);
    const objM = /Objectives covered:\s*([^<]+)/.exec(chunk);
    s.objectivesLabel = objM ? (objM[1] ?? "").trim() : "";
    s.links = extractLinks(chunk);
  }

  return sections;
}

function parseObjectives(html: string): ObjectiveIndex[] {
  // Only look at content from the "study-for-the-exam" anchor onwards
  const studyStart = html.indexOf('id="study-for-the-exam"');
  if (studyStart < 0) throw new Error('Could not find id="study-for-the-exam" anchor in HTML');
  const studyHtml = html.slice(studyStart);

  const sections = parseSections(studyHtml);

  // Filter to sections that have an "Objectives covered" annotation
  const withObjectives = sections.filter((s) => s.objectivesLabel.length > 0);
  if (withObjectives.length === 0) {
    throw new Error("No sections with 'Objectives covered' found — page structure may have changed");
  }

  const objectives: ObjectiveIndex[] = [];

  // Group H3 sub-sections under their parent H2
  // Find parent H2 sections (may have H3 children)
  const h2Sections = sections.filter((s) => s.tag === "h2" && s.objectivesLabel.length > 0);

  let objOrder = 1;
  for (const h2 of h2Sections) {
    // Find H3 children (sections between this h2 and next h2)
    const h2Idx = sections.indexOf(h2);
    const nextH2Idx = sections.findIndex(
      (s, idx) => idx > h2Idx && s.tag === "h2" && s.objectivesLabel.length > 0,
    );
    const childH3s = sections
      .slice(h2Idx + 1, nextH2Idx >= 0 ? nextH2Idx : undefined)
      .filter((s) => s.tag === "h3" && s.objectivesLabel.length > 0);

    if (childH3s.length > 0) {
      // Emit each H3 as a separate objective
      for (const h3 of childH3s) {
        const id = h3.objectivesLabel.split(",")[0]?.split("-")[0]?.trim().replace(/[^a-z0-9]/gi, "") ?? String(objOrder);
        const tasks = h3.links.map((l, tidx) => ({
          slug: slugify(l.label),
          title: l.label,
          orderIndex: tidx + 1,
          officialUrl: `https://developer.hashicorp.com${l.href}`,
        }));
        // Also include any links from the parent H2 section that aren't in H3 children
        objectives.push({
          id,
          slug: slugify(h3.text),
          title: h3.text,
          orderIndex: objOrder++,
          officialUrl: STUDY_URL,
          tasks,
        });
      }
    } else {
      // No H3 children — H2 is the objective itself, its links are tasks
      const id = h2.objectivesLabel.split(",")[0]?.split("-")[0]?.trim().replace(/[^a-z0-9]/gi, "") ?? String(objOrder);
      const tasks = h2.links.map((l, tidx) => ({
        slug: slugify(l.label),
        title: l.label,
        orderIndex: tidx + 1,
        officialUrl: `https://developer.hashicorp.com${l.href}`,
      }));
      objectives.push({
        id,
        slug: slugify(h2.text),
        title: h2.text,
        orderIndex: objOrder++,
        officialUrl: STUDY_URL,
        tasks,
      });
    }
  }

  // Filter out objectives with no tasks (e.g. newsletter signup sections in the page footer)
  return objectives.filter((o) => o.tasks.length > 0);
}

async function main() {
  console.log(`[ingest:index] fetching ${STUDY_URL}`);
  const html = await fetchHtml(STUDY_URL);
  console.log(`[ingest:index] fetched ${html.length} bytes`);
  const objectives = parseObjectives(html);
  if (objectives.length === 0) {
    throw new Error(
      "Parser returned 0 objectives. The page structure likely changed — inspect the HTML and update parseObjectives().",
    );
  }
  const outDir = path.join(CONTENT_ROOT, "_index");
  await ensureDir(outDir);
  const outFile = path.join(outDir, "objectives.json");
  await fs.writeFile(outFile, JSON.stringify(objectives, null, 2) + "\n", "utf8");
  console.log(`[ingest:index] wrote ${objectives.length} objectives to ${outFile}`);
  for (const obj of objectives) {
    console.log(`  [${obj.id}] ${obj.title} (${obj.tasks.length} tasks)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
