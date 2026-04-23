import pg from "pg";
import { execSync } from "node:child_process";
import { config } from "dotenv";

config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Dropping all tables in public schema...");
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );
    for (const { tablename } of tables) {
      await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      console.log(`  dropped table: ${tablename}`);
    }

    console.log("Dropping all custom enum types...");
    const { rows: types } = await client.query(
      `SELECT typname FROM pg_type
       WHERE typtype = 'e'
         AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
    );
    for (const { typname } of types) {
      await client.query(`DROP TYPE IF EXISTS "${typname}" CASCADE`);
      console.log(`  dropped type: ${typname}`);
    }

    console.log("Schema cleared.");
  } finally {
    client.release();
    await pool.end();
  }

  console.log("\nRunning prisma migrate deploy...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
