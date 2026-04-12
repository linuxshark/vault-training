import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

const BASE = "http://localhost:3100";
const DB_PATH = path.resolve(__dirname, "../../data/test-api.db");
const CONTENT_ROOT = path.resolve(__dirname, "../fixtures/sample-content");

let server: ChildProcess;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ping(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/api/health`);
    return r.ok || r.status === 503;
  } catch {
    return false;
  }
}

beforeAll(async () => {
  await fs.rm(DB_PATH, { force: true });
  const { execSync } = await import("node:child_process");
  process.env.DATABASE_URL = `file:${DB_PATH}`;
  process.env.CONTENT_ROOT = CONTENT_ROOT;
  execSync("node_modules/.bin/prisma db push --skip-generate --accept-data-loss", { stdio: "ignore" });

  server = spawn("node_modules/.bin/next", ["dev", "-p", "3100"], {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: `file:${DB_PATH}`, CONTENT_ROOT },
  });
  for (let i = 0; i < 60; i++) {
    if (await ping()) return;
    await wait(500);
  }
  throw new Error("server did not start in 30s");
}, 60_000);

afterAll(() => {
  server?.kill("SIGTERM");
});

describe("HTTP API", () => {
  it("GET /api/health returns ok", async () => {
    const r = await fetch(`${BASE}/api/health`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.checks.db).toBe(true);
  });

  it("PATCH /api/progress/:taskId updates status", async () => {
    const taskId = encodeURIComponent("3/kv-v2");
    const r = await fetch(`${BASE}/api/progress/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "READING" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("READING");
  });

  it("PUT /api/notes/:taskId persists notes", async () => {
    const taskId = encodeURIComponent("3/kv-v2");
    const put = await fetch(`${BASE}/api/notes/${taskId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "mi nota" }),
    });
    expect(put.status).toBe(200);
    const get = await fetch(`${BASE}/api/notes/${taskId}`);
    const body = await get.json();
    expect(body.body).toBe("mi nota");
  });
});
