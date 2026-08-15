import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js convention: .env.local holds the real (gitignored) values and
// takes priority over .env, which only has a documented placeholder.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
