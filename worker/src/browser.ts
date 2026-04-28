import { chromium } from "playwright-extra";
// @ts-ignore — no types package for this plugin
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import type { BrowserContext, Page } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

chromium.use(stealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.resolve(__dirname, "../../tiktok_session");

const timezoneId =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

let context: BrowserContext | null = null;

export async function getBrowserContext(): Promise<BrowserContext> {
  if (context) return context;

  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,        // set true for production/Railway
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    viewport: null,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId,
  });

  return context;
}

export async function getPage(): Promise<Page> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();
  await page.emulateMedia({ colorScheme: "dark" });
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
}
