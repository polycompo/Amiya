import { mkdir } from 'node:fs/promises';
import { createBrowserPreview, SLIDE_VIEWPORT } from './browser-preview.mjs';

const OUTPUT_DIRECTORY = new URL('../output/pdf/', import.meta.url);
const OUTPUT_FILE = new URL('career-history.pdf', OUTPUT_DIRECTORY);
const scenario = await createBrowserPreview();

try {
  const page = await scenario.browser.newPage({ viewport: SLIDE_VIEWPORT, reducedMotion: 'reduce' });
  await page.goto(`${scenario.url}/?print-pdf`);
  await page.waitForSelector('html[data-ready="true"]');
  await page.waitForSelector('.pdf-page');
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await page.pdf({
    path: OUTPUT_FILE.pathname,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  console.log(`PDF: ${OUTPUT_FILE.pathname}`);
} finally {
  await scenario.close();
}
