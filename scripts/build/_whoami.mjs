import { chromium } from "playwright-core";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const page = await browser.contexts()[0].newPage();
await page.goto("https://github.com/settings/profile");
console.log(page.url());
console.log(await page.locator('meta[name="user-login"]').getAttribute("content"));
await page.close();
