import express from "express";
import cors from "cors";
import { addJob } from "./queue";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const sendHealth = (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
  console.log("[backend] Health check OK")
};

app.get("/health", sendHealth);
app.get("/api/health", sendHealth);

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

const PORT = Number(process.env.PORT ?? 3003);
app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});
