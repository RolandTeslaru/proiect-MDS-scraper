import assert from "node:assert/strict";
import test from "node:test";
import { parseScrapeResultFromAgentOutput } from "./graph.js";

test("parseScrapeResultFromAgentOutput extracts a JSON object from agent output", () => {
  const output = `Here is the final result:
{
  "videos": [
    {
      "url": "https://www.tiktok.com/@user/video/123",
      "comments": [
        { "author": "alice", "text": "first", "likes": "12" }
      ]
    }
  ]
}
`;

  assert.deepEqual(parseScrapeResultFromAgentOutput(output), {
    videos: [
      {
        url: "https://www.tiktok.com/@user/video/123",
        comments: [{ author: "alice", text: "first", likes: "12" }],
      },
    ],
  });
});

test("parseScrapeResultFromAgentOutput returns an empty result for invalid JSON", () => {
  const output = `Result:
{
  "videos": [
    { "url": "broken"
  ]
}
`;

  assert.deepEqual(parseScrapeResultFromAgentOutput(output), { videos: [] });
});
