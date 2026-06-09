// Generates the CSS-only pricing calculator fragment + its CSS rules.
// Pure CSS can't do arbitrary math, so we precompute every state
// (3 scopes × 5 momentum levels × 2 exclusivity) and reveal the right
// output block with :has(). Discrete momentum replaces the JS slider.
import fs from 'fs';

const BASE = 120;
const scopes = [
  { id: 'org',  label: 'Organic / Creator', mult: 1.0 },
  { id: 'paid', label: 'Paid Social',        mult: 2.2 },
  { id: 'broad',label: 'Broad Campaign',     mult: 4.5 },
];
const moms = [
  { id: 'cold', label: 'Cold',    v: 0 },
  { id: 'cool', label: 'Cool',    v: 25 },
  { id: 'warm', label: 'Warm',    v: 50 },
  { id: 'hot',  label: 'Hot',     v: 75 },
  { id: 'fire', label: 'On Fire', v: 100 },
];
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');

let outs = '';
let css = '';
for (const s of scopes) {
  for (const m of moms) {
    for (const ex of [false, true]) {
      const momF = 1 + (m.v / 100) * 0.6;
      const exF = ex ? 1.5 + (m.v / 100) * 1.5 : 1;
      const artist = BASE * s.mult * momF * exF;
      const fee = artist * 0.2;
      const buyer = artist + fee;
      const projected = buyer * (1 + (m.v / 100) * 0.3);
      const key = `${s.id}-${m.id}-${ex ? 'ex' : 'no'}`;
      const proj = projected > buyer + 1
        ? `At this momentum, the same license is projected at <b>${fmt(projected)}</b> in ~30 days — licensing now is the early-access discount.`
        : `Cold track — the price sits at the scope floor. As momentum rises, so does the suggested price. <b>License before it heats up.</b>`;
      outs += `      <div class="out o-${key}">
        <div class="out-row artist"><span class="k">Artist receives <span class="faint">(keeps 100%)</span></span><span class="v">${fmt(artist)}</span></div>
        <div class="out-row"><span class="k">HRMNY fee <span class="faint">(20%, buyer-side)</span></span><span class="v">${fmt(fee)}</span></div>
        <div class="out-row total"><span class="k">Buyer pays</span><span class="v">${fmt(buyer)}</span></div>
        <p class="proj">${proj}</p>
      </div>\n`;
      const exSel = ex ? '#c-excl:checked' : ':not(:has(#c-excl:checked))';
      if (ex) {
        css += `.calc:has(#c-s-${s.id}:checked):has(#c-m-${m.id}:checked):has(#c-excl:checked) .o-${key}{display:block}\n`;
      } else {
        css += `.calc:has(#c-s-${s.id}:checked):has(#c-m-${m.id}:checked):not(:has(#c-excl:checked)) .o-${key}{display:block}\n`;
      }
    }
  }
}

const scopeInputs = scopes.map((s, i) =>
  `      <input class="vh" type="radio" name="c-scope" id="c-s-${s.id}"${i === 0 ? ' checked' : ''}>`
).join('\n');
const scopeLabels = scopes.map((s) =>
  `        <label class="scope-opt" for="c-s-${s.id}"><span>${s.label}</span><span class="mult">×${s.mult.toFixed(1)}</span></label>`
).join('\n');
const momInputs = moms.map((m, i) =>
  `      <input class="vh" type="radio" name="c-mom" id="c-m-${m.id}"${i === 0 ? ' checked' : ''}>`
).join('\n');
const momLabels = moms.map((m) =>
  `        <label class="mom-opt" for="c-m-${m.id}">${m.label}</label>`
).join('\n');

const fragment = `<div class="calc" data-calc>
  <div class="calc-controls">
    <div class="track">"Midnight Drive" — live quote</div>
    <div class="base">Artist base · $120</div>

${scopeInputs}
${momInputs}
    <input class="vh" type="checkbox" id="c-excl">

    <div class="ctl-group">
      <div class="glab">License scope</div>
      <div class="scope-opts">
${scopeLabels}
      </div>
    </div>

    <div class="ctl-group">
      <div class="glab">Momentum score</div>
      <div class="mom-opts">
${momLabels}
      </div>
    </div>

    <div class="ctl-group">
      <label class="excl" for="c-excl">
        <div>
          <div class="glab" style="margin:0">Make it exclusive</div>
          <p class="ex-copy">forecloses every future sale — priced highest when the track is hot</p>
        </div>
        <span class="excl-box"><span class="excl-knob"></span></span>
      </label>
    </div>
  </div>

  <div class="calc-out">
${outs}  </div>
</div>`;

fs.writeFileSync('assets/_calc.html', fragment);
fs.writeFileSync('assets/_calc.css', css);
console.log('wrote assets/_calc.html (' + fragment.length + ' bytes) and assets/_calc.css (' + css.split('\n').length + ' rules)');
