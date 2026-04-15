import "dotenv/config";
import "@testing-library/jest-dom";

process.env.DATABASE_URL ??= "file:./data/test.db";
