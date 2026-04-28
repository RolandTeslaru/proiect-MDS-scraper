import "dotenv/config";
import express from "express";
import { runScrapeAgent } from "./agent/graph.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// POST /scrape  { "task": "Find the MP4 URL for https://www.tiktok.com/@user/video/123" }
app.post("/scrape", async (req, res) => {
  const { task } = req.body as { task?: string };
  if (!task) {
    res.status(400).json({ error: "Missing 'task' field" });
    return;
  }

  try {
    const result = await runScrapeAgent(task);
    res.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => {
  console.log(`[worker] listening on http://localhost:${PORT}`);
});
