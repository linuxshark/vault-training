import { describe, it, expect } from "vitest";
import { FrontmatterSchema, MDX_KINDS, SOURCES } from "@/lib/content/frontmatter";

const validBase = {
  objectiveId: "3",
  taskSlug: "kv-v2",
  kind: "explained" as const,
  title: "KV v2: versiones",
  source: "claude" as const,
  sourceUrl: "https://example.com/x",
  license: "original",
  order: 1,
};

describe("FrontmatterSchema", () => {
  it("accepts valid frontmatter", () => {
    const result = FrontmatterSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts optional estMinutes", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, estMinutes: 10 });
    expect(result.success).toBe(true);
  });

  it("rejects missing objectiveId", () => {
    const { objectiveId: _omit, ...rest } = validBase;
    const result = FrontmatterSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid kind", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, kind: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, source: "wikipedia" });
    expect(result.success).toBe(false);
  });

  it("rejects non-url sourceUrl", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, sourceUrl: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer order", () => {
    const result = FrontmatterSchema.safeParse({ ...validBase, order: 1.5 });
    expect(result.success).toBe(false);
  });

  it("enumerates the MDX kinds", () => {
    expect(MDX_KINDS).toEqual(["explained", "notes", "lab"]);
  });

  it("enumerates the sources", () => {
    expect(SOURCES).toEqual(["claude", "ismet55555", "btkrausen"]);
  });
});
