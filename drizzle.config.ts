import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI — it doesn't pick up .env.local like Next.js does,
// so load the env files explicitly here.
config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DIRECT_URL (or DATABASE_URL as fallback) must be set in .env.local to run drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
