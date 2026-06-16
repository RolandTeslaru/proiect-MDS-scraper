import "dotenv/config";
import express from "express";
import { runScrapeAgent } from "./agent/graph.js";
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

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => {
  log.ok(`worker listening on http://localhost:${PORT}`);
});
