import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT ?? 3002);
app.listen(PORT, () => {
  console.log(`[worker] listening on http://localhost:${PORT}`);
});
