/**
 * Puppeteer Browser Adapter
 *
 * Implements BrowserAdapter interface for Puppeteer.
 * This is a thin wrapper - all auth logic is in @abapify/browser-auth.
 */

import puppeteer from 'puppeteer';
import type { Browser, Page, Protocol } from 'puppeteer';
import type {
  BrowserAdapter,
  CookieData,
  ResponseEvent,
} from '@abapify/browser-auth';

/**
 * Convert Puppeteer cookie to CookieData
 */
function convertCookie(cookie: Protocol.Network.Cookie): CookieData {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite as CookieData['sameSite'],
  };
}

/**
 * Create a Puppeteer browser adapter
 */
export function createPuppeteerAdapter(): BrowserAdapter {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let launchOptions: { ignoreHTTPSErrors?: boolean; userAgent?: string } = {};

  const responseHandlers: ((event: ResponseEvent) => void)[] = [];
  const closeHandlers: (() => void)[] = [];

  return {
    async launch(options: {
      headless: boolean;
      userDataDir?: string;
      ignoreHTTPSErrors?: boolean;
      userAgent?: string;
    }) {
      const { headless, userDataDir, ignoreHTTPSErrors, userAgent } = options;
      launchOptions = { ignoreHTTPSErrors, userAgent };

      browser = await puppeteer.launch({
        headless,
        userDataDir,
        args: userAgent ? [`--user-agent=${userAgent}`] : [],
      });
    },

    async newPage() {
      if (!browser) throw new Error('Browser not launched');
      page = await browser.newPage();

      // Set page-level options
      if (launchOptions.ignoreHTTPSErrors) {
        await page.setBypassCSP(true);
      }

      // Wire up event handlers
      page.on('response', (response) => {
        const event: ResponseEvent = {
          url: response.url(),
          status: response.status(),
        };
        responseHandlers.forEach((handler) => handler(event));
      });

      page.once('close', () => {
        closeHandlers.forEach((handler) => handler());
      });
    },

    async goto(url: string, options?: { timeout?: number }) {
      if (!page) throw new Error('Page not created');
      await page
        .goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: options?.timeout ?? 30000,
        })
        .catch(() => {});
    },

    async getCookies(): Promise<CookieData[]> {
      if (!page) throw new Error('Page not created');
      const client = await page.createCDPSession();
      const { cookies } = await client.send('Network.getAllCookies');
      return cookies.map(convertCookie);
    },

    async clearCookies(domain: string): Promise<void> {
      if (!page) throw new Error('Page not created');
      const client = await page.createCDPSession();
      const { cookies } = await client.send('Network.getAllCookies');
      const toRemove = cookies.filter(
        (c) =>
          c.domain.includes(domain) ||
          domain.includes(c.domain.replace(/^\./, '')),
      );
      for (const cookie of toRemove) {
        await client.send('Network.deleteCookies', {
          name: cookie.name,
          domain: cookie.domain,
        });
      }
    },

    async getUserAgent(): Promise<string> {
      if (!page) throw new Error('Page not created');
      return page.evaluate(() => navigator.userAgent);
    },

    async closePage() {
      if (page) {
        await page.close();
        page = null;
      }
    },

    async close() {
      if (browser) {
        await browser.close();
        browser = null;
      }
    },

    onResponse(handler: (event: ResponseEvent) => void) {
      responseHandlers.push(handler);
    },

    onPageClose(handler: () => void) {
      closeHandlers.push(handler);
    },
  };
}
