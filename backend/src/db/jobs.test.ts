import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type Database from "better-sqlite3";
import type { AnalysisJob, JobStatus, Verdict } from "./jobs";

const tempDirectory = mkdtempSync(join(tmpdir(), "mds-jobs-"));
const databasePath = join(tempDirectory, "jobs.sqlite");
const originalSqlitePath = process.env.SQLITE_PATH;

let db: Database.Database;
let createAnalysisJob: (sourceUrl: string) => string;
let listJobs: (limit?: number) => AnalysisJob[];
let updateJobResult: (
  id: string,
  status: JobStatus,
  verdict: Verdict,
  confidence: number | null,
  evidence: string | null,
  reasons: string[] | null,
) => void;
let getJobById: (id: string) => AnalysisJob | null;

before(async () => {
  process.env.SQLITE_PATH = databasePath;

  const clientModule = await import("./client");
  const jobsModule = await import("./jobs");

  db = clientModule.db;
  createAnalysisJob = jobsModule.createAnalysisJob;
  listJobs = jobsModule.listJobs;
  updateJobResult = jobsModule.updateJobResult;
  getJobById = jobsModule.getJobById;
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

test("updateJobResult stores the classifier verdict and round-trips reasons", () => {
  const jobId = createAnalysisJob("https://www.tiktok.com/@user/video/42");

  updateJobResult(
    jobId,
    "done",
    "disinformation",
    0.92,
    "On-screen text claims a debunked statistic.",
    ["fabricated statistic", "no credible source", "emotional manipulation"],
  );

  const job = getJobById(jobId);
  assert.ok(job);
  assert.equal(job?.status, "done");
  assert.equal(job?.verdict, "disinformation");
  assert.equal(job?.confidence, 0.92);
  assert.equal(job?.evidence, "On-screen text claims a debunked statistic.");
  assert.deepEqual(job?.reasons, [
    "fabricated statistic",
    "no credible source",
    "emotional manipulation",
  ]);
  assert.ok(job?.processedAt);
});

test("listJobs respects the requested limit", () => {
  createAnalysisJob("https://www.tiktok.com/@user/video/1");
  createAnalysisJob("https://www.tiktok.com/@user/video/2");
  createAnalysisJob("https://www.tiktok.com/@user/video/3");

  const jobs = listJobs(2);

  assert.equal(jobs.length, 2);
});
