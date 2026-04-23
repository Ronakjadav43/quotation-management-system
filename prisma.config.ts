import "dotenv/config";
import { defineConfig } from "prisma/config";

// Supabase Vercel integration may not set DATABASE_URL directly.
// Fall back to POSTGRES_URL_NON_POOLING (direct connection, no pgBouncer).
const url =
  process.env["DATABASE_URL"] ||
  process.env["POSTGRES_URL_NON_POOLING"] ||
  process.env["POSTGRES_URL"] ||
  "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
