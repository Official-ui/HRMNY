import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = (f) => 'file://' + path.join(dir, f);
const shot = (p, f) => p.screenshot({ path: path.join(dir, 'shots', f), fullPage: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

async function settle(ms = 700) { await page.waitForTimeout(ms); }
// Scroll through the document to trigger every IntersectionObserver (reveals + counters),
// then force any stragglers visible so the full-page capture is reviewable.
async function wake(p) {
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate(() => { document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); window.scrollTo(0, 0); });
  await p.waitForTimeout(400);
}

// ---------- THROUGH-LINE ----------
await page.goto(url('index.html'), { waitUntil: 'networkidle' });
await settle();
await wake(page);
await shot(page, '01-throughline-full.png');

// value migration tap
await page.locator('[data-valmig]').click();
await settle(1300);

// claim->proof flip
await page.locator('[data-flip]').click();
await settle();

// two-views toggle
await page.locator('[data-viewtoggle]').click();
await settle();
const underVisible = await page.locator("[data-view='under']").isVisible();
console.log('II underneath view visible after toggle:', underVisible);

// pricing calculator: select Paid Social, momentum 70, exclusive
await page.locator('.scope-opt[data-mult="2.2"]').click();
await page.locator('[data-momentum]').fill('70');
await page.locator('[data-momentum]').dispatchEvent('input');
await page.locator('[data-excl]').click();
await settle();
const out = {
  artist: await page.locator("[data-out='artist']").textContent(),
  fee: await page.locator("[data-out='fee']").textContent(),
  buyer: await page.locator("[data-out='buyer']").textContent(),
  badge: await page.locator('[data-mombadge]').textContent(),
};
console.log('III calculator (paid social, mom 70, exclusive):', JSON.stringify(out));
await page.locator('[data-calc]').scrollIntoViewIfNeeded();
await settle();
await shot(page, '02-throughline-calc.png');

// interlock tap
await page.locator('[data-lock="proof"]').click();
await settle();
const note = await page.locator('[data-interlock-note]').textContent();
console.log('synthesis interlock note:', note.trim().slice(0, 70));
await page.locator('.interlock').scrollIntoViewIfNeeded();
await settle();
await shot(page, '03-throughline-interlock.png');

// reset calculator to default to confirm baseline example (120/24/144)
await page.goto(url('index.html'), { waitUntil: 'networkidle' });
await settle(300);
const baseline = {
  artist: await page.locator("[data-out='artist']").textContent(),
  fee: await page.locator("[data-out='fee']").textContent(),
  buyer: await page.locator("[data-out='buyer']").textContent(),
};
console.log('III baseline (organic, cold, non-excl) EXPECT 120/24/144:', JSON.stringify(baseline));

// ---------- PLAN BRIEF ----------
await page.goto(url('plan.html'), { waitUntil: 'networkidle' });
await settle(500);
await wake(page); // scroll triggers counter animation
await settle(800);
await shot(page, '04-plan-full.png');
const stats = await page.locator('.stat .num').allTextContents();
console.log('Plan stat counters:', JSON.stringify(stats));

// build filter -> build only
await page.locator('[data-ftab="build"]').click();
await settle();
const visibleRows = await page.locator('.brow:not(.hide)').count();
console.log('build filter -> visible rows (expect 2):', visibleRows);
await page.locator('.build-table').scrollIntoViewIfNeeded();
await settle();
await shot(page, '05-plan-buildfilter.png');

// phase stepper -> phase 3
await page.locator('[data-ptab="3"]').click();
await settle();
const phaseTitle = await page.locator('[data-phase-title]').textContent();
console.log('phase 3 title:', phaseTitle);

// chain choice -> chain last
await page.locator('[data-opt="last"]').click();
await settle();
const verdict = await page.locator('[data-verdict]').textContent();
console.log('chain verdict:', verdict.trim().slice(0, 50));
await page.locator('.choice').scrollIntoViewIfNeeded();
await settle();
await shot(page, '06-plan-choice.png');

// ---------- MOBILE ----------
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(url('index.html'), { waitUntil: 'networkidle' });
await m.waitForTimeout(800);
await m.screenshot({ path: path.join(dir, 'shots', '07-mobile-throughline.png'), fullPage: false });

console.log('\nJS errors:', errors.length ? errors : 'none');
await browser.close();
