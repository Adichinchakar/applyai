import { Browser, BrowserContext, chromium } from 'playwright';

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;

  browser = await chromium.launch({
    headless: false, // Show browser for human-in-the-loop review
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ]
  });

  return browser;
}

export async function getBrowserContext(): Promise<BrowserContext> {
  if (context) {
    try {
      // Test if context is still valid
      await context.pages();
      return context;
    } catch {
      context = null;
    }
  }

  const b = await getBrowser();
  context = await b.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  return context;
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close().catch(() => {});
    context = null;
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

export async function takeScreenshot(url: string): Promise<Buffer> {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const screenshot = await page.screenshot({ fullPage: false });
    return screenshot;
  } finally {
    await page.close();
  }
}
