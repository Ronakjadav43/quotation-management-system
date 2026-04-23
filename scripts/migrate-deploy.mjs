import { execSync } from "node:child_process";
import { config } from "dotenv";

config(); // load .env for local builds (no-op on Vercel where env vars are injected)

if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL is not set — skipping prisma migrate deploy");
  process.exit(0);
}

console.log("Running prisma migrate deploy...");
execSync("prisma migrate deploy", { stdio: "inherit" });
