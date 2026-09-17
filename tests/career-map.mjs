import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createBrowserPreview, SLIDE_VIEWPORT } from '../scripts/browser-preview.mjs';

const TOTAL_STEPS = 3;
const CURRENT_PIN_IDS = [null, 'pangyo-pin', 'gangnam-pin', null];
const MOTION_SETTLE_MS = 750;
const LOCAL_HOST = '127.0.0.1';
const PENDING_CHARGE_LIMIT = 90;
const BATTERY_GREEN = 'rgb(52, 199, 89)';
const BATTERY_BLACK = 'rgb(28, 28, 30)';
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MAP_ENTRANCE_PREVIEW_PROGRESS = .22;
const PIN_EMERGENCE_PREVIEW_MS = 85;
const AREA_LIFT_PREVIEW_MS = 370;
const ANCHOR_TOLERANCE = .01;
const WALK_CYCLE_MS = 1200;
const OUTPUT_DIRECTORY = new URL('../tmp/', import.meta.url);
const scenario = await createBrowserPreview();
const page = await scenario.browser.newPage({ viewport: SLIDE_VIEWPORT });
const browserErrors = [];
const externalRequests = [];
const failedAssets = [];
const fontGate = Promise.withResolvers();
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
  await page.waitForFunction((stage) => document.querySelector('#career')?.getAttribute('data-stage') === String(stage), expected);
  assert.equal(await page.locator('.history-entry.visible').count(), expected);
  const currentPinId = CURRENT_PIN_IDS[expected];
  const visiblePinIds = await page.locator('.pin-event.is-revealed').evaluateAll((pins) => pins.map((pin) => pin.id));
  assert.deepEqual(visiblePinIds, currentPinId ? [currentPinId] : []);
  assert.equal(await page.locator('#bundang-region.is-revealed').count(), Number(expected === TOTAL_STEPS));
  assert.equal(await page.locator('#career-route, .route-line').count(), 0);
  await page.waitForFunction((stage) => [...document.querySelectorAll('.history-entry')].every((entry, index) => {
    const style = getComputedStyle(entry);
    if (index + 1 !== stage) return style.visibility === 'hidden';
    return style.visibility === 'visible' && Number(style.opacity) === 1;
  }), expected);
  assert.equal(await page.locator('.history-entry[aria-hidden="true"]').count(), expected === 0 ? TOTAL_STEPS : TOTAL_STEPS - 1);
  if (expected === 0) return;
  const mapBounds = await page.locator('#career-map').boundingBox();
  const detailBounds = await page.locator('.history-entry.is-current').boundingBox();
  assert.ok(detailBounds.x >= mapBounds.x + mapBounds.width, 'Current career details must remain to the right of the map.');
  assert.ok(detailBounds.x + detailBounds.width <= page.viewportSize().width);
}

try {
  // Delayed local assets must keep charging incomplete and ignore premature input.
  await page.route('**/fonts/WantedSansVariable.woff2', async (route) => {
    await fontGate.promise;
    await route.continue();
  });
  await page.goto(scenario.url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Number(document.querySelector('#loading-battery')?.getAttribute('aria-valuenow')) > 30);
  assert.equal(await page.locator('.battery-meter').evaluate((element) => getComputedStyle(element).borderTopColor), BATTERY_GREEN);
  await page.keyboard.press('ArrowRight');
  await page.locator('#readiness').click({ position: { x: 100, y: 100 } });
  assert.equal(await page.locator('#readiness').isVisible(), true);
  assert.equal(await page.locator('#career').getAttribute('data-stage'), '0');
  await page.waitForFunction((limit) => document.querySelector('#loading-battery')?.getAttribute('aria-valuenow') === String(limit), PENDING_CHARGE_LIMIT);
  assert.notEqual(await page.locator('html').getAttribute('data-ready'), 'true');
  fontGate.resolve();
  await page.waitForSelector('html[data-ready="true"]');
  await page.unroute('**/fonts/WantedSansVariable.woff2');
  assert.equal(await page.locator('#start, .readiness button').count(), 0);
  assert.equal(await page.locator('#readiness-status').evaluate((element) => element.classList.contains('sr-only')), true);
  assert.equal(await page.locator('#loading-percent').innerText(), '100%');
  assert.doesNotMatch(await page.locator('#readiness').innerText(), /준비\s*완료|준비되었습니다/);
  assert.equal(await page.locator('.battery-cell.is-filled').count(), 7);
  await page.waitForFunction((color) => getComputedStyle(document.querySelector('.battery-cell')).backgroundColor === color, BATTERY_BLACK);
  await page.screenshot({ path: new URL('battery-ready.png', OUTPUT_DIRECTORY).pathname });
  await page.keyboard.press('ArrowLeft');
  await assertStage(0);
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => element.getAnimations().length), 0);
  await page.locator('#readiness').click({ position: { x: 100, y: 100 } });
  await assertStage(0);
  assert.equal(await page.locator('#readiness').isVisible(), false);

  // Intro stays visible across complete walk cycles and consumes its own input.
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  assert.equal(await page.locator('.reveal').evaluate((element) => element.inert), true);
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => element.getAnimations().length), 0);
  assert.equal(await page.locator('.walker-scene').innerText(), '');
  assert.equal(await page.locator('#career-intro button, #career-intro h1, #career-intro h2').count(), 0);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(WALK_CYCLE_MS * 2);
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  const walkTransforms = await page.locator('#pixel-walker > svg').evaluate((element, cycle) => {
    const animation = element.getAnimations()[0];
    animation.pause();
    const positions = [0, cycle / 2].map((time) => {
      animation.currentTime = time;
      return new DOMMatrix(getComputedStyle(element).transform).e;
    });
    return positions;
  }, WALK_CYCLE_MS);
  assert.notEqual(walkTransforms[0], walkTransforms[1]);
  await page.screenshot({ path: new URL('walking-intro.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('#pixel-walker > svg').evaluate((element) => element.getAnimations()[0].play());
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#career-intro').isVisible(), false);
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await assertStage(0);
  assert.equal(await page.locator('#career-intro').isVisible(), false);
  assert.equal(await page.locator('#pixel-walker > svg').evaluate((element) => element.getAnimations().length), 0);

  // The map rises only when the presentation starts and settles before career navigation.
  const entranceNames = await page.locator('#career-map > svg').evaluate((element, previewProgress) => {
    const animations = element.getAnimations({ subtree: true });
    animations.forEach((animation) => {
      animation.pause();
      animation.currentTime = Number(animation.effect.getTiming().duration) * previewProgress;
    });
    return animations.map((animation) => animation.animationName);
  }, MAP_ENTRANCE_PREVIEW_PROGRESS);
  assert.ok(entranceNames.includes('map-rise'));
  await page.screenshot({ path: new URL('map-rising.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('#career-map > svg').evaluate((element) => element.getAnimations({ subtree: true }).forEach((animation) => animation.play()));
  await page.waitForFunction(() => document.querySelector('#career-map > svg').getAnimations({ subtree: true }).every((animation) => animation.playState === 'finished'));
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).isIdentity), true);
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => getComputedStyle(element).opacity), '1');
  assert.equal(await page.locator('.history-strip').count(), 0);
  assert.equal(await page.locator('.history-panel, .history-entry').evaluateAll((elements) => elements.every((element) => getComputedStyle(element).borderTopWidth === '0px')), true);
  const entranceStartTime = await page.locator('#career-map > svg').evaluate((element) => element.getAnimations()[0].startTime);
  await page.screenshot({ path: new URL('map-settled.png', OUTPUT_DIRECTORY).pathname });

  // Mix actual mouse and keyboard interactions, including a click directly on a pin.
  await page.locator('#career-map').click({ position: { x: 120, y: 180 } });
  await assertStage(1);
  const emergingPin = await page.locator('#pangyo-pin').evaluate((pin, previewTime) => {
    pin.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = previewTime;
    });
    const body = pin.querySelector('.pin-body');
    const expectedTip = new DOMPoint(0, 0).matrixTransform(pin.getScreenCTM());
    const actualTip = new DOMPoint(0, 0).matrixTransform(body.getScreenCTM());
    return {
      animation: getComputedStyle(body).animationName,
      scaleY: new DOMMatrix(getComputedStyle(body).transform).d,
      tipDelta: Math.hypot(actualTip.x - expectedTip.x, actualTip.y - expectedTip.y),
    };
  }, PIN_EMERGENCE_PREVIEW_MS);
  assert.equal(emergingPin.animation, 'pin-emerge');
  assert.ok(emergingPin.scaleY > 0 && emergingPin.scaleY < 1);
  assert.ok(emergingPin.tipDelta < ANCHOR_TOLERANCE, 'Pin must grow upward from its fixed map coordinate.');
  await page.screenshot({ path: new URL('pin-emerging.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('#pangyo-pin').evaluate((pin) => pin.getAnimations({ subtree: true }).forEach((animation) => animation.play()));
  await page.waitForFunction(() => document.querySelector('#pangyo-pin').getAnimations({ subtree: true }).every((animation) => animation.playState === 'finished'));
  assert.equal(await page.locator('#pangyo-pin .pin-body').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).isIdentity), true);
  await page.screenshot({ path: new URL('career-first.png', OUTPUT_DIRECTORY).pathname });
  const firstPinStartTime = await page.locator('#pangyo-pin .pin-body').evaluate((element) => element.getAnimations()[0].startTime);
  await page.keyboard.press('ArrowRight');
  await assertStage(2);
  await page.waitForFunction(() => document.querySelector('#gangnam-pin').getAnimations({ subtree: true }).every((animation) => animation.playState === 'finished'));
  await page.screenshot({ path: new URL('career-second.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('#gangnam-pin .pin-body').click();
  await assertStage(3);
  const raisedArea = await page.locator('.area-reveal').evaluate((element, previewTime) => {
    element.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = previewTime;
    });
    const style = getComputedStyle(element);
    const transform = new DOMMatrix(style.transform);
    return { animation: style.animationName, y: transform.f, scale: transform.a, clip: style.clipPath, opacity: style.opacity };
  }, AREA_LIFT_PREVIEW_MS);
  assert.equal(raisedArea.animation, 'region-pop');
  assert.ok(raisedArea.y < 0 && raisedArea.scale > 1);
  assert.equal(raisedArea.clip, 'none');
  assert.equal(raisedArea.opacity, '1');
  await page.screenshot({ path: new URL('area-raised.png', OUTPUT_DIRECTORY).pathname });
  await page.locator('.area-reveal').evaluate((element) => element.getAnimations().forEach((animation) => animation.play()));
  await page.waitForFunction(() => document.querySelector('.area-reveal').getAnimations().every((animation) => animation.playState === 'finished'));
  assert.equal(await page.locator('.area-reveal').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).isIdentity), true);
  await page.keyboard.press('ArrowLeft');
  await assertStage(2);
  await page.locator('#previous').click();
  await assertStage(1);
  assert.ok(await page.locator('#pangyo-pin .pin-body').evaluate((element, previousStart) => element.getAnimations()[0].startTime > previousStart, firstPinStartTime));
  await page.keyboard.press('Space');
  await assertStage(2);
  await page.locator('#next').click();
  await assertStage(3);
  assert.equal(await page.locator('#next').isDisabled(), true);
  await page.locator('#career-map').click({ position: { x: 120, y: 180 } });
  await assertStage(3);

  // A reset button click must not bubble into another forward step.
  await page.locator('#reset').click();
  await assertStage(0);
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => element.getAnimations()[0].startTime), entranceStartTime);
  await page.keyboard.press('ArrowLeft');
  await assertStage(0);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await assertStage(1);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await assertStage(3);
  await page.waitForTimeout(MOTION_SETTLE_MS);

  const districtCodes = await page.locator('#district-shapes > path').evaluateAll((paths) => paths.map((path) => path.getAttribute('data-code')));
  assert.equal(districtCodes.length, 26);
  assert.equal(districtCodes.every((code) => code?.startsWith('11') || code === '31023'), true);
  assert.equal(await page.locator('.overview-map').count(), 0);
  assert.equal(await page.locator('.pin-event').count(), 2);
  assert.equal(await page.locator('.area-label, .area-sublabel, .area-label-guide, .bundang-idle-label').count(), 0);
  assert.deepEqual(await page.locator('.detail-region-label').allTextContents(), ['서울', '성남시 분당구']);
  assert.equal(await page.evaluate(() => [...document.fonts].some((font) => font.family.replaceAll('"', '') === 'Wanted Sans' && font.status === 'loaded')), true);
  await page.screenshot({ path: new URL('career-final.png', OUTPUT_DIRECTORY).pathname });

  // Reload the built app while external network requests remain blocked.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => Number(document.querySelector('#loading-battery')?.getAttribute('aria-valuenow')) > 30);
  await page.screenshot({ path: new URL('battery-charging.png', OUTPUT_DIRECTORY).pathname });
  await page.waitForSelector('html[data-ready="true"]');
  await page.keyboard.press('Enter');
  await assertStage(0);
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  await page.locator('#career-intro').click();
  await assertStage(0);
  await page.keyboard.press('Space');
  await assertStage(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => getComputedStyle(element).animationName), 'none');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#gangnam-pin .pin-body').evaluate((element) => getComputedStyle(element).animationName), 'none');
  await page.keyboard.press('ArrowRight');
  await assertStage(3);
  assert.deepEqual(await page.locator('.area-reveal').evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.animationName, style.opacity, style.clipPath, new DOMMatrix(style.transform).isIdentity];
  }), ['none', '1', 'none', true]);
  await page.keyboard.press('ArrowLeft');
  await assertStage(2);

  // Plain browser printing must also expose the completed history and restore afterward.
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('#career').getAttribute('data-stage'), '3');
  assert.equal(await page.locator('.pin-event.is-revealed').count(), 2);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await assertStage(2);

  // Speaker previews are local receivers and must not be covered by the start overlay.
  const notesPopup = page.waitForEvent('popup');
  await page.keyboard.press('s');
  const notes = await notesPopup;
  await notes.waitForSelector('iframe');
  const receiverFrames = notes.frames().filter((frame) => frame.url().includes('receiver'));
  assert.ok(receiverFrames.length > 0);
  for (const frame of receiverFrames) {
    await frame.waitForSelector('html[data-ready="true"]');
    assert.equal(await frame.locator('#readiness').isVisible(), false);
    assert.equal(await frame.locator('#career-intro').isVisible(), false);
  }
  await notes.close();

  // Starting with a held Right key consumes the initial event, then ignores repeats.
  await page.reload();
  await page.waitForSelector('html[data-ready="true"]');
  assert.equal(await page.locator('.battery-cell.is-filled').count(), 7);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await assertStage(0);
  assert.equal(await page.locator('#readiness').isVisible(), false);

  // Reduced motion also keeps the full-screen readiness view legible on a narrow display.
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  assert.equal(await page.locator('#pixel-walker > svg').evaluate((element) => getComputedStyle(element).animationName), 'none');
  await page.keyboard.press('Enter');
  await assertStage(0);
  assert.equal(await page.locator('#career-intro').isVisible(), false);
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.reload();
  await page.waitForSelector('html[data-ready="true"]');
  const batteryBounds = await page.locator('.battery-meter').boundingBox();
  assert.ok(batteryBounds.x > 0 && batteryBounds.x + batteryBounds.width < MOBILE_VIEWPORT.width);
  await page.screenshot({ path: new URL('battery-mobile.png', OUTPUT_DIRECTORY).pathname });
  await page.keyboard.press('Space');
  await assertStage(0);
  assert.equal(await page.locator('#readiness').isVisible(), false);
  assert.equal(await page.locator('#career-intro').isVisible(), true);
  const walkerBounds = await page.locator('#pixel-walker').boundingBox();
  assert.equal(walkerBounds.width, 96);
  assert.equal(walkerBounds.height, 112);
  await page.screenshot({ path: new URL('walking-intro-mobile.png', OUTPUT_DIRECTORY).pathname });
  await page.keyboard.press('Space');
  await assertStage(0);
  assert.equal(await page.locator('#career-intro').isVisible(), false);
  await page.setViewportSize(SLIDE_VIEWPORT);

  await page.goto(`${scenario.url}/?print-pdf`);
  await page.waitForSelector('.pdf-page');
  await page.waitForSelector('html[data-ready="true"]');
  assert.equal(await page.locator('.pdf-page').count(), 1);
  assert.equal(await page.locator('#career-intro').isVisible(), false);
  assert.equal(await page.locator('#readiness').isVisible(), false);
  assert.equal(await page.locator('.history-entry').count(), 3);
  assert.equal(await page.locator('#career').getAttribute('data-stage'), '3');
  assert.equal(await page.locator('.history-entry[aria-hidden="true"]').count(), 0);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => getComputedStyle(element).animationName), 'none');
  assert.equal(await page.locator('#career-map > svg').evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).isIdentity), true);
  assert.equal(await page.locator('.map-surface').evaluate((element) => getComputedStyle(element).filter), 'none');
  assert.deepEqual(await page.locator('.area-reveal').evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.animationName, style.opacity, style.filter, style.clipPath, new DOMMatrix(style.transform).isIdentity];
  }), ['none', '1', 'none', 'none', true]);
  assert.equal(await page.locator('.history-panel, .history-entry').evaluateAll((elements) => elements.every((element) => getComputedStyle(element).borderTopWidth === '0px')), true);
  assert.equal(await page.locator('.pin-event.is-revealed').count(), 2);
  assert.equal(await page.locator('#career-route, .route-line').count(), 0);
  assert.deepEqual(await page.locator('.history-entry').evaluateAll((entries) => entries.map((entry) => getComputedStyle(entry).opacity)), ['1', '1', '1']);
  const printedMap = await page.locator('#career-map').boundingBox();
  const printedEntries = await page.locator('.history-entry').evaluateAll((entries) => entries.map((entry) => {
    const bounds = entry.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
  }));
  printedEntries.forEach((entry, index) => {
    assert.ok(entry.left >= printedMap.x + printedMap.width, 'Printed entries must be to the right of the map.');
    assert.ok(entry.right <= SLIDE_VIEWPORT.width && entry.top > 0 && entry.bottom < SLIDE_VIEWPORT.height);
    if (index === 0) return;
    assert.ok(entry.top > printedEntries[index - 1].bottom, 'Printed career entries must not overlap.');
  });
  for (const pinSelector of ['#pangyo-pin .pin-body', '#gangnam-pin .pin-body']) {
    const bounds = await page.locator(pinSelector).boundingBox();
    assert.ok(bounds, `${pinSelector} must exist on the printed page`);
    assert.ok(bounds.x > 0 && bounds.y > 0, `${pinSelector} must retain its SVG translation when printing`);
    assert.ok(bounds.x + bounds.width < SLIDE_VIEWPORT.width && bounds.y + bounds.height < SLIDE_VIEWPORT.height);
  }
  assert.deepEqual(browserErrors, []);
  assert.deepEqual(externalRequests, []);
  assert.deepEqual(failedAssets, []);
  console.log('PASS: battery readiness, delayed assets, green/black states, button-free start, mixed input, current-only right-side details, reverse, reset, repeat keys, region-only stage, SVG scope, external-network isolation, reduced motion, speaker previews, print positions.');
} finally {
  fontGate.resolve();
  await scenario.close();
}
