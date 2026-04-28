import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { Page } from "playwright";

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
    await page().goto(url, { waitUntil: "domcontentloaded" });
    return `Navigated to: ${await page().title()}`;
  },
  {
    name: "navigate_to",
    description: "Navigate the browser to a URL and return the page title",
    schema: z.object({ url: z.string().describe("Full URL to navigate to") }),
  }
);

export const getPageText = tool(
  async () => {
    const text = await page().innerText("body");
    return text.slice(0, 4000); // cap to avoid token overflow
  },
  {
    name: "get_page_text",
    description: "Get visible text from the current page (first 4000 chars)",
    schema: z.object({}),
  }
);

export const extractLinks = tool(
  async ({ selector }) => {
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

export const allTools = [
  navigateTo,
  getPageText,
  extractLinks,
  scrollPage,
  waitForElement,
  getElementText,
  clickElement,
  extractVideoUrl,
];
