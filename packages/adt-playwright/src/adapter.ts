/**
 * Playwright Browser Adapter
 *
 * Implements BrowserAdapter interface for Playwright.
 * This is a thin wrapper - all auth logic is in @abapify/browser-auth.
 */

import { chromium } from 'playwright';
import type { BrowserContext, Page, Cookie } from 'playwright';
import type {
  BrowserAdapter,
  CookieData,
  ResponseEvent,
} from '@abapify/browser-auth';

/**
 * Convert Playwright cookie to CookieData
 */
function convertCookie(cookie: Cookie): CookieData {
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
 * Create a Playwright browser adapter
 */
export function createPlaywrightAdapter(): BrowserAdapter {
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const responseHandlers: ((event: ResponseEvent) => void)[] = [];
  const closeHandlers: (() => void)[] = [];

  return {
    async launch(options) {
      const { headless, userDataDir, ignoreHTTPSErrors, userAgent } = options;

      if (userDataDir) {
        // Persistent context - stores cookies/session
        context = await chromium.launchPersistentContext(userDataDir, {
          headless,
          ignoreHTTPSErrors,
          userAgent,
        });
      } else {
        const browser = await chromium.launch({ headless });
        context = await browser.newContext({ ignoreHTTPSErrors, userAgent });
      }
    },

    async newPage() {
      if (!context) throw new Error('Browser not launched');
      page = await context.newPage();

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

    async goto(url, options) {
      if (!page) throw new Error('Page not created');
      await page
        .goto(url, { timeout: options?.timeout ?? 30000 })
        .catch(() => {});
    },

    async getCookies() {
      if (!context) throw new Error('Browser not launched');
      const cookies = await context.cookies();
      return cookies.map(convertCookie);
    },

    async clearCookies(domain: string) {
      if (!context) throw new Error('Browser not launched');
      const cookies = await context.cookies();
      const toRemove = cookies.filter(
        (c) =>
          c.domain.includes(domain) ||
          domain.includes(c.domain.replace(/^\./, '')),
      );
      // Clear each matching cookie individually
      for (const cookie of toRemove) {
        await context.clearCookies({
          name: cookie.name,
          domain: cookie.domain,
        });
      }
    },

    async getUserAgent() {
      if (!context) throw new Error('Browser not launched');
      const uaPage = await context.newPage();
      const userAgent = await uaPage.evaluate(() => navigator.userAgent);
      await uaPage.close();
      return userAgent;
    },

    async closePage() {
      if (page) {
        await page.close();
        page = null;
      }
    },

    async close() {
      if (context) {
        await context.close();
        context = null;
      }
    },

    onResponse(handler) {
      responseHandlers.push(handler);
    },

    onPageClose(handler) {
      closeHandlers.push(handler);
    },
  };
}
