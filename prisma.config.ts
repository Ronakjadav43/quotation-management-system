import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prefer the pooler URL (IPv4-accessible from Vercel) over the direct host (IPv6-only).
// POSTGRES_URL_NON_POOLING = session-mode pooler, works with Prisma migrate.
const url =
  process.env["POSTGRES_URL_NON_POOLING"] ||
  process.env["DATABASE_URL"] ||
  process.env["POSTGRES_URL"] ||
  "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
