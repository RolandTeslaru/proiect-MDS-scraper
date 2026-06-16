import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { downloadVideo, removeVideo } from "./videoDownload.js";
import { fetchComments, postResult } from "./backendClient.js";
import { log } from "../logger.js";

// Structured output — withStructuredOutput guarantees the model returns this
// exact shape, so we don't need the JSON autocorrection loop Agent 1 has.
const VerdictSchema = z.object({
  verdict: z.enum(["disinformation", "authentic"]),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  reasons: z.array(z.string()),
});
export type VerdictResult = z.infer<typeof VerdictSchema>;

const SYSTEM = `You are a disinformation analyst. You are given a short TikTok video and
the comments scraped from it. Watch the video carefully — its visuals, audio/narration
and any on-screen text — and decide whether it spreads disinformation or is authentic.

Be specific and ground your verdict in what you actually saw and heard. Treat the
comments only as a secondary signal, not as proof. Return:
- verdict: "disinformation" or "authentic"
- confidence: how sure you are, calibrated honestly — NOT a default value
- evidence: one short concrete observation/quote from the video that drove your verdict
- reasons: 2 to 5 short signals supporting the verdict

Calibrate confidence to the actual strength of the evidence. Do not default to a round
number — most real cases are NOT 0.9. Use this scale:
- 0.50–0.65: weak/ambiguous signals, could easily go either way, short or unclear video
- 0.66–0.80: a reasonable lean, but with some doubt or missing context
- 0.81–0.92: strong, clear evidence in the video itself
- 0.93–0.99: unmistakable, multiple independent confirmations
Before finalizing, ask: "what would make me less sure?" and lower the number for every
real uncertainty (low quality, satire/parody, missing source, out-of-context clips,
opinion vs claim). Vary the value — two different videos should rarely get the same one.`;

export async function classifyVideo(
  jobId: string,
  url: string,
): Promise<VerdictResult> {
  log.agent(`classify ${jobId} — ${url}`);

  const videoPath = await downloadVideo(jobId, url);
  const comments = await fetchComments(url).catch(() => []);
  log.tool(`classify — ${comments.length} comments as context`);

  const videoB64 = (await readFile(videoPath)).toString("base64");

  const model = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    temperature: 0,
  }).withStructuredOutput(VerdictSchema);

  const commentsText = comments.length
    ? comments.map((c) => `@${c.author}: ${c.text}`).join("\n")
    : "(no comments scraped)";

  const result = (await model.invoke([
    new SystemMessage(SYSTEM),
    new HumanMessage({
      content: [
        { type: "text", text: `Scraped comments:\n${commentsText}` },
        { type: "media", mimeType: "video/mp4", data: videoB64 },
      ],
    }),
  ])) as VerdictResult;

  log.agent(
    `classify ${jobId} → ${result.verdict} (${result.confidence})`,
  );
  return result;
}

// Agent 2 shares no global browser state, but keep classification jobs serial
// to avoid running several Gemini video uploads at once.
let classifyChain: Promise<unknown> = Promise.resolve();

export function runClassifyJob(jobId: string, url: string): Promise<void> {
  const run = classifyChain.then(() => executeClassify(jobId, url));
  classifyChain = run.catch(() => {});
  return run;
}

async function executeClassify(jobId: string, url: string): Promise<void> {
  try {
    await postResult(jobId, { status: "processing" });
    const result = await classifyVideo(jobId, url);
    await postResult(jobId, { status: "done", ...result });
    log.ok(`classify done — job ${jobId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`classify failed — job ${jobId}: ${message}`);
    await postResult(jobId, {
      status: "failed",
      evidence: message.slice(0, 500),
    }).catch(() => {});
  } finally {
    await removeVideo(jobId);
  }
}
