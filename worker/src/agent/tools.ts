import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Page } from "playwright";
import { log } from "../logger.js";

// shared page ref — set before running the agent
let activePage: Page | null = null;

export function setActivePage(page: Page) {
  activePage = page;
}

// Run context for the save_video tool — which run to save into, where the
// backend lives, and how many times each video has been retried.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3003";
const MAX_SAVE_RETRIES = 3;

let activeRunId: string | null = null;
const saveAttempts = new Map<string, number>();

export function setRunId(runId: string) {
  activeRunId = runId;
  saveAttempts.clear();
}

function page(): Page {
  if (!activePage) throw new Error("No active page — call setActivePage first");
  return activePage;
}

export const navigateTo = tool(
  async ({ url }) => {
    log.tool(`navigate_to → ${url}`);
    await page().goto(url, { waitUntil: "domcontentloaded" });
    // wait for either a video player or a feed container to confirm page is ready
    await Promise.race([
      page().waitForSelector("video", { timeout: 10000 }),
      page().waitForSelector("[data-e2e='browse-video']", { timeout: 10000 }),
      page().waitForSelector("[class*='DivVideoFeed']", { timeout: 10000 }),
      page().waitForTimeout(5000),
    ]).catch(() => {});
    // TikTok is a heavy SPA — let the network settle so the video page and its
    // comments actually render before we try to read them.
    await page().waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    const title = await page().title();
    log.tool(`navigate_to ← "${title}"`);
    return `Navigated to: ${title}`;
  },
  {
    name: "navigate_to",
    description: "Navigate the browser to a URL and return the page title",
    schema: z.object({ url: z.string().describe("Full URL to navigate to") }),
  }
);

export const getPageText = tool(
  async () => {
    log.tool("get_page_text");
    const text = await page().innerText("body");
    return text.slice(0, 4000);
  },
  {
    name: "get_page_text",
    description: "Get visible text from the current page (first 4000 chars)",
    schema: z.object({}),
  }
);

export const extractLinks = tool(
  async ({ selector }) => {
    log.tool(`extract_links selector="${selector}"`);
    const hrefs = await page().evaluate((sel: string) => {
      return [...document.querySelectorAll(`${sel} a`)].map(
        (a) => (a as HTMLAnchorElement).href
      );
    }, selector);
    return JSON.stringify(hrefs.slice(0, 50));
  },
  {
    name: "extract_links",
    description: "Extract all href links scoped to a CSS selector",
    schema: z.object({
      selector: z.string().default("body").describe("CSS selector scope"),
    }),
  }
);

export const scrollPage = tool(
  async ({ distance }) => {
    log.tool(`scroll_page ${distance}px`);
    await page().mouse.wheel(0, distance);
    await page().waitForTimeout(800 + Math.random() * 600);
    return `Scrolled ${distance}px`;
  },
  {
    name: "scroll_page",
    description: "Scroll the page down by a number of pixels",
    schema: z.object({
      distance: z.number().default(800).describe("Pixels to scroll down"),
    }),
  }
);

export const waitForElement = tool(
  async ({ selector, timeout }) => {
    log.tool(`wait_for_element "${selector}"`);
    await page().waitForSelector(selector, { timeout });
    return `Element "${selector}" appeared`;
  },
  {
    name: "wait_for_element",
    description: "Wait until a CSS selector is visible on the page",
    schema: z.object({
      selector: z.string(),
      timeout: z.number().default(10000),
    }),
  }
);

export const getElementText = tool(
  async ({ selector }) => {
    log.tool(`get_element_text "${selector}"`);
    return await page().innerText(selector);
  },
  {
    name: "get_element_text",
    description: "Get inner text of a specific element by CSS selector",
    schema: z.object({ selector: z.string() }),
  }
);

export const clickElement = tool(
  async ({ selector }) => {
    log.tool(`click_element "${selector}"`);
    await page().click(selector);
    await page().waitForTimeout(500 + Math.random() * 500);
    return `Clicked "${selector}"`;
  },
  {
    name: "click_element",
    description: "Click an element by CSS selector",
    schema: z.object({ selector: z.string() }),
  }
);

export const extractVideoUrl = tool(
  async () => {
    log.tool("extract_video_url");
    // tries to pull the direct MP4 src from the page
    const src = await page().evaluate(() => {
      const video = document.querySelector("video");
      return video?.src ?? video?.querySelector("source")?.getAttribute("src") ?? null;
    });
    if (src) return src;

    // fallback: look inside __UNIVERSAL_DATA_FOR_REHYDRATION__
    const raw = await page()
      .locator('script#SIGI_STATE, script[id*="UNIVERSAL_DATA"]')
      .first()
      .innerText()
      .catch(() => "");
    if (raw) {
      const match = raw.match(/"playAddr":"([^"]+)"/);
      if (match) return decodeURIComponent(match[1].replace(/\\u002F/g, "/"));
    }
    return "No video URL found on this page";
  },
  {
    name: "extract_video_url",
    description:
      "Extract the direct MP4 video URL from the current TikTok video page",
    schema: z.object({}),
  }
);

export const getTikTokVideoLinks = tool(
  async ({ query, scrolls }) => {
    const url = `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;
    log.tool(`get_tiktok_video_links navigating to ${url}`);
    await page().goto(url, { waitUntil: "domcontentloaded" });

    // wait until at least one video link appears in the DOM
    await page().waitForSelector("a[href*='/video/']", { timeout: 15000 })
      .catch(() => log.tool("get_tiktok_video_links — no video links appeared after 15s, continuing anyway"));

    for (let i = 0; i < scrolls; i++) {
      await page().mouse.wheel(0, 1000);
      await page().waitForTimeout(1500 + Math.random() * 500);
    }

    const links = await page().evaluate(() => {
      return [...document.querySelectorAll("a[href*='/video/']")]
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((h, i, arr) => arr.indexOf(h) === i);
    });
    log.tool(`get_tiktok_video_links ← ${links.length} video links`);
    return JSON.stringify(links.slice(0, 10));
  },
  {
    name: "get_tiktok_video_links",
    description: "Search TikTok for a query and return unique video URLs from the results",
    schema: z.object({
      query: z.string().describe("Search query or hashtag"),
      scrolls: z.number().default(3).describe("How many times to scroll to load more videos"),
    }),
  }
);

export const getCommentsHtml = tool(
  async () => {
    log.tool(`get_comments_html on ${page().url()}`);

    // On TikTok's short-form video page the comments are hidden until you click
    // the comment button. Click it to open the panel. Do NOT scroll the page —
    // a page scroll jumps to the next video.
    const commentButton = await page()
      .$("[data-e2e='comment-icon'], [data-e2e='browse-comment'], button[aria-label*='omment']")
      .catch(() => null);
    if (commentButton) {
      log.tool("get_comments_html — clicking comment button to open the panel");
      await commentButton.click().catch(() => {});
    } else {
      log.tool("get_comments_html — comment button not found");
    }

    // Wait for the comments to render after opening the panel.
    await page()
      .waitForSelector("[data-e2e='comment-level-1']", { timeout: 10000 })
      .catch(() => {});

    let html = "";
    let diag = { items: 0, text: 0, bodyLen: 0 };
    try {
      // NOTE: keep this callback free of NAMED functions/classes. tsx/esbuild
      // wraps those in a __name() helper that does not exist in the browser, so
      // page.evaluate throws "ReferenceError: __name is not defined". Only
      // anonymous arrow callbacks are safe here.
      const result = await page().evaluate(() => {
        // Prefer the stable data-e2e comment items — this gives us ONLY the
        // comments (no nav/header/recommendations), so nothing useful is lost to
        // the size cap. Fall back to the whole body if TikTok changed the markup.
        const items = document.querySelectorAll("[data-e2e='comment-level-1']");
        const diag = {
          items: items.length,
          text: document.querySelectorAll("[data-e2e='comment-text']").length,
          bodyLen: document.body?.innerText?.length ?? 0,
        };

        const raw =
          items.length > 0
            ? [...items].map((el) => el.outerHTML).join("")
            : document.body.innerHTML;

        const wrap = document.createElement("div");
        wrap.innerHTML = raw;
        wrap
          .querySelectorAll("script,style,svg,noscript,img,video,canvas,iframe,path,link")
          .forEach((el) => el.remove());
        wrap.querySelectorAll("*").forEach((el) => {
          for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
        });

        return { html: wrap.innerHTML, diag };
      });
      html = result.html;
      diag = result.diag;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.error(`get_comments_html — evaluate failed: ${message}`);
      return `Could not read the page (${message}). The page may not have loaded. Save this video with an empty comments array and continue.`;
    }

    log.tool(
      `get_comments_html diag: comment-level-1=${diag.items}, comment-text=${diag.text}, bodyTextLen=${diag.bodyLen}`,
    );

    const cleaned = html
      .replace(/<(\w+)>\s*<\/\1>/g, "") // drop now-empty tags
      .replace(/\s+/g, " ") // collapse whitespace
      .trim()
      .slice(0, 8000); // cap so a huge page can't blow up the context

    if (!cleaned || diag.items + diag.text === 0) {
      log.tool("get_comments_html ← no comments found");
      return "No readable comments found for this video. Save it with an empty comments array.";
    }

    log.tool(
      `get_comments_html ← ${cleaned.length} chars (${diag.items > 0 ? "comment items" : "body fallback"})`,
    );
    return cleaned;
  },
  {
    name: "get_comments_html",
    description:
      "Open the current TikTok video's comments and return their sanitized HTML (tags + text only). Read it and extract the comments yourself.",
    schema: z.object({
    }),
  }
);

export const saveVideo = tool(
  async ({ url, comments }) => {
    log.tool(`save_video → ${url} (${comments.length} comments)`);

    if (!activeRunId) {
      return "ERROR: no active run. Cannot save — stop and report the problem.";
    }

    const attempts = (saveAttempts.get(url) ?? 0) + 1;
    saveAttempts.set(url, attempts);

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/scrapes/${activeRunId}/videos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, comments }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as { savedComments: number };
        saveAttempts.delete(url);
        log.ok(`save_video ← saved ${data.savedComments} comments for ${url}`);
        return `Saved ${data.savedComments} comments for ${url}.`;
      }

      // Backend rejected the data (e.g. validation). Tell the agent what was
      // wrong so it can fix the payload and call save_video again.
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string[];
      };
      const reason = err.details?.join("; ") ?? err.error ?? `HTTP ${res.status}`;

      if (attempts >= MAX_SAVE_RETRIES) {
        saveAttempts.delete(url);
        log.error(`save_video — giving up on ${url} after ${attempts} tries: ${reason}`);
        return `Could not save ${url} after ${attempts} attempts (${reason}). Skip this video and continue with the next one.`;
      }

      log.error(`save_video — backend rejected ${url}: ${reason}`);
      return `Save failed (${reason}). Fix the data and call save_video again for ${url}.`;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (attempts >= MAX_SAVE_RETRIES) {
        saveAttempts.delete(url);
        return `Could not reach the backend for ${url} after ${attempts} attempts (${message}). Skip this video and continue.`;
      }
      return `Could not reach the backend (${message}). Call save_video again for ${url}.`;
    }
  },
  {
    name: "save_video",
    description:
      "Save one video and its extracted comments to the database. Call this right after extracting a video's comments. Returns an error message if the data is invalid — fix it and call again.",
    schema: z.object({
      url: z.string().describe("The TikTok video URL"),
      comments: z
        .array(
          z.object({
            author: z.string().describe("Commenter @username"),
            text: z.string().min(1).describe("The comment text"),
            likes: z.string().describe("Like count as a string, e.g. \"42\""),
          }),
        )
        .describe("The comments extracted for this video"),
    }),
  }
);

export const allTools = [
  navigateTo,
  getPageText,
  extractLinks,
  getTikTokVideoLinks,
  scrollPage,
  waitForElement,
  getElementText,
  clickElement,
  extractVideoUrl,
  getCommentsHtml,
  saveVideo,
];
