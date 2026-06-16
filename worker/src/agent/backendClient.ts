const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3003";

export interface StoredComment {
  author: string;
  text: string;
  likes: string;
}

// Read the comments the scraper already saved for this video, to feed them to
// the classifier alongside the video itself.
export async function fetchComments(url: string): Promise<StoredComment[]> {
  const res = await fetch(
    `${BACKEND_URL}/api/comments?url=${encodeURIComponent(url)}`,
  );
  if (!res.ok) return [];
  return (await res.json()) as StoredComment[];
}

// Report the classifier's verdict (or a failure) back to the backend.
export async function postResult(jobId: string, body: unknown): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`postResult ${res.status}: ${detail}`);
  }
}
