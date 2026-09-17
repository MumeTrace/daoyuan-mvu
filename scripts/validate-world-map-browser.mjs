// Optional integration check: run against `pnpm dev`; supply PLAYWRIGHT_MODULE
// and CHROME_PATH only when using a bundled browser runtime instead of Playwright's.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const output = await mkdtemp(path.join(tmpdir(), 'daoyuan-atlas-check-'));
const url = process.env.MAP_TEST_URL || 'http://127.0.0.1:5173/';
const tinyImage = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#53687a"/></svg>';
async function createPage(mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1536, height: 1080 }, isMobile: mobile, hasTouch: mobile });
  await context.route('**/*', route => {
    if (route.request().url().startsWith(new URL(url).origin)) return route.continue();
    if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: tinyImage });
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '舆图', exact: true }).click();
  await page.locator('.dy-atlas').first().waitFor();
  return { page, errors, context };
}
async function closeFaction(page) { await page.locator('#faction-modal-overlay .faction-modal-close').click(); }
async function regionAt(page, x, y) {
  const point = await page.locator('.dy-atlas-svg').evaluate((svg, p) => {
    const result = new DOMPoint(p.x, p.y).matrixTransform(svg.getScreenCTM());
    return { x: result.x, y: result.y };
  }, { x, y });
  await page.mouse.click(point.x, point.y);
}
try {
  const { page, errors } = await createPage();
  assert.equal(await page.locator('.dy-atlas-region').count(), 5);
  assert.equal(await page.locator('.dy-atlas-marker').count(), 35);
  await page.getByRole('button', { name: '展开地图', exact: true }).click();
  await page.mouse.move(5, 5);
  await page.screenshot({ path: path.join(output, 'desktop.png') });
  await regionAt(page, 740, 395);
  await page.getByRole('dialog', { name: '中央神州', exact: true }).waitFor();
  assert.equal(await page.locator('.dy-map-location-dialog .faction-tag').count(), 14);
  assert.equal(await page.locator('#tab-map > .dy-world-map > .location-detail-panel.active').count(), 0);
  // Region -> image -> region -> faction -> close returns to region (no lost context).
  await page.locator('.dy-map-location-dialog img').click();
  await page.locator('#image-modal-overlay').waitFor();
  await page.locator('#image-modal-overlay button').first().click();
  await page.getByRole('dialog', { name: '中央神州', exact: true }).waitFor();
  await page.locator('.dy-map-location-dialog').getByRole('button', { name: '蜀山剑门', exact: true }).click();
  assert.equal(await page.locator('.faction-modal-header').textContent(), '【蜀山剑门】');
  await closeFaction(page);
  await page.getByRole('dialog', { name: '中央神州', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.dy-map-location-overlay').waitFor({ state: 'detached' });
  // Every direct marker, including special locations and their guardians, works.
  await page.evaluate(async () => {
    const { pinia } = await import('/stores/pinia.ts');
    const { useImageLibraryStore } = await import('/stores/image-library.ts');
    const { usePortraitStore } = await import('/stores/portraits.ts');
    await usePortraitStore(pinia).initialize();
    useImageLibraryStore(pinia).setLibrary({ data: { entities: {
      紫澪: { type: 'character', images: [
        { theme: 'default', url: 'https://example.org/guardian-a.png' },
        { theme: 'default', url: 'https://example.org/guardian-b.png' },
      ] },
      绯萝: { type: 'character', images: [{ theme: 'default', url: 'https://example.org/guardian-single.png' }] },
    } } }, 'browser-test');
  });
  const markers = await page.locator('.dy-atlas-marker').evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute('data-marker'), name: node.querySelector('text').textContent, secret: node.classList.contains('is-secret') })));
  for (const marker of markers) {
    const target = page.locator(`[data-marker="${marker.id}"]`);
    await target.focus();
    await target.press('Enter');
    if (marker.secret) {
      await page.getByRole('dialog', { name: marker.name, exact: true }).waitFor();
      assert.equal(await page.locator('.dy-map-location-dialog .faction-tag').count(), 1);
      await page.locator('.dy-map-location-dialog .faction-tag').click();
      assert.equal(await page.locator('.dy-guardian-portrait').count(), 1);
      assert.equal(await page.locator('.dy-guardian-actions button').count(), 1);
      assert.equal(await page.locator('.faction-modal-map,.portrait-custom-btn,.dy-guardian-portrait .portrait-drawer').count(), 0);
      const cycle = page.locator('.dy-guardian-actions button');
      if (marker.name === '蓬莱仙岛') {
        const first = await page.locator('.dy-guardian-image img').getAttribute('src');
        await cycle.click();
        const second = await page.locator('.dy-guardian-image img').getAttribute('src');
        assert.notEqual(first, second);
        const stored = await page.evaluate(async () => {
          const { pinia } = await import('/stores/pinia.ts');
          const { usePortraitStore } = await import('/stores/portraits.ts');
          return usePortraitStore(pinia).getUrl('紫澪');
        });
        assert.equal(second, stored, 'Guardian uses the same portrait selection as the character list');
        await page.screenshot({ path: path.join(output, 'guardian.png') });
      } else {
        assert.equal(await cycle.isDisabled(), true);
      }
      await closeFaction(page);
      await page.getByRole('button', { name: '关闭地域详情', exact: true }).click();
    } else {
      assert.equal(await page.locator('.faction-modal-header').textContent(), `【${marker.name}】`);
      await closeFaction(page);
    }
  }
  // Pointer drag suppresses click and does not open either modal.
  const box = await page.locator('.dy-atlas-svg').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 30, { steps: 10 }); await page.mouse.up();
  assert.equal(await page.locator('.dy-map-location-overlay,#faction-modal-overlay').count(), 0);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
  assert.notEqual(await page.locator('.dy-atlas-controls span').textContent(), '100%');
  await page.getByRole('button', { name: '复位地图', exact: true }).click();
  assert.equal(await page.locator('.dy-atlas-controls span').textContent(), '100%');
  await page.getByRole('button', { name: '△ 秘境已显示', exact: true }).click();
  assert.equal(await page.locator('.dy-atlas-marker').count(), 26);
  await page.getByRole('button', { name: '⌕ 地图索引', exact: true }).click();
  await page.getByRole('searchbox').fill('蓬莱');
  await page.locator('.dy-atlas-index-results button').click();
  await page.getByRole('dialog', { name: '蓬莱仙岛', exact: true }).waitFor();
  await page.getByRole('button', { name: '关闭地域详情', exact: true }).click();
  assert.equal(await page.locator('.dy-atlas-marker').count(), 35);
  await page.getByRole('button', { name: '收起地图', exact: true }).click();
  assert.equal(await page.locator('.dy-atlas-expanded').count(), 0);
  assert.deepEqual(errors, []);
  const originalBorder = await page.locator('.dy-atlas-frame').evaluate(node => getComputedStyle(node).borderTopColor);
  await page.evaluate(() => document.documentElement.style.setProperty('--rare-text', '#39aabb'));
  assert.equal(await page.locator('.dy-atlas-heading h2').first().evaluate(node => getComputedStyle(node).color), 'rgb(57, 170, 187)');
  assert.notEqual(await page.locator('.dy-atlas-frame').evaluate(node => getComputedStyle(node).borderTopColor), originalBorder, 'Frame must follow the theme accent');
  assert.equal(await page.locator('.dy-atlas-heading').first().evaluate(node => getComputedStyle(node).backgroundImage), 'none');
  async function setPosition(raw) {
    await page.evaluate(async value => {
      const { pinia } = await import('/stores/pinia.ts');
      const { useWorldStore } = await import('/stores/world.ts');
      useWorldStore(pinia).updateFromStatData({ 世界: { 当前地点: value } });
    }, raw);
  }
  await setPosition('中央神州·大周仙朝神都洛阳·南市水街·[正在谈论广寒宫]');
  assert.equal(await page.locator('.dy-atlas-gps').getAttribute('data-location'), '大周仙朝');
  await setPosition('一座地图里没有的山村');
  assert.equal(await page.locator('.dy-atlas-gps').count(), 0);
  await setPosition('西漠佛国·广寒宫');
  assert.equal(await page.locator('.dy-atlas-gps').count(), 0);
  assert.equal(await page.getByRole('button', { name: '打开九天仙界地图', exact: true }).getAttribute('aria-expanded'), 'false');
  await page.getByRole('button', { name: '折叠玄天界地图', exact: true }).click();
  await page.getByRole('button', { name: '打开九天仙界地图', exact: true }).click();
  await page.evaluate(() => document.documentElement.style.removeProperty('--rare-text'));
  const immortal = page.locator('[data-atlas="xianjie"]');
  assert.equal(await immortal.locator('.dy-atlas-region').count(), 5);
  assert.equal(await immortal.locator('.dy-atlas-marker').count(), 13);
  const misplaced = await immortal.evaluate(root => [...root.querySelectorAll('.dy-atlas-marker')].filter(marker => {
    const region = marker.getAttribute('data-marker').split(':')[0];
    const land = root.querySelector(`[data-region="${region}"] .dy-atlas-land`);
    const matrix = marker.transform.baseVal.consolidate().matrix;
    return !land.isPointInFill(new DOMPoint(matrix.e, matrix.f));
  }).map(marker => marker.getAttribute('data-marker')));
  assert.deepEqual(misplaced, [], 'All immortal factions must lie inside their own worldbook domain');
  await immortal.getByRole('button', { name: '展开地图', exact: true }).click();
  await setPosition('九天仙界 / 太白仙域 / 界碑古关');
  assert.equal(await page.locator('.dy-atlas-gps').getAttribute('data-location'), '天庭前线');
  await page.mouse.move(5, 5);
  await page.screenshot({ path: path.join(output, 'xianjie.png') });
  for (const id of await immortal.locator('.dy-atlas-marker').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-marker')))) {
    await immortal.locator(`[data-marker="${id}"]`).focus();
    await page.keyboard.press('Enter');
    await page.locator('#faction-modal-overlay').waitFor();
    await closeFaction(page);
  }
  await immortal.getByRole('button', { name: '收起地图', exact: true }).click();
  await setPosition('玄天界·蜀山剑门');
  assert.equal(await page.locator('[data-atlas="xuantian"] .dy-atlas-frame').count(), 0, 'Location updates must never open a collapsed map');
  assert.equal(await page.locator('.dy-atlas-gps').count(), 0);
  // A new document/floor restores both independent choices from shared storage.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '舆图', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '打开玄天界地图', exact: true }).getAttribute('aria-expanded'), 'false');
  assert.equal(await page.getByRole('button', { name: '折叠九天仙界地图', exact: true }).getAttribute('aria-expanded'), 'true');
  const peer = await page.context().newPage();
  await peer.goto(url, { waitUntil: 'domcontentloaded' });
  await peer.getByRole('button', { name: '舆图', exact: true }).click();
  await page.getByRole('button', { name: '折叠九天仙界地图', exact: true }).click();
  await peer.waitForFunction(() => !document.querySelector('[data-atlas="xianjie"] .dy-atlas-frame'));
  await peer.close();

  const { page: mobile, errors: mobileErrors, context } = await createPage(true);
  await mobile.getByRole('button', { name: '展开地图', exact: true }).click();
  await mobile.screenshot({ path: path.join(output, 'mobile.png') });
  const cdp = await context.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 420, id: 0 }, { x: 240, y: 420, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 90, y: 420, id: 0 }, { x: 290, y: 420, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await mobile.waitForTimeout(100);
  assert.notEqual(await mobile.locator('.dy-atlas-controls span').textContent(), '100%');
  assert.equal(await mobile.locator('.dy-map-location-overlay,#faction-modal-overlay').count(), 0);
  await mobile.getByRole('button', { name: '⌕ 地图索引', exact: true }).click();
  await mobile.getByRole('searchbox').fill('蜀山');
  await mobile.locator('.dy-atlas-index-results button').click();
  await mobile.locator('#faction-modal-overlay').waitFor();
  const modalBounds = await mobile.locator('.faction-modal-content').boundingBox();
  assert.ok(modalBounds.y >= 0 && modalBounds.y + modalBounds.height <= 845);
  await closeFaction(mobile);
  await mobile.getByRole('button', { name: '复位地图', exact: true }).click();
  const center = mobile.locator('[data-region="center"]');
  await center.focus(); await center.press('Enter');
  const mobileDialog = mobile.getByRole('dialog', { name: '中央神州', exact: true });
  await mobileDialog.waitFor();
  const bounds = await mobileDialog.boundingBox();
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 845);
  await mobile.screenshot({ path: path.join(output, 'mobile-region.png') });
  await mobile.getByRole('button', { name: '关闭地域详情', exact: true }).click();
  await mobile.getByRole('button', { name: '收起地图', exact: true }).click();
  await mobile.getByRole('button', { name: '折叠玄天界地图', exact: true }).click();
  await mobile.getByRole('button', { name: '打开九天仙界地图', exact: true }).click();
  await mobile.getByRole('button', { name: '展开地图', exact: true }).click();
  await mobile.getByRole('button', { name: '复位地图', exact: true }).click();
  await mobile.screenshot({ path: path.join(output, 'mobile-xianjie.png') });
  assert.equal(await mobile.locator('.dy-atlas-marker').count(), 13);
  const overviewBounds = await mobile.locator('.dy-atlas-expanded').boundingBox();
  assert.ok(overviewBounds.height >= 840, 'Fullscreen must keep using the entire window even in overview mode');
  await mobile.getByRole('button', { name: '定位青华仙域', exact: true }).click();
  await mobile.waitForFunction(() => !document.querySelector('.dy-atlas-expanded.is-overview'));
  assert.equal(await mobile.locator('.dy-atlas-controls span').textContent(), '200%');
  assert.equal(await mobile.locator('.dy-map-location-overlay,#faction-modal-overlay').count(), 0, 'Quick navigation focuses the map without opening a modal');
  await mobile.getByRole('button', { name: '复位地图', exact: true }).click();
  await mobile.getByRole('button', { name: '放大地图', exact: true }).click();
  await mobile.waitForFunction(() => !document.querySelector('.dy-atlas-expanded.is-overview'));
  await mobile.getByRole('button', { name: '⌕ 地图索引', exact: true }).click();
  await mobile.getByRole('searchbox').fill('瑶池');
  await mobile.locator('.dy-atlas-index-results button').click();
  await mobile.locator('#faction-modal-overlay').waitFor();
  const immortalBounds = await mobile.locator('.faction-modal-content').boundingBox();
  assert.ok(immortalBounds.y >= 0 && immortalBounds.y + immortalBounds.height <= 845);
  assert.deepEqual(mobileErrors, []);
  console.log(`MAP_BROWSER_OK both realms, 48 markers, 9 named guardians, GPS updates and unknown/conflicting locations, persistent independent collapse across documents, purple theme without title background, nested modals, drag/wheel/reset, mobile pinch and dialog bounds. Remote images mocked; actual Tavern host remains a separate acceptance check. Screenshots: ${output}`);
} finally {
  await browser.close();
}
