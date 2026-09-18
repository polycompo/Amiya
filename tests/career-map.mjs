import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createBrowserPreview, SLIDE_VIEWPORT } from '../scripts/browser-preview.mjs';

const TOTAL_STEPS = 3;
const CURRENT_PIN_IDS = [null, 'pangyo-pin', 'gangnam-pin', null];
const LOCAL_HOST = '127.0.0.1';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const OUTPUT_DIRECTORY = new URL('../tmp/', import.meta.url);
const scenario = await createBrowserPreview();
const page = await scenario.browser.newPage({ viewport: SLIDE_VIEWPORT });
const browserErrors = [];
const externalRequests = [];
const failedAssets = [];

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
page.on('pageerror', (error) => browserErrors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) failedAssets.push(response.url());
});
await page.context().route('**/*', (route) => {
  const address = new URL(route.request().url());
  if (address.hostname === LOCAL_HOST || address.protocol === 'data:') return route.continue();
  externalRequests.push(address.href);
  return route.abort();
});

async function assertStage(expected) {
  await page.waitForFunction((stage) => document.querySelector('#career')?.dataset.stage === String(stage), expected);
  const visiblePinIds = await page.locator('.pin-event.is-revealed').evaluateAll((pins) => pins.map((pin) => pin.id));
  assert.deepEqual(visiblePinIds, CURRENT_PIN_IDS[expected] ? [CURRENT_PIN_IDS[expected]] : []);
  assert.equal(await page.locator('#bundang-region.is-revealed').count(), Number(expected === TOTAL_STEPS));
  assert.equal(await page.locator('.history-entry.is-current').count(), Number(expected > 0));
}

async function openOrigin() {
  await page.waitForSelector('html[data-ready="true"]');
  await page.locator('#readiness').click({ position: { x: 40, y: 40 } });
  await page.waitForFunction(() => document.querySelector('#career-origin')?.dataset.originStage === 'idle');
}


async function dragTo(selector, release = true) {
  const source = await page.locator('#origin-character').boundingBox();
  const target = await page.locator(selector + ' .origin-choice-icon').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
  if (release) await page.mouse.up();
}
async function chooseComputer() {
  await page.locator('#graduation-cap').click();
  await page.waitForFunction(() => document.querySelector('#career-origin')?.dataset.originStage === 'choices');
  await dragTo('#computer-choice');
  await page.waitForFunction(() => document.querySelector('#career-origin')?.hidden === true);
  await assertStage(0);
}

try {
  await page.goto(scenario.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Number(document.querySelector('#loading-battery')?.getAttribute('aria-valuenow')) > 0);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#readiness').isVisible(), true, 'Input is ignored while loading.');
  await openOrigin();

  assert.equal(await page.locator('#career-origin').isVisible(), true);
  assert.equal(await page.locator('.reveal').evaluate((element) => element.inert), true);
  assert.equal(await page.locator('#graduation-cap').isVisible(), true);
  assert.equal(await page.locator('#computer-choice').isVisible(), false);
  assert.equal(await page.locator('#major-choice').isVisible(), false);
  await page.screenshot({ path: new URL('origin-idle.png', OUTPUT_DIRECTORY).pathname });

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#career-origin').getAttribute('data-origin-stage'), 'idle');
  await page.locator('#graduation-cap').click();

  assert.equal(await page.locator('#career-origin').getAttribute('data-origin-stage'), 'facts');
  assert.equal(await page.locator('#computer-choice').isVisible(), false);
  assert.equal(await page.locator('#origin-gpa').innerText(), '3.26');
  await page.waitForFunction(() => document.querySelector('#career-origin')?.dataset.originStage === 'choices');
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL('origin-choices.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('#computer-choice').click();
  assert.equal(await page.locator('#career-origin').isVisible(), true);
  await dragTo('#major-choice', false);
  assert.equal(await page.locator('#career-origin').getAttribute('data-drop-target'), 'major');
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#major-choice').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(252, 234, 234)');
  await page.mouse.up();
  assert.equal(await page.locator('#career-origin').isVisible(), true);
  assert.equal(await page.locator('#origin-character').evaluate(el => el.style.transform), '');
  await dragTo('#computer-choice', false);
  assert.equal(await page.locator('#career-origin').getAttribute('data-drop-target'), 'computer');
  assert.equal(await page.locator('.origin-facts').isVisible(), false);
  await page.screenshot({ path: new URL('origin-drag.png', OUTPUT_DIRECTORY).pathname });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('#career-origin')?.hidden === true);
  await assertStage(0);
  assert.equal(await page.locator('.reveal').evaluate((element) => element.inert), false);
  assert.equal(await page.locator('#reset').isDisabled(), false);

  await page.locator('#career-map').click({ position: { x: 120, y: 180 } });
  await assertStage(1);
  await page.keyboard.press('ArrowRight');
  await assertStage(2);
  await page.locator('#next').click();
  await assertStage(3);
  await page.keyboard.press('ArrowLeft');
  await assertStage(2);

  await page.locator('#reset').click();
  await assertStage(0);
  assert.equal(await page.locator('#career-origin').isVisible(), true);
  assert.equal(await page.locator('#career-origin').getAttribute('data-origin-stage'), 'idle');
  assert.equal(await page.locator('#computer-choice').isVisible(), false);
  assert.equal(await page.locator('#graduation-cap').isVisible(), true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await chooseComputer();
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => getComputedStyle(element).animationName), 'none');

  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.reload();
  await openOrigin();
  await page.locator('#graduation-cap').click();
  await page.waitForFunction(() => document.querySelector('#career-origin')?.dataset.originStage === 'choices');
  for (const selector of ['#computer-choice', '#major-choice', '#origin-character']) {
    const bounds = await page.locator(selector).boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= MOBILE_VIEWPORT.width, `${selector} must fit on mobile.`);
  }
  await page.screenshot({ path: new URL('origin-mobile.png', OUTPUT_DIRECTORY).pathname });

  await page.setViewportSize(SLIDE_VIEWPORT);
  await page.goto(`${scenario.url}/?print-pdf`);
  await page.waitForSelector('.pdf-page');
  await page.waitForSelector('html[data-ready="true"]');
  assert.equal(await page.locator('#readiness').isVisible(), false);
  assert.equal(await page.locator('#career-origin').isVisible(), false);
  assert.equal(await page.locator('#career').getAttribute('data-stage'), '3');
  assert.equal(await page.locator('.history-entry[aria-hidden="true"]').count(), 0);
  assert.equal(await page.locator('.pin-event.is-revealed').count(), 2);

  await page.goto(`${scenario.url}/?receiver`);
  await page.waitForSelector('html[data-ready="true"]');
  assert.equal(await page.locator('#readiness').isVisible(), false);
  assert.equal(await page.locator('#career-origin').isVisible(), false);
  await assertStage(0);

  assert.deepEqual(browserErrors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(failedAssets, []);
  console.log('PASS: loading gate, origin story, GPA/game preference, drag hover feedback and computer drop, reset, map fragments, reduced motion, mobile, print, and offline assets.');
} finally {
  await scenario.close();
}
