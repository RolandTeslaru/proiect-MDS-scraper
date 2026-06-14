import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSearchResult } from "./normalizeSearchResult";

test("normalizeSearchResult returns an empty result for invalid payloads", () => {
  assert.deepEqual(normalizeSearchResult(null), { videos: [] });
  assert.deepEqual(normalizeSearchResult({ foo: "bar" }), { videos: [] });
});

test("normalizeSearchResult keeps valid videos and sanitizes comments", () => {
  const result = normalizeSearchResult({
    videos: [
      {
        url: "  https://www.tiktok.com/@user/video/123  ",
        comments: [
          { author: "alice", text: "hello", likes: 5 },
          { author: "bob", text: "   ", likes: "8" },
          { author: 123, text: "second", likes: null },
          null,
        ],
      },
      {
        url: "",
        comments: [{ author: "ignored", text: "ignored", likes: "1" }],
      },
      "bad-video",
    ],
  });

  assert.deepEqual(result, {
    videos: [
      {
        url: "https://www.tiktok.com/@user/video/123",
        comments: [
          { author: "alice", text: "hello", likes: "5" },
          { author: "", text: "second", likes: "0" },
        ],
      },
    ],
  });
});
