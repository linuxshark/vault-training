import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { loadTask, listObjectives } from "@/lib/content/loader";

const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

beforeAll(() => {
  process.env.CONTENT_ROOT = FIXTURE_ROOT;
});

describe("listObjectives", () => {
  it("reads objectives.json", async () => {
    const objectives = await listObjectives();
    expect(objectives).toHaveLength(1);
    expect(objectives[0]?.id).toBe("3");
    expect(objectives[0]?.tasks).toHaveLength(1);
  });
});

describe("loadTask", () => {
  it("returns the three tabs when all exist", async () => {
    const loaded = await loadTask("3", "kv-v2");
    expect(loaded).not.toBeNull();
    expect(loaded?.explained?.frontmatter.kind).toBe("explained");
    expect(loaded?.notes?.frontmatter.source).toBe("ismet55555");
    expect(loaded?.lab?.frontmatter.source).toBe("btkrausen");
  });

  it("returns null when the task does not exist", async () => {
    const loaded = await loadTask("3", "missing-task");
    expect(loaded).toBeNull();
  });

  it("exposes externalLinks built from sourceUrls", async () => {
    const loaded = await loadTask("3", "kv-v2");
    expect(loaded?.externalLinks.length).toBeGreaterThan(0);
    expect(loaded?.externalLinks[0]).toHaveProperty("url");
  });
});
