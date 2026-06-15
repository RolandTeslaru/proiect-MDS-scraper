import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type Database from "better-sqlite3";
import type { AnalysisJob } from "./jobs";

const tempDirectory = mkdtempSync(join(tmpdir(), "mds-jobs-"));
const databasePath = join(tempDirectory, "jobs.sqlite");
const originalSqlitePath = process.env.SQLITE_PATH;

let db: Database.Database;
let createAnalysisJob: (sourceUrl: string) => string;
let listJobs: (limit?: number) => AnalysisJob[];

before(async () => {
  process.env.SQLITE_PATH = databasePath;

  const clientModule = await import("./client");
  const jobsModule = await import("./jobs");

  db = clientModule.db;
  createAnalysisJob = jobsModule.createAnalysisJob;
  listJobs = jobsModule.listJobs;
});

beforeEach(() => {
  db.exec("DELETE FROM analysis_jobs");
});

after(() => {
  db.close();

  if (originalSqlitePath === undefined) {
    delete process.env.SQLITE_PATH;
  } else {
    process.env.SQLITE_PATH = originalSqlitePath;
  }

  rmSync(tempDirectory, { recursive: true, force: true });
});

test("createAnalysisJob persists a pending job that listJobs returns", () => {
  const sourceUrl = "https://www.tiktok.com/@user/video/123";
  const jobId = createAnalysisJob(sourceUrl);
  const jobs = listJobs();

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.id, jobId);
  assert.equal(jobs[0]?.sourceUrl, sourceUrl);
  assert.equal(jobs[0]?.status, "pending");
  assert.equal(jobs[0]?.verdict, null);
  assert.equal(jobs[0]?.confidence, null);
  assert.equal(jobs[0]?.processedAt, null);
  assert.equal(jobs[0]?.evidence, null);
  assert.equal(jobs[0]?.reasons, null);
});

test("listJobs respects the requested limit", () => {
  createAnalysisJob("https://www.tiktok.com/@user/video/1");
  createAnalysisJob("https://www.tiktok.com/@user/video/2");
  createAnalysisJob("https://www.tiktok.com/@user/video/3");

  const jobs = listJobs(2);

  assert.equal(jobs.length, 2);
});
