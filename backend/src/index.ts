import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  addVideoWithComments,
  createRun,
  getDatabasePath,
  getScrapeRunById,
  listScrapeRuns,
  runExists,
  listJobs,
  getJobById,
  getCommentsBySourceUrl,
} from "./db";
import {
  parseExportFormat,
  serializeJobsCsv,
  serializeJsonDownload,
  serializeScrapeRunCsv,
  setDownloadHeaders,
} from "./export";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:3002";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Defensive validation for the per-video save endpoint the worker calls. The
// worker validates the same shape with zod before sending, but we never trust
// the network — a bad payload here returns 400 so the agent can correct it.
const videoPayloadSchema = z.object({
  url: z.string().min(1, "url is required"),
  comments: z
    .array(
      z.object({
        author: z.string().default(""),
        text: z.string().min(1, "comment text is required"),
        likes: z.string().default("0"),
      }),
    )
    .default([]),
});

const sendHealth = (_req: express.Request, res: express.Response) => {
  res.json({ ok: true, databasePath: getDatabasePath() });
  console.log("[backend] Health check OK");
};

app.get("/health", sendHealth);
app.get("/api/health", sendHealth);

app.get("/api/scrapes", (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  const scrapes = listScrapeRuns(Number.isFinite(limit) ? limit : 20);
  res.json({ scrapes });
});

app.get("/api/scrapes/:id", (req, res) => {
  const scrapeRun = getScrapeRunById(req.params.id);
  if (!scrapeRun) {
    res.status(404).json({ error: "Scrape run not found" });
    return;
  }

  res.json(scrapeRun);
});

app.get("/api/scrapes/:id/export", (req, res) => {
  const scrapeRun = getScrapeRunById(req.params.id);
  if (!scrapeRun) {
    res.status(404).json({ error: "Scrape run not found" });
    return;
  }

  const format = parseExportFormat(req.query.format);
  if (!format) {
    res.status(400).json({ error: "Export format must be 'json' or 'csv'" });
    return;
  }

  setDownloadHeaders(res, `scrape-${scrapeRun.id}`, format);
  res.send(
    format === "csv"
      ? serializeScrapeRunCsv(scrapeRun)
      : serializeJsonDownload(scrapeRun),
  );
});

app.get("/api/jobs", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const jobs = listJobs(Number.isFinite(limit) ? limit : 50);
  res.json({ jobs });
});

app.get("/api/jobs/export", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const jobs = listJobs(Number.isFinite(limit) ? limit : 50);
  const format = parseExportFormat(req.query.format);

  if (!format) {
    res.status(400).json({ error: "Export format must be 'json' or 'csv'" });
    return;
  }

  setDownloadHeaders(
    res,
    `jobs-${new Date().toISOString().replaceAll(":", "-")}`,
    format,
  );
  res.send(
    format === "csv"
      ? serializeJobsCsv(jobs)
      : serializeJsonDownload({ jobs }),
  );
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJobById(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const comments = getCommentsBySourceUrl(job.sourceUrl);
  res.json({ ...job, comments });
});

app.post("/api/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "TikTok URL is required" });
  }

  res.status(501).json({
    error:
      "Video analysis is not configured yet. This endpoint is disabled until the processing pipeline is implemented.",
    url,
  });
});

// POST /api/scrapes/:runId/videos — called by the worker once per video to
// persist results incrementally as the agent scrapes them.
app.post("/api/scrapes/:runId/videos", (req, res) => {
  const { runId } = req.params;

  if (!runExists(runId)) {
    res.status(404).json({ error: "Scrape run not found" });
    return;
  }

  const parsed = videoPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid video payload",
      details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    return;
  }

  try {
    const result = addVideoWithComments(runId, parsed.data);
    res.json(result);
  } catch (error) {
    console.error("[backend] Failed to save video:", error);
    res.status(500).json({ error: "Failed to save video" });
  }
});

// POST /api/search  { "query": "climate change" }
app.post("/api/search", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "Missing 'query' field" });
    return;
  }

  // Create the run up front so the worker's agent can save videos into it
  // incrementally (one HTTP call per video) while the scrape is running.
  const run = createRun(query.trim());

  try {
    const response = await fetch(`${WORKER_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), runId: run.id }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // The agent may still have saved some videos before failing — return
      // whatever made it into the DB rather than nothing.
      const partial = getScrapeRunById(run.id);
      res.status(502).json({ error: "Worker error", details: err, run: partial });
      return;
    }

    // Read the run back from the DB — it now holds everything the agent saved.
    const savedRun = getScrapeRunById(run.id);
    res.json({ ...savedRun, runId: run.id });
  } catch (error) {
    console.error("[backend] Search error:", error);
    const partial = getScrapeRunById(run.id);
    res.status(500).json({ error: "Failed to contact worker", run: partial });
  }
});

const PORT = Number(process.env.PORT ?? 3003);
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
