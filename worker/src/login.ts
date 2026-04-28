import "dotenv/config";
import { getBrowserContext, closeBrowser } from "./browser.js";
import readline from "readline";

const ctx = await getBrowserContext();
const page = await ctx.newPage();
await page.goto("https://www.tiktok.com/login");

console.log("\nBrowserul e deschis pe pagina de login TikTok.");
console.log("Loghează-te manual, apoi apasă ENTER aici pentru a salva sesiunea...\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await new Promise<void>((resolve) => rl.question("", () => { rl.close(); resolve(); }));

await closeBrowser();
console.log("Sesiune salvată în tiktok_session/ ✓");
