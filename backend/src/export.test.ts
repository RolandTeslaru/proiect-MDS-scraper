import assert from "node:assert/strict";
import test from "node:test";
import {
  parseExportFormat,
  serializeJobsCsv,
  serializeJsonDownload,
  serializeScrapeRunCsv,
} from "./export";
import type { AnalysisJob, StoredScrapeRun } from "./db";

test("parseExportFormat accepts json by default and rejects unsupported formats", () => {
  assert.equal(parseExportFormat(undefined), "json");
  assert.equal(parseExportFormat("json"), "json");
  assert.equal(parseExportFormat("csv"), "csv");
  assert.equal(parseExportFormat("xml"), null);
});

test("serializeScrapeRunCsv flattens videos and comments into export rows", () => {
  const scrapeRun: StoredScrapeRun = {
    id: "run-1",
    query: "test query",
    createdAt: "2026-06-15T10:00:00.000Z",
    videoCount: 2,
    videos: [
      {
        id: "video-1",
        url: "https://tiktok.com/video-1",
        position: 0,
        comments: [
          {
            id: "comment-1",
            author: "alice",
            text: 'hello, "world"',
            likes: "5",
            position: 0,
          },
        ],
      },
      {
        id: "video-2",
        url: "https://tiktok.com/video-2",
        position: 1,
        comments: [],
      },
    ],
  };

  const csv = serializeScrapeRunCsv(scrapeRun);

  assert.match(
    csv,
    /"runId","query","createdAt","videoCount","videoId","videoPosition","videoUrl","commentId","commentPosition","commentAuthor","commentText","commentLikes"/,
  );
  assert.match(
    csv,
    /"run-1","test query","2026-06-15T10:00:00.000Z","2","video-1","0","https:\/\/tiktok\.com\/video-1","comment-1","0","alice","hello, ""world""","5"/,
  );
  assert.match(
    csv,
    /"run-1","test query","2026-06-15T10:00:00.000Z","2","video-2","1","https:\/\/tiktok\.com\/video-2","","","","",""/,
  );
});

test("serializeJobsCsv joins reasons and keeps empty nullable fields blank", () => {
  const jobs: AnalysisJob[] = [
    {
      id: "job-1",
      sourceUrl: "https://tiktok.com/video-1",
      status: "done",
      createdAt: "2026-06-15T11:00:00.000Z",
      verdict: "authentic",
      confidence: 0.92,
      processedAt: "2026-06-15T11:05:00.000Z",
      evidence: "Matched source",
      reasons: ["Source verified", "Audio consistent"],
    },
    {
      id: "job-2",
      sourceUrl: "https://tiktok.com/video-2",
      status: "pending",
      createdAt: "2026-06-15T11:10:00.000Z",
      verdict: null,
      confidence: null,
      processedAt: null,
      evidence: null,
      reasons: null,
    },
  ];

  const csv = serializeJobsCsv(jobs);

  assert.match(
    csv,
    /"id","sourceUrl","status","createdAt","verdict","confidence","processedAt","evidence","reasons"/,
  );
  assert.match(
    csv,
    /"job-1","https:\/\/tiktok\.com\/video-1","done","2026-06-15T11:00:00.000Z","authentic","0.92","2026-06-15T11:05:00.000Z","Matched source","Source verified \| Audio consistent"/,
  );
  assert.match(
    csv,
    /"job-2","https:\/\/tiktok\.com\/video-2","pending","2026-06-15T11:10:00.000Z","","","","",""/,
  );
});

test("serializeJsonDownload pretty prints JSON", () => {
  const json = serializeJsonDownload({ ok: true, jobs: [{ id: "job-1" }] });

  assert.equal(
    json,
    '{\n  "ok": true,\n  "jobs": [\n    {\n      "id": "job-1"\n    }\n  ]\n}',
  );
});
