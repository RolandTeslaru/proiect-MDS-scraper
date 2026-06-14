import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeSchema } from "./schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(__dirname, "../../data");
mkdirSync(dataDirectory, { recursive: true });

const databasePath =
  process.env.SQLITE_PATH ?? path.join(dataDirectory, "scraped_videos.sqlite");

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

initializeSchema(db);

export function getDatabasePath() {
  return databasePath;
}

export { db };
