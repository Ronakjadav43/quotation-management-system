import { execSync } from "node:child_process";
import { config } from "dotenv";

config(); // load .env locally; no-op on Vercel where env vars are injected natively

// Supabase Vercel integration sets POSTGRES_URL_NON_POOLING, not DATABASE_URL.
// Fall back through known aliases so migrations work regardless of which var is set.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (!url) {
  console.warn("⚠️  No database URL found — skipping prisma migrate deploy");
  process.exit(0);
}

// Expose as DATABASE_URL so prisma migrate deploy picks it up
process.env.DATABASE_URL = url;

console.log("Running prisma migrate deploy...");
execSync("prisma migrate deploy", { stdio: "inherit" });
