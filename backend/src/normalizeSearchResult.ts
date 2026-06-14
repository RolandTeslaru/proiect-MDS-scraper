import type { SearchResult } from "./db";

export function normalizeSearchResult(payload: unknown): SearchResult {
  if (!payload || typeof payload !== "object") {
    return { videos: [] };
  }

  const maybeVideos = (payload as { videos?: unknown[] }).videos;
  if (!Array.isArray(maybeVideos)) {
    return { videos: [] };
  }

  return {
    videos: maybeVideos
      .map((video) => {
        if (!video || typeof video !== "object") {
          return null;
        }

        const url = typeof (video as { url?: unknown }).url === "string"
          ? (video as { url: string }).url.trim()
          : "";
        const rawComments = Array.isArray((video as { comments?: unknown[] }).comments)
          ? (video as { comments: unknown[] }).comments
          : [];

        if (!url) {
          return null;
        }

        return {
          url,
          comments: rawComments
            .map((comment) => {
              if (!comment || typeof comment !== "object") {
                return null;
              }

              return {
                author: typeof (comment as { author?: unknown }).author === "string"
                  ? (comment as { author: string }).author
                  : "",
                text: typeof (comment as { text?: unknown }).text === "string"
                  ? (comment as { text: string }).text
                  : "",
                likes: typeof (comment as { likes?: unknown }).likes === "string"
                  ? (comment as { likes: string }).likes
                  : String((comment as { likes?: unknown }).likes ?? "0"),
              };
            })
            .filter((comment): comment is SearchResult["videos"][number]["comments"][number] => {
              return comment !== null && comment.text.trim().length > 0;
            }),
        };
      })
      .filter((video): video is SearchResult["videos"][number] => video !== null),
  };
}
