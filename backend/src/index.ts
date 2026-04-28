import express from "express";
import cors from "cors";
import { addJob } from "./queue";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
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
        jobId 
    });
  } catch (error) {
    console.error("[backend] Error queuing job:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});