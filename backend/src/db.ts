import { DatabaseManager, db, getDatabasePath, databaseManager } from "./db/client";
import { AnalysisJobRepository, analysisJobRepository, createAnalysisJob, updateJobResult, listJobs, getJobById } from "./db/jobs";
import {
  ScrapeRepository,
  getScrapeRunById,
  listScrapeRuns,
  saveScrapeResult,
  scrapeRepository,
} from "./db/scrapes";

export class BackendDatabase {
  private static instance: BackendDatabase | undefined;

  readonly manager = databaseManager;
  readonly scrapes = scrapeRepository;
  readonly jobs = analysisJobRepository;

  private constructor() {}

  static getInstance() {
    if (!BackendDatabase.instance) {
      BackendDatabase.instance = new BackendDatabase();
    }

    return BackendDatabase.instance;
  }

  get db() {
    return this.manager.connection;
  }

  getDatabasePath() {
    return this.manager.databasePath;
  }
}

const backendDatabase = BackendDatabase.getInstance();

export {
  AnalysisJobRepository,
  DatabaseManager,
  ScrapeRepository,
  analysisJobRepository,
  backendDatabase,
  createAnalysisJob,
  updateJobResult,
  listJobs,
  getJobById,
  db,
  getDatabasePath,
  getScrapeRunById,
  listScrapeRuns,
  saveScrapeResult,
  scrapeRepository,
};
export type {
  ScrapeRunSummary,
  SearchResult,
  StoredComment,
  StoredScrapeRun,
  StoredVideo,
  TikTokComment,
  TikTokVideo,
} from "./db/types";
export type { AnalysisJob, JobStatus, Verdict } from "./db/jobs";
