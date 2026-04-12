import "dotenv/config";

process.env.DATABASE_URL ??= "file:./data/test.db";
