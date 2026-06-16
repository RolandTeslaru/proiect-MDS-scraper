import "dotenv/config";
import express from "express";
import { runScrapeAgent } from "./agent/graph.js";
import { runClassifyJob } from "./agent/classifier.js";
import { log } from "./logger.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
  log.info("health check");
});

// POST /scrape  { "query": "climate change", "runId": "..." }
app.post("/scrape", async (req, res) => {
  const { query, runId } = req.body as { query?: string; runId?: string };
  if (!query) {
    res.status(400).json({ error: "Missing 'query' field" });
    return;
  }
  if (!runId) {
    res.status(400).json({ error: "Missing 'runId' field" });
    return;
  }

  log.info(`POST /scrape query="${query}" runId=${runId}`);
  try {
    await runScrapeAgent(query, runId);
    log.ok(`POST /scrape → done (run ${runId})`);
    res.json({ ok: true, runId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`POST /scrape failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /analyze  { "jobId": "...", "url": "https://tiktok.com/..." }
// Agent 2: download the video, classify it with Gemini, and post the verdict
// back to the backend. Responds immediately; classification runs in background.
app.post("/analyze", (req, res) => {
  const { jobId, url } = req.body as { jobId?: string; url?: string };
  if (!jobId || !url) {
    res.status(400).json({ error: "Missing 'jobId' or 'url' field" });
    return;
  }

  log.info(`POST /analyze jobId=${jobId} url=${url}`);
  res.json({ ok: true, jobId });
  void runClassifyJob(jobId, url);
});

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => {
  log.ok(`worker listening on http://localhost:${PORT}`);
});
