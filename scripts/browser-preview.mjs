import { access } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium } from 'playwright';

const PREVIEW_HOST = '127.0.0.1';
const AUTO_PORT = 0;
const DEFAULT_BROWSER_CHANNEL = 'chrome';
export const SLIDE_VIEWPORT = { width: 1440, height: 810 };

export async function createBrowserPreview() {
  await access(new URL('../dist/index.html', import.meta.url));
  const server = await preview({
    root: new URL('..', import.meta.url).pathname,
    preview: { host: PREVIEW_HOST, port: AUTO_PORT, open: false },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Local preview did not start.');
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? DEFAULT_BROWSER_CHANNEL,
  }).catch(async (error) => {
    await new Promise((resolve) => server.httpServer.close(resolve));
    throw error;
  });
  return {
    browser,
    url: `http://${PREVIEW_HOST}:${address.port}`,
    async close() {
      await browser.close();
      await new Promise((resolve) => server.httpServer.close(resolve));
    },
  };
}
