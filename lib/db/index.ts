import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

export const DATABASE_FILE = process.env.DATABASE_FILE ?? "data/slotly.db";

function openDatabase(file: string): Database.Database {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { slotlySqlite?: Database.Database };
const sqlite = globalForDb.slotlySqlite ?? openDatabase(DATABASE_FILE);
if (process.env.NODE_ENV !== "production") globalForDb.slotlySqlite = sqlite;

export const db = drizzle({ client: sqlite, schema: { ...schema, ...authSchema } });
export type Db = typeof db;
