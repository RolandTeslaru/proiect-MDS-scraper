import { randomUUID } from "node:crypto";
import { db } from "./client";

const insertAnalysisJob = db.prepare(`
  INSERT INTO analysis_jobs (id, source_url, status, created_at)
  VALUES (@id, @sourceUrl, @status, @createdAt)
`);

export function createAnalysisJob(sourceUrl: string): string {
  const jobId = randomUUID();
  insertAnalysisJob.run({
    id: jobId,
    sourceUrl,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return jobId;
}
