import express from "express";
import cors from "cors";
import {
  getDatabasePath,
  getScrapeRunById,
  listScrapeRuns,
  saveScrapeResult,
  listJobs,
  getJobById,
  getCommentsBySourceUrl,
} from "./db";
import { normalizeSearchResult } from "./normalizeSearchResult";
import { addJob } from "./queue";

const WORKER_URL = process.env.WORKER_URL ?? "http://localhost:3002";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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

app.get("/api/jobs", (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const jobs = listJobs(Number.isFinite(limit) ? limit : 50);
  res.json({ jobs });
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

  try {
    const jobId = await addJob(url);
    res.status(202).json({
      message: "Video added to processing queue",
      jobId,
    });
  } catch (error) {
    console.error("[backend] Error queuing job:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// POST /api/search  { "query": "climate change" }
app.post("/api/search", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "Missing 'query' field" });
    return;
  }

  try {
    const response = await fetch(`${WORKER_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      res.status(502).json({ error: "Worker error", details: err });
      return;
    }

    const data = normalizeSearchResult(await response.json());
    const savedRun = saveScrapeResult(query.trim(), data);
    res.json({
      ...data,
      runId: savedRun.id,
      savedAt: savedRun.createdAt,
    });
  } catch (error) {
    console.error("[backend] Search error:", error);
    res.status(500).json({ error: "Failed to contact worker" });
  }
});

const PORT = Number(process.env.PORT ?? 3003);
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
