import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? "file:./data/vault-training.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
  },
});
