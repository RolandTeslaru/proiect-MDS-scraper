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

declare global {
  // Reuse the same DB manager across imports and hot reloads in this process.
  // eslint-disable-next-line no-var
  var __backendDbSingleton__: DatabaseManager | undefined;
}

export class DatabaseManager {
  private static instance: DatabaseManager | undefined;
  public readonly connection: Database.Database;
  public readonly databasePath: string;

  private constructor(targetPath: string) {
    this.databasePath = targetPath;
    this.connection = new Database(targetPath);
    this.connection.pragma("journal_mode = WAL");
    this.connection.pragma("foreign_keys = ON");
    initializeSchema(this.connection);
  }

  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance =
        globalThis.__backendDbSingleton__ ?? new DatabaseManager(databasePath);
      globalThis.__backendDbSingleton__ = DatabaseManager.instance;
    }

    return DatabaseManager.instance;
  }
}

const databaseManager = DatabaseManager.getInstance();
const db = databaseManager.connection;

export function getDatabasePath() {
  return databaseManager.databasePath;
}

export { databaseManager, db };
