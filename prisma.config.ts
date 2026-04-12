import { defineConfig } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./data/vault-training.db";
// Strip the "file:" prefix for better-sqlite3 which expects a file path
const filePath = url.startsWith("file:") ? url.slice(5) : url;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
  migrate: {
    adapter: new PrismaBetterSqlite3({ url: filePath }),
  },
});
