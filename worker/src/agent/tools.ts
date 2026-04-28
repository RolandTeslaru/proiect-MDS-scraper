import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Page } from "playwright";
import { log } from "../logger.js";

// shared page ref — set before running the agent
let activePage: Page | null = null;

export function setActivePage(page: Page) {
  activePage = page;
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

export const scrapeComments = tool(
  async ({ maxComments }) => {
    log.tool(`scrape_comments max=${maxComments}`);
    // wait for comments section — try multiple selectors TikTok uses
    const commentSelectors = [
      "[data-e2e='comment-level-1']",
      "[data-e2e='comment-list']",
      "[class*='CommentListContainer']",
      "[class*='DivCommentItemContainer']",
    ];
    for (const sel of commentSelectors) {
      const found = await page().waitForSelector(sel, { timeout: 6000 }).catch(() => null);
      if (found) { log.tool(`scrape_comments — found comments via "${sel}"`); break; }
    }

    const comments: { author: string; text: string; likes: string }[] = [];

    const getVisible = async () => {
      return await page().evaluate(() => {
        // try data-e2e selectors first, fall back to class-based
        const items = [
          ...document.querySelectorAll("[data-e2e='comment-level-1']"),
          ...document.querySelectorAll("[class*='DivCommentItemContainer']"),
        ];
        const unique = [...new Map(items.map(el => [el.textContent, el])).values()];
        return unique.map((el) => ({
          author:
            (el.querySelector("[data-e2e='comment-username-1']") as HTMLElement)?.innerText ??
            (el.querySelector("[class*='SpanUniqueId']") as HTMLElement)?.innerText ?? "",
          text:
            (el.querySelector("[data-e2e='comment-text']") as HTMLElement)?.innerText ??
            (el.querySelector("[class*='PCommentText']") as HTMLElement)?.innerText ?? "",
          likes:
            (el.querySelector("[data-e2e='comment-like-count']") as HTMLElement)?.innerText ?? "0",
        })).filter(c => c.text.length > 0);
      });
    };

    let prev = 0;
    for (let i = 0; i < 8 && comments.length < maxComments; i++) {
      const batch = await getVisible();
      for (const c of batch) {
        if (!comments.find((x) => x.text === c.text)) comments.push(c);
      }
      if (comments.length >= maxComments || comments.length === prev) break;
      prev = comments.length;
      await page().mouse.wheel(0, 600);
      await page().waitForTimeout(800 + Math.random() * 400);
    }

    const final = comments.slice(0, maxComments);
    log.tool(`scrape_comments ← ${final.length} comments`);
    return JSON.stringify(final);
  },
  {
    name: "scrape_comments",
    description: "Scrape comments from the current TikTok video page",
    schema: z.object({
      maxComments: z.number().default(20).describe("Max number of comments to return"),
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
  scrapeComments,
];
