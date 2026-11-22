/**
 * Database lifecycle. Usage:
 *   tsx scripts/db.ts setup   create the database if missing (migrate + seed); no-op otherwise
 *   tsx scripts/db.ts reset   delete the database file, then migrate + seed
 *   tsx scripts/db.ts migrate apply pending migrations from ./drizzle
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seed } from "@/db/seed";
import { now } from "@/lib/clock";
import * as authSchema from "@/lib/db/auth-schema";
import * as schema from "@/lib/db/schema";

const file = process.env.DATABASE_FILE ?? "data/slotly.db";
const command = process.argv[2] ?? "setup";

function removeDatabase(): void {
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
}

function open() {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return { sqlite, db: drizzle({ client: sqlite, schema: { ...schema, ...authSchema } }) };
}

function createFresh(): void {
  const { sqlite, db } = open();
  try {
    migrate(db, { migrationsFolder: "drizzle" });
    seed(db, now());
  } finally {
    sqlite.close();
  }
}

switch (command) {
  case "setup":
    if (fs.existsSync(file)) {
      const { sqlite, db } = open();
      migrate(db, { migrationsFolder: "drizzle" });
      sqlite.close();
      console.log(`Database ready: ${file}`);
    } else {
      createFresh();
      console.log(`Database created and seeded: ${file}`);
    }
    break;
  case "reset":
    removeDatabase();
    createFresh();
    console.log(`Database reset and seeded: ${file}`);
    break;
  case "migrate": {
    const { sqlite, db } = open();
    migrate(db, { migrationsFolder: "drizzle" });
    sqlite.close();
    console.log(`Migrations applied: ${file}`);
    break;
  }
  default:
    console.error(`Unknown command "${command}". Use setup, reset or migrate.`);
    process.exit(1);
}
