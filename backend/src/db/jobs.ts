import { randomUUID } from "node:crypto";
import { db } from "./client";

export class AnalysisJobRepository {
  private readonly insertAnalysisJob = db.prepare(`
    INSERT INTO analysis_jobs (id, source_url, status, created_at)
    VALUES (@id, @sourceUrl, @status, @createdAt)
  `);

  createAnalysisJob(sourceUrl: string): string {
    const jobId = randomUUID();
    this.insertAnalysisJob.run({
      id: jobId,
      sourceUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return jobId;
  }
}

export const analysisJobRepository = new AnalysisJobRepository();

export function createAnalysisJob(sourceUrl: string) {
  return analysisJobRepository.createAnalysisJob(sourceUrl);
}
