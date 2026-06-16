import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { log } from "../logger.js";

const run = promisify(execFile);
const DIR = path.resolve("tmp_videos");

// Download a TikTok video to a local .mp4 using yt-dlp (a system dependency:
// `brew install yt-dlp`). Returns the file path. Throws if yt-dlp is missing
// or the download fails.
export async function downloadVideo(jobId: string, url: string): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const out = path.join(DIR, `${jobId}.mp4`);
  log.tool(`download_video ${jobId} ← ${url}`);
  try {
    await run("yt-dlp", ["-f", "mp4", "--no-playlist", "-o", out, url]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`yt-dlp failed (is it installed? brew install yt-dlp): ${message}`);
  }
  log.tool(`download_video → ${out}`);
  return out;
}

// Best-effort cleanup of a downloaded file once the job is done.
export async function removeVideo(jobId: string): Promise<void> {
  const out = path.join(DIR, `${jobId}.mp4`);
  await rm(out, { force: true }).catch(() => {});
}
