import { describe, it, expect } from "vitest";
import { resolveMapping } from "@/scripts/ingest/ismet-notes";

describe("resolveMapping", () => {
  const mappings = [
    { file: "03_secrets_engines.md", heading: "KV v2", objectiveId: "3", taskSlug: "kv-v2" },
    { file: "03_secrets_engines.md", objectiveId: "3", taskSlug: "_meta" },
  ];

  it("matches by file + heading", () => {
    const r = resolveMapping(mappings, "03_secrets_engines.md", "KV v2");
    expect(r).toEqual([{ objectiveId: "3", taskSlug: "kv-v2" }]);
  });

  it("falls back to file-only mapping when heading is omitted", () => {
    const r = resolveMapping(mappings, "03_secrets_engines.md", "Intro");
    expect(r).toEqual([{ objectiveId: "3", taskSlug: "_meta" }]);
  });

  it("returns empty array when no mapping matches", () => {
    const r = resolveMapping(mappings, "99_unknown.md", "Anything");
    expect(r).toEqual([]);
  });
});
