export { getDatabasePath } from "./db/client";
export { createAnalysisJob } from "./db/jobs";
export { getScrapeRunById, listScrapeRuns, saveScrapeResult } from "./db/scrapes";
export type {
  ScrapeRunSummary,
  SearchResult,
  StoredComment,
  StoredScrapeRun,
  StoredVideo,
  TikTokComment,
  TikTokVideo,
} from "./db/types";
