import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'path';
const dir = '/home/user/HRMNY';
const url = (f) => 'file://' + path.join(dir, f);
const browser = await chromium.launch();

// ---- JS DISABLED: prove CSS-only interactions work in a preview-style viewer ----
const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const cs = (sel, prop) => p.locator(sel).first().evaluate((el, pr) => getComputedStyle(el)[pr], prop);

await p.goto(url('mockup-throughline.html'), { waitUntil: 'load' });
await p.waitForTimeout(300);

// value migration: click label -> human fill should grow (transform changes)
const beforeMig = await p.locator('.val-bar.human .fill').evaluate(el => getComputedStyle(el).transform);
await p.locator('label[data-valmig]').click();
await p.waitForTimeout(700);
const afterMig = await p.locator('.val-bar.human .fill').evaluate(el => getComputedStyle(el).transform);
console.log('JS-OFF value migration reacted:', beforeMig !== afterMig);

// flip
await p.locator('label[data-flip]').click();
await p.waitForTimeout(600);
const flipT = await p.locator('.flip').evaluate(el => getComputedStyle(el).transform);
console.log('JS-OFF claim/proof flip reacted:', flipT !== 'none' && flipT !== '');

// two views
await p.locator('label[data-viewtoggle]').click();
await p.waitForTimeout(400);
console.log('JS-OFF underneath view visible:', await p.locator('.view.under').isVisible());

// calculator: Paid Social + Hot + exclusive
await p.locator('.scope-opt[for="c-s-paid"]').click();
await p.locator('.mom-opt[for="c-m-hot"]').click();
await p.locator('.excl').click();
await p.waitForTimeout(300);
const visOut = await p.locator('.calc-out .out:visible').first();
const buyer = await visOut.locator('.out-row.total .v').textContent();
console.log('JS-OFF calculator (paid/hot/excl) buyer pays:', buyer);
// baseline check
await p.locator('.scope-opt[for="c-s-org"]').click();
await p.locator('.mom-opt[for="c-m-cold"]').click();
await p.locator('.excl').click();
await p.waitForTimeout(200);
const base = await p.locator('.calc-out .out:visible').first().locator('.out-row.total .v').textContent();
console.log('JS-OFF calculator baseline (expect $144):', base);

// interlock
await p.locator('.lock[for="lk-proof"]').click();
await p.waitForTimeout(200);
console.log('JS-OFF interlock note shows:', await p.locator('.note.n-proof').isVisible());

await p.screenshot({ path: dir + '/shots/b1-throughline.png', fullPage: true });

// plan
await p.goto(url('mockup-plan.html'), { waitUntil: 'load' });
await p.waitForTimeout(300);
await p.locator('.ftab[for="f-build"]').click();
await p.waitForTimeout(300);
console.log('JS-OFF build filter -> visible rows (expect 2):', await p.locator('.brow:visible').count());
await p.locator('.ptab[for="p-3"]').click();
await p.waitForTimeout(200);
console.log('JS-OFF phase 3 visible:', await p.locator('.pp-3').isVisible());
await p.locator('.opt[for="opt-last"]').click();
await p.waitForTimeout(200);
console.log('JS-OFF chain verdict (last) visible:', await p.locator('.v-last').isVisible());
await p.locator('.stab[for="sw-t"]').click();
await p.waitForTimeout(200);
const tOpacity = await p.locator('.quad.t').evaluate(el => getComputedStyle(el).opacity);
console.log('JS-OFF SWOT threats focused (opacity 1):', tOpacity);
await p.locator('.stab[for="sw-all"]').click();
await p.waitForTimeout(200);
await p.screenshot({ path: dir + '/shots/b2-plan.png', fullPage: true });

// crops for review
await p.locator('.posmap').scrollIntoViewIfNeeded();
await p.locator('.posmap').screenshot({ path: dir + '/shots/b3-posmap.png' });
await p.locator('.swot').scrollIntoViewIfNeeded();
await p.locator('.swot').screenshot({ path: dir + '/shots/b4-swot.png' });

// mobile
const m = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(url('mockup-throughline.html'), { waitUntil: 'load' });
await mp.waitForTimeout(300);
await mp.screenshot({ path: dir + '/shots/b5-mobile.png', fullPage: false });

await browser.close();
console.log('done');
