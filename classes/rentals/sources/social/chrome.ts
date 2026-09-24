// One headless Chrome for a social harvester: launched once per network per run, closed in the
// caller's `finally`, never a logged-in profile.
//
// Measured on TikTok (2026-09-23) and valid for Instagram and Facebook (2026-09-24): a headless
// Chrome gets an EMPTY answer unless `--disable-blink-features=AutomationControlled` is set and
// the UA does not say HeadlessChrome. A flag and a UA string, not a fingerprint forgery: the
// browser is a browser. The VPS runs Chrome 117 and nothing newer (`GLIBC_2.25` is missing for
// puppeteer's own builds), so the system Chrome goes first in the candidates.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Browser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Page = any;

const CHROME_PATHS = [
  process.env.RENTALS_SOCIAL_CHROME,
  process.env.RENTALS_TIKTOK_CHROME,
  process.env.RENTALS_EP_CHROME,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
];

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** `host:port` or a full proxy URL → Chrome's flag; nothing for no proxy. */
export function proxyArg(proxy: string | null): string[] {
  const value = String(proxy || "").trim();
  if (!value) return [];
  return [`--proxy-server=${/^\w+:\/\//.test(value) ? value : `http://${value}`}`];
}

/** A Chrome and its first page, or null when none of the candidates starts. Never throws. */
export async function launchChrome(proxy: string | null, label: string): Promise<{ browser: Browser; page: Page } | null> {
  let puppeteer: { default: { launch: (options: Record<string, unknown>) => Promise<Browser> } };
  try {
    puppeteer = await import("puppeteer");
  } catch (error) {
    console.warn(`${label}: puppeteer no disponible — ${(error as Error).message}`);
    return null;
  }
  const args = [
    "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--no-first-run", "--no-zygote", "--disable-gpu",
    "--lang=es-UY", "--disable-blink-features=AutomationControlled", ...proxyArg(proxy),
  ];
  for (const executablePath of [...CHROME_PATHS.filter(Boolean), undefined]) {
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.default.launch({ headless: true, executablePath, args, timeout: 30_000 });
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 900 });
      await page.setUserAgent(String(await browser.userAgent()).replace(/HeadlessChrome/, "Chrome"));
      await page.setExtraHTTPHeaders({ "accept-language": "es-UY,es;q=0.9" });
      return { browser, page };
    } catch (error) {
      // A Chrome that launched but could not open its page is closed HERE: the next candidate
      // would otherwise launch a second one on top of it, and a stranded Chrome on this VPS is
      // an outage, not a slow job.
      if (browser) await browser.close().catch(() => undefined);
      console.warn(`${label}: Chrome no arrancó en ${executablePath || "puppeteer"} — ${(error as Error).message}`);
    }
  }
  return null;
}
