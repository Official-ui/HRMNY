// Generates the HRMNY clickable app prototype as a PURE-CSS app — no JS required.
// Every screen transition, tab, track pick, scope/exclusivity choice, upload step,
// and verification runs on hidden radios/checkboxes + labels + :has(), so it works
// in any viewer that renders CSS, even one that blocks scripts (the same constraint
// the Through-Line and Plan pages were built for).
//
// Pure CSS can't do math, so — like generate-calc.mjs — we precompute every price
// state (per track × scope × exclusivity) and reveal the right block with :has().
//
// Emits:  app.html           (the prototype)
//         assets/app-gen.css (the generated reveal rules)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));

/* ——— pricing model (canonical — matches the Through-Line calculator) ——— */
const SCOPES = [
  { id: 'org',   name: 'Organic / Creator', sub: '1 platform · organic posts', mult: 1.0 },
  { id: 'paid',  name: 'Paid Social',        sub: 'boosted / paid ads',          mult: 2.2 },
  { id: 'broad', name: 'Broad Campaign',     sub: 'multi-platform · all media',  mult: 4.5 },
];
const MOM = [
  { key: 'cold', label: 'Cold',    mom: 1.00, excl: 1.500, score: 10 },
  { key: 'cool', label: 'Cool',    mom: 1.15, excl: 1.875, score: 30 },
  { key: 'warm', label: 'Warm',    mom: 1.30, excl: 2.250, score: 54 },
  { key: 'hot',  label: 'Hot',     mom: 1.45, excl: 2.625, score: 78 },
  { key: 'fire', label: 'On Fire', mom: 1.60, excl: 3.000, score: 94 },
];
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
function price(base, scopeMult, momIdx, excl) {
  const m = MOM[momIdx];
  const artist = base * scopeMult * m.mom * (excl ? m.excl : 1);
  const fee = artist * 0.20;
  return { artist: Math.round(artist), fee: Math.round(fee), buyer: Math.round(artist + fee) };
}
function projected(base, scopeMult, momIdx, excl) {
  if (momIdx >= MOM.length - 1) return Math.round(price(base, scopeMult, momIdx, excl).buyer * 1.18);
  return price(base, scopeMult, momIdx + 1, excl).buyer;
}

/* ——— art tiles — muted, near-monochrome (color stays an accent, not a fill) ——— */
/* ——— halftone duotone cover art (brand signature: torn-paper vinyl collage) ———
   Each cover is a deterministic SVG: a torn-paper backing, a duotone record in
   one of the two brand accents (indigo or magenta), a halftone dot texture,
   grooves, a sheen streak, and a center label. No photos, no empty tiles. */
const ACC = { v: { a: '#7c3aed', b: '#b591f7', d: '#241043' }, m: { a: '#c050f0', b: '#e6a8ff', d: '#3c0f4e' } };
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let x = Math.imul(h ^ (h >>> 15), 1 | h); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
function disc(seed, key) {
  const rnd = seeded(seed), c = ACC[key], uid = 'c' + seed.replace(/[^a-z0-9]/gi, '');
  const N = 28, pts = [];
  for (let i = 0; i < N; i++) { const ang = (i / N) * Math.PI * 2, r = 44 + (rnd() * 5 - 2.5); pts.push([(50 + Math.cos(ang) * r).toFixed(1), (50 + Math.sin(ang) * r).toFixed(1)]); }
  const torn = 'M' + pts.map((p) => p.join(',')).join(' L') + ' Z';
  const rot = (rnd() * 14 - 7).toFixed(1);
  const grooves = [14, 20, 26, 32, 38].map((r) => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#000" stroke-opacity="0.13" stroke-width="0.5"/>`).join('');
  return `<svg class="cover" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    `<defs>` +
      `<radialGradient id="${uid}g" cx="36%" cy="30%" r="64%"><stop offset="0" stop-color="${c.b}"/><stop offset="0.4" stop-color="${c.a}"/><stop offset="1" stop-color="${c.d}"/></radialGradient>` +
      `<pattern id="${uid}h" width="2.6" height="2.6" patternUnits="userSpaceOnUse"><circle cx="1.3" cy="1.3" r="0.82" fill="#000"/></pattern>` +
      `<clipPath id="${uid}c"><circle cx="50" cy="50" r="41"/></clipPath>` +
    `</defs>` +
    `<g transform="rotate(${rot} 50 50)">` +
      `<path d="${torn}" fill="#ddd5e6"/>` +
      `<circle cx="50" cy="50" r="41" fill="${c.a}"/>` +
      `<circle cx="50" cy="50" r="41" fill="url(#${uid}g)"/>` +
      `<g clip-path="url(#${uid}c)">` +
        `<rect width="100" height="100" fill="url(#${uid}h)" opacity="0.2"/>${grooves}` +
        `<path d="M8 2 L38 -6 L70 96 L40 100 Z" fill="#fff" opacity="0.08"/>` +
      `</g>` +
      `<circle cx="50" cy="50" r="41" fill="none" stroke="#000" stroke-opacity="0.4" stroke-width="1.4"/>` +
      `<circle cx="50" cy="50" r="10" fill="${c.b}"/>` +
      `<circle cx="50" cy="50" r="10" fill="#000" fill-opacity="0.12"/>` +
      `<circle cx="50" cy="50" r="1.8" fill="#0c0a12"/>` +
    `</g></svg>`;
}
const trackAcc = (id) => (seeded(id)() < 0.5 ? 'v' : 'm');
const coverSVG = (t) => disc(t.id, trackAcc(t.id));

/* ——— catalog ——— */
const TRACKS = [
  { id: 'midnight', title: 'Midnight Drive', artist: 'Mara Vance', base: 120, mom: 3, excl: true,  mine: true,  bpm: 112, key: 'F♯ min', licenses: 17, earned: 4820 },
  { id: 'neon',     title: 'Neon Tide',      artist: 'KOJI',        base: 150, mom: 4, excl: true,  mine: false, bpm: 128, key: 'A min'  },
  { id: 'bloom',    title: 'Slow Bloom',     artist: 'Elara',       base: 90,  mom: 2, excl: true,  mine: false, bpm: 96,  key: 'C maj'  },
  { id: 'gravity',  title: 'Gravity Sells',  artist: 'The Foley',   base: 110, mom: 1, excl: false, mine: false, bpm: 104, key: 'D min'  },
  { id: 'cranes',   title: 'Paper Cranes',   artist: 'Mara Vance',  base: 100, mom: 0, excl: true,  mine: true,  bpm: 88,  key: 'G maj', licenses: 4, earned: 480 },
  { id: 'cellar',   title: 'Cellar Door',    artist: 'Mara Vance',  base: 110, mom: 2, excl: true,  mine: true,  bpm: 100, key: 'E min', licenses: 6, earned: 1290 },
  { id: 'static',   title: 'Static Bloom',   artist: 'Wren',        base: 80,  mom: 0, excl: false, mine: false, bpm: 120, key: 'B min'  },
];
const track = (id) => TRACKS.find((t) => t.id === id);
const cat = (t) => (t.mom >= 3 ? 'fire' : t.mom <= 1 ? 'cold' : 'mid');
const fromPrice = (t) => price(t.base, 1.0, t.mom, false).buyer;

/* ——— the brand's purchased licenses (the buyer library / "what I own") ——— */
const LICENSED = [
  { id: 'midnight', scope: 'paid',  excl: false, date: 'Jun 6, 2026',  ago: '3 days ago' },
  { id: 'neon',     scope: 'broad', excl: false, date: 'Jun 1, 2026',  ago: '1 week ago' },
  { id: 'bloom',    scope: 'org',   excl: false, date: 'May 26, 2026', ago: '2 weeks ago' },
];
const scopeOf = (id) => SCOPES.find((s) => s.id === id);
const licPrice = (l) => price(track(l.id).base, scopeOf(l.scope).mult, track(l.id).mom, l.excl);
const fileName = (t) => t.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '.wav';

/* ——— artists (public profiles, reachable by tapping an artist name) ——— */
const ARTIST_META = {
  'Mara Vance': { slug: 'mara',  acc: 'v', loc: 'Los Angeles, CA', bio: 'Synthwave & cinematic pop. Every release is human-made and signed — no AI, ever.' },
  'KOJI':       { slug: 'koji',  acc: 'm', loc: 'Berlin, DE',      bio: 'Club-leaning electronic, built from hardware jams and field recordings.' },
  'Elara':      { slug: 'elara', acc: 'v', loc: 'London, UK',      bio: 'Ambient and slow-tempo songwriting made for film and brand work.' },
  'The Foley':  { slug: 'foley', acc: 'm', loc: 'Austin, TX',      bio: 'Indie-electronic duo — sound-design heavy and sync-ready.' },
  'Wren':       { slug: 'wren',  acc: 'v', loc: 'Portland, OR',    bio: 'Lo-fi and downtempo. New to HRMNY and building momentum.' },
};
const slugOf = (name) => ARTIST_META[name].slug;
const ARTISTS = [...new Set(TRACKS.map((t) => t.artist))];
const tracksByArtist = (name) => TRACKS.filter((t) => t.artist === name);

/* ——— small html bits ——— */
const LOGO = (cls = 'logo-mark', extra = '') =>
  `<svg class="${cls}" viewBox="0 0 132 72" aria-hidden="true"${extra}>` +
  `<circle class="ring" cx="34" cy="36" r="27"/><circle class="ring" cx="66" cy="36" r="27"/><circle class="ring" cx="98" cy="36" r="27"/>` +
  `<line x1="40" y1="36" x2="92" y2="36" stroke="currentColor" stroke-width="5"/>` +
  `<circle class="node-l" cx="40" cy="36" r="9"/><circle class="node-c" cx="66" cy="36" r="10"/><circle class="node-r" cx="92" cy="36" r="9"/></svg>`;
const momChip = (idx) => {
  const m = MOM[idx];
  return `<span class="mom-chip" data-m="${m.key}">${m.label} · ${m.score}</span>`;
};
const back = (target) => `<label class="ab-back inline" for="scr-${target}" aria-label="Back">‹</label>`;

/* ——— state inputs (all live at the top of #phone so :has() can reach them) ——— */
function stateInputs() {
  let s = '<div class="state">';
  // screen router
  const screens = ['launch', 'discover', 'licenses', 'studio', 'verify', 'wallet', 'up1', 'up2', 'up3', 'up4', 'published', 'report'];
  TRACKS.forEach((t) => { screens.push('det-' + t.id, 'co-' + t.id, 'rc-' + t.id); });
  LICENSED.forEach((l) => { screens.push('lic-' + l.id); });
  ARTISTS.forEach((name) => { screens.push('artist-' + slugOf(name)); });
  screens.forEach((id) => {
    s += `<input class="vh" type="radio" name="scr" id="scr-${id}"${id === 'launch' ? ' checked' : ''}>`;
  });
  // discover filter
  ['all', 'fire', 'cold'].forEach((f) => { s += `<input class="vh" type="radio" name="flt" id="flt-${f}"${f === 'all' ? ' checked' : ''}>`; });
  // per-track scope + exclusivity
  TRACKS.forEach((t) => {
    SCOPES.forEach((sc) => { s += `<input class="vh" type="radio" name="sc-${t.id}" id="sc-${t.id}-${sc.id}"${sc.id === 'org' ? ' checked' : ''}>`; });
    if (t.excl) s += `<input class="vh" type="checkbox" id="ex-${t.id}">`;
  });
  // per-license download toggle
  LICENSED.forEach((l) => { s += `<input class="vh" type="checkbox" id="dl-${l.id}">`; });
  // payout toggle (wallet)
  s += `<input class="vh" type="checkbox" id="pay-sent">`;
  s += '</div>';
  return s;
}

/* ——— price panels (precomputed) ——— */
function quotePanel(t, sc, excl) {
  const p = price(t.base, sc.mult, t.mom, excl);
  const proj = projected(t.base, sc.mult, t.mom, excl);
  const projHTML = t.mom === 0
    ? 'Cold track — the price sits at the scope floor. As momentum rises, so does the suggested price. <b>License before it heats up.</b>'
    : `Same license is projected at <b>${money(proj)}</b> in ~30 days. Licensing now is the early-access discount.`;
  return `<div class="qpanel q-${t.id}-${sc.id}-${excl ? 'ex' : 'no'}">` +
    `<div class="qrow artist"><span class="qk">Artist receives <span class="faint">(keeps 100%)</span></span><span class="qv">${money(p.artist)}</span></div>` +
    `<div class="qrow"><span class="qk">HRMNY fee <span class="faint">(20%, buyer-side)</span></span><span class="qv">${money(p.fee)}</span></div>` +
    `<div class="qrow total"><span class="qk">You pay</span><span class="qv">${money(p.buyer)}</span></div>` +
    `<div class="qproj">${projHTML}</div></div>`;
}
function coPanel(t, sc, excl) {
  const p = price(t.base, sc.mult, t.mom, excl);
  const factor = (sc.mult * (excl ? MOM[t.mom].excl : 1) * MOM[t.mom].mom).toFixed(2);
  return `<div class="copanel co-${t.id}-${sc.id}-${excl ? 'ex' : 'no'}">` +
    `<div class="acard" style="padding:6px 18px">` +
      `<div class="line"><span class="lk">License scope<small>${sc.name}${excl ? ' · exclusive' : ''}</small></span><span class="lv">×${factor}</span></div>` +
      `<div class="line"><span class="lk">Artist price<small>paid through in full</small></span><span class="lv">${money(p.artist)}</span></div>` +
      `<div class="line"><span class="lk">HRMNY fee<small>20% · buyer-side</small></span><span class="lv">${money(p.fee)}</span></div>` +
      `<div class="line tot"><span class="lk">Total due</span><span class="lv">${money(p.buyer)}</span></div>` +
    `</div>` +
    `<label class="pbtn" for="scr-rc-${t.id}" style="margin-top:16px">Pay ${money(p.buyer)}</label></div>`;
}
function rcPanel(t, sc, excl) {
  const p = price(t.base, sc.mult, t.mom, excl);
  return `<div class="rcpanel rc-${t.id}-${sc.id}-${excl ? 'ex' : 'no'}">` +
    `<p class="s-sub" style="text-align:center;max-width:32ch;margin:8px auto 0">${t.title} is cleared for ${sc.name}${excl ? ', exclusive' : ''}. Receipt emailed.</p>` +
    `<div class="acard" style="margin-top:14px;padding:6px 18px">` +
      `<div class="kv"><span class="k">Cleared for</span><span class="v">${sc.name}${excl ? ' · exclusive' : ' · non-exclusive'}</span></div>` +
      `<div class="kv"><span class="k">Term</span><span class="v">worldwide · perpetual</span></div>` +
      `<div class="kv"><span class="k">Paid</span><span class="v">${money(p.buyer)}</span></div>` +
    `</div></div>`;
}
const combos = (t) => {
  const out = [];
  SCOPES.forEach((sc) => { out.push([sc, false]); if (t.excl) out.push([sc, true]); });
  return out;
};

/* ——— screens ——— */
function screenLaunch() {
  return scr('launch', 'bare',
    `<div style="text-align:center;padding:18px 4px 6px">${LOGO('logo-mark', ' style="width:96px;height:62px;color:var(--ink);margin:0 auto 10px;display:block"')}` +
      `<div class="s-title" style="font-size:30px">HRMNY</div>` +
      `<p class="s-sub" style="max-width:30ch;margin:8px auto 0">Verified human music, licensed fairly. Pick a side to explore — you can switch tabs anytime.</p></div>` +
    `<div style="margin-top:22px">` +
      roleCard('discover', '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>', "I'm a brand / creator", 'Discover & license tracks') +
      roleCard('studio',   '<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>', "I'm an artist", 'Upload, prove & get paid') +
    `</div>` +
    `<p class="note-line" style="text-align:center;margin-top:24px">Prototype · sample data · no real payments</p>`);
}
const roleCard = (to, icon, t, sub) =>
  `<label class="acard rolecard" for="scr-${to}"><span class="rc-ic">${icon}</span>` +
  `<span class="rc-mid"><span class="rc-t">${t}</span><span class="s-sub" style="margin-top:3px">${sub}</span></span>` +
  `<span class="rc-arr">›</span></label>`;

function screenDiscover() {
  const feed = TRACKS.map((t) =>
    `<label class="tcard" for="scr-det-${t.id}" data-cat="${cat(t)}" data-search="${(t.title + ' ' + t.artist + ' ' + t.key).toLowerCase()}">` +
    `<span class="tart">${coverSVG(t)}</span>` +
    `<span class="tmeta"><span class="tt">${t.title}</span><span class="ta">${t.artist}</span>` +
    `<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>${momChip(t.mom)}</span></span>` +
    `<span class="tprice"><span class="pf">from</span><span class="pv">${money(fromPrice(t))}</span></span></label>`
  ).join('');
  return scr('discover', '',
    `<div class="eyebrow">For brands &amp; creators</div><div class="s-title">Discover</div>` +
    `<p class="s-sub">Every track here is humans-only and provably so. License before it heats up.</p>` +
    `<div class="searchbar"><span class="sb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>` +
      `<input type="search" class="search-input" data-search-input placeholder="Search a track, artist, or key…" aria-label="Search tracks">` +
      `<label class="sb-clear" data-search-clear hidden>✕</label></div>` +
    `<div class="chips">` +
      `<label class="fchip" for="flt-all" data-f="all">All</label>` +
      `<label class="fchip" for="flt-fire" data-f="fire">Heating up</label>` +
      `<label class="fchip" for="flt-cold" data-f="cold">New &amp; cold</label>` +
    `</div><div class="feed" data-feed>${feed}<div class="empty" data-no-results hidden>No tracks match your search.</div></div>`);
}

function screenTrackDetail(t) {
  const m = MOM[t.mom];
  const scopeOpts = SCOPES.map((sc) =>
    `<label class="seg-opt" for="sc-${t.id}-${sc.id}" data-scope="${sc.id}">` +
    `<span class="so-l">${sc.name}<small>${sc.sub}</small></span><span class="so-m">×${sc.mult.toFixed(1)}</span></label>`
  ).join('');
  const exclRow = t.excl
    ? `<hr class="divline"><label class="trow-toggle" for="ex-${t.id}">` +
      `<span class="tt-copy">Make it exclusive<small>forecloses every future sale — priced highest when hot</small></span>` +
      `<span class="sw"><span class="swk"></span></span></label>`
    : '';
  const quotes = combos(t).map(([sc, ex]) => quotePanel(t, sc, ex)).join('');
  return scr('det-' + t.id, '',
    `<div class="schead">${back('discover')}<span class="sh-t">License</span></div>` +
    `<div class="trackhead"><span class="cover-lg">${coverSVG(t)}</span>` +
      `<div class="th-meta"><div class="htt">${t.title}</div>` +
      `<label class="hta artistlink" for="scr-artist-${slugOf(t.artist)}">${t.artist} ›</label></div></div>` +
    `<div class="trow2" style="margin-top:14px">` +
      `<span class="vbadge"><span class="vdot"></span>Verified human</span>${momChip(t.mom)}` +
      `<label class="seeproof" for="scr-report">See proof ›</label></div>` +
    `<div class="acard" style="margin-top:14px"><div class="eyebrow">Momentum score</div>` +
      `<div class="gauge" style="margin-top:10px"><div class="gtrack"><div class="gfill" style="width:${m.score}%"></div></div>` +
      `<div class="glab"><span>Cold</span><span>${m.label} · ${m.score}/100</span><span>On fire</span></div></div>` +
      `<div class="kv"><span class="k">Tempo</span><span class="v">${t.bpm} BPM · ${t.key}</span></div>` +
      `<div class="kv"><span class="k">Clearance</span><span class="v">worldwide · perpetual · non-exclusive*</span></div></div>` +
    `<div class="acard" style="margin-top:12px"><div class="eyebrow">Build your license</div>` +
      `<div class="seg" style="margin-top:12px">${scopeOpts}</div>${exclRow}</div>` +
    `<div class="quote" style="margin-top:12px">${quotes}</div>` +
    `<label class="pbtn" for="scr-co-${t.id}" style="margin-top:14px">License this track →</label>` +
    `<p class="note-line" style="text-align:center;margin-top:12px">Artist keeps 100%. The 20% is the only add-on, shown above.</p>`);
}

function screenCheckout(t) {
  const panels = combos(t).map(([sc, ex]) => coPanel(t, sc, ex)).join('');
  return scr('co-' + t.id, '',
    `<div class="schead">${back('det-' + t.id)}<span class="sh-t">Checkout</span></div>` +
    `<div class="acard" style="display:flex;gap:13px;align-items:center">` +
      `<span class="tart" style="width:52px;height:52px">${coverSVG(t)}</span>` +
      `<div><div style="font-family:var(--display);font-weight:700;font-size:17px">${t.title}</div>` +
      `<div class="s-sub" style="margin-top:1px">${t.artist}</div></div></div>` +
    `<div style="margin-top:12px">${panels}</div>` +
    `<div class="eyebrow" style="margin-top:18px">Payment</div>` +
    `<div class="paychip" style="margin-top:10px"><span class="pc-ic"></span><div class="pc-t">Visa •••• 4242<small>Processed by Stripe</small></div><span style="margin-left:auto;color:var(--good)">✓</span></div>` +
    `<p class="note-line" style="text-align:center;margin-top:14px">No wallet, no tokens. Feels like any checkout — the provenance record is anchored behind the scenes.</p>`);
}

function screenReceipt(t) {
  const panels = combos(t).map(([sc, ex]) => rcPanel(t, sc, ex)).join('');
  return scr('rc-' + t.id, '',
    `<div class="schead">${back('discover')}<span class="sh-t">Confirmed</span></div>` +
    `<div style="text-align:center;padding:6px 0 2px"><div class="success-ring">✓</div>` +
      `<div class="s-title" style="text-align:center">License confirmed</div></div>` +
    `<div>${panels}</div>` +
    `<div class="acard" style="margin-top:12px;padding:6px 18px">` +
      `<div class="kv"><span class="k">Track</span><span class="v">${t.title} · ${t.artist}</span></div>` +
      `<div class="kv"><span class="k">Verification</span><span class="v" style="color:var(--good)">human · 100%</span></div></div>` +
    `<div class="anchor-box" style="margin-top:12px"><div class="ab-h">Anchored · tamper-proof registry</div>` +
      `<div class="hashrow"><span class="hk">base:tx</span><span>0x9f3c…a71d</span></div>` +
      `<div class="hashrow"><span class="hk">arweave</span><span>kQ7…Lm2</span></div>` +
      `<div class="hashrow"><span class="hk">status</span><span style="color:var(--good)">contract pinned · permanent</span></div></div>` +
    `<label class="pbtn" for="scr-licenses" style="margin-top:14px">View in your licenses →</label>` +
    `<label class="pbtn ghost" for="scr-report" style="margin-top:10px">Verify this license ›</label>` +
    `<label class="pbtn ghost" for="scr-discover" style="margin-top:10px">Back to Discover</label>`);
}

/* buyer library — the brand's purchased licenses */
function screenLicenses() {
  const totalSpent = LICENSED.reduce((a, l) => a + licPrice(l).buyer, 0);
  const list = LICENSED.map((l) => {
    const t = track(l.id), sc = scopeOf(l.scope);
    return `<label class="tcard" for="scr-lic-${l.id}">` +
      `<span class="tart">${coverSVG(t)}</span>` +
      `<span class="tmeta"><span class="tt">${t.title}</span><span class="ta">${t.artist}</span>` +
      `<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>` +
      `<span class="mom-chip" data-m="warm">${sc.name}${l.excl ? ' · excl' : ''}</span></span></span>` +
      `<span class="tprice"><span class="pf">${l.ago}</span><span class="pv" style="font-size:15px">${money(licPrice(l).buyer)}</span></span></label>`;
  }).join('');
  return scr('licenses', '',
    `<div class="eyebrow">For brands &amp; creators</div><div class="s-title">Your licenses</div>` +
    `<div class="earn" style="margin-top:14px"><div class="e-lab">Licensed &amp; cleared to use</div>` +
      `<div class="e-amt">${LICENSED.length}<small> tracks</small></div>` +
      `<div class="e-sub" style="color:var(--ink-dim)">${money(totalSpent)} spent · all verified human</div></div>` +
    `<div class="eyebrow" style="margin-top:20px">Library</div>` +
    `<div class="feed" style="margin-top:10px">${list}</div>` +
    `<p class="note-line" style="text-align:center;margin-top:16px">Every license here is yours to download, with a tamper-proof receipt you can re-check anytime.</p>`);
}

function screenLicenseDetail(l) {
  const t = track(l.id), sc = scopeOf(l.scope), p = licPrice(l);
  return scr('lic-' + l.id, '',
    `<div class="schead">${back('licenses')}<span class="sh-t">License</span></div>` +
    `<div class="trackhead"><span class="cover-lg">${coverSVG(t)}</span>` +
      `<div class="th-meta"><div class="htt">${t.title}</div>` +
      `<label class="hta artistlink" for="scr-artist-${slugOf(t.artist)}">${t.artist} ›</label></div></div>` +
    `<div class="trow2" style="margin-top:14px"><span class="vbadge"><span class="vdot"></span>Verified human</span>` +
      `<span class="mom-chip" data-m="warm">Cleared</span></div>` +
    `<div class="acard" style="margin-top:14px;padding:6px 18px">` +
      `<div class="kv"><span class="k">Cleared for</span><span class="v">${sc.name}${l.excl ? ' · exclusive' : ' · non-exclusive'}</span></div>` +
      `<div class="kv"><span class="k">Term</span><span class="v">worldwide · perpetual</span></div>` +
      `<div class="kv"><span class="k">Licensed on</span><span class="v">${l.date}</span></div>` +
      `<div class="kv"><span class="k">Paid</span><span class="v">${money(p.buyer)}</span></div></div>` +
    `<div class="eyebrow" style="margin-top:18px">Your assets</div>` +
    `<label class="pbtn dl-${l.id}-btn" for="dl-${l.id}" style="margin-top:10px">Download assets</label>` +
    `<div class="dl-done dl-${l.id}-done">✓ Saved to your files — <b>${fileName(t)}</b> + <b>license.pdf</b></div>` +
    `<label class="pbtn ghost" for="scr-report" style="margin-top:10px">Re-verify provenance ›</label>` +
    `<div class="anchor-box" style="margin-top:12px"><div class="ab-h">Receipt · tamper-proof registry</div>` +
      `<div class="hashrow"><span class="hk">base:tx</span><span>0x9f3c…a71d</span></div>` +
      `<div class="hashrow"><span class="hk">arweave</span><span>kQ7…Lm2</span></div>` +
      `<div class="hashrow"><span class="hk">status</span><span style="color:var(--good)">contract pinned · permanent</span></div></div>`);
}

/* public artist profile */
function screenArtist(name) {
  const meta = ARTIST_META[name], mine = tracksByArtist(name);
  const list = mine.map((t) =>
    `<label class="tcard" for="scr-det-${t.id}">` +
    `<span class="tart">${coverSVG(t)}</span>` +
    `<span class="tmeta"><span class="tt">${t.title}</span><span class="ta">${t.bpm} BPM · ${t.key}</span>` +
    `<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>${momChip(t.mom)}</span></span>` +
    `<span class="tprice"><span class="pf">from</span><span class="pv">${money(fromPrice(t))}</span></span></label>`
  ).join('');
  return scr('artist-' + meta.slug, '',
    `<div class="schead">${back('discover')}<span class="sh-t">Artist</span></div>` +
    `<div class="artist-hero"><span class="tart" style="width:84px;height:84px;border-radius:50%">${disc(meta.slug, meta.acc)}</span>` +
      `<div class="ah-name">${name}</div>` +
      `<div class="ah-meta"><span class="vbadge"><span class="vdot"></span>Verified human</span>` +
      `<span class="ah-loc">${meta.loc}</span></div></div>` +
    `<p class="s-sub" style="margin-top:14px">${meta.bio}</p>` +
    `<div class="minigrid" style="margin-top:14px">` +
      `<div class="mstat"><div class="mn">${mine.length}</div><div class="ml">tracks · humans-only</div></div>` +
      `<div class="mstat"><div class="mn">100%</div><div class="ml">human-verified</div></div></div>` +
    `<div class="eyebrow" style="margin-top:20px">Catalog</div>` +
    `<div class="feed" style="margin-top:10px">${list}</div>`);
}

function screenStudio() {
  const mine = TRACKS.filter((t) => t.mine);
  const totalEarned = mine.reduce((a, t) => a + (t.earned || 0), 0);
  const totalLic = mine.reduce((a, t) => a + (t.licenses || 0), 0);
  const list = mine.map((t) =>
    `<label class="tcard" for="scr-det-${t.id}">` +
    `<span class="tart">${coverSVG(t)}</span>` +
    `<span class="tmeta"><span class="tt">${t.title}</span><span class="ta">${t.licenses || 0} licenses · ${money(t.earned || 0)} earned</span>` +
    `<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>${momChip(t.mom)}</span></span>` +
    `<span class="tprice"><span class="pf">status</span><span class="pv" style="font-size:13px;color:var(--good)">LIVE</span></span></label>`
  ).join('');
  return scr('studio', '',
    `<div class="eyebrow">Artist studio</div><div class="s-title">Hey, Mara</div>` +
    `<div class="earn" style="margin-top:14px"><div class="e-lab">Lifetime earnings · you keep 100%</div>` +
      `<div class="e-amt">${money(totalEarned)}</div><div class="e-sub">+$612 in the last 30 days</div>` +
      `<div class="minigrid"><div class="mstat"><div class="mn">${mine.length}</div><div class="ml">tracks live</div></div>` +
      `<div class="mstat"><div class="mn">${totalLic}</div><div class="ml">licenses sold</div></div></div></div>` +
    `<label class="pbtn" for="scr-up1" style="margin-top:14px">Upload a track</label>` +
    `<div class="eyebrow" style="margin-top:22px">Your catalog</div><div class="feed" style="margin-top:10px">${list}</div>`);
}

/* upload steps */
function screenUp1() {
  return scr('up1', '',
    upHead(0, 'discover'.replace('discover', 'studio')) +
    `<div class="eyebrow">Step 1 · File</div><div class="s-title" style="font-size:23px">Add your track</div>` +
    `<label class="dropzone" for="scr-up2" style="margin-top:16px"><div class="dz-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg></div>` +
      `<div class="dz-t">Drop an audio file</div><div class="dz-s">WAV / FLAC / MP3 · up to 100 MB</div></label>` +
    `<p class="note-line" style="margin-top:14px">Humans only. Every upload is fingerprinted and scanned — AI-generated tracks are rejected.</p>`);
}
function screenUp2() {
  const line = (t, v) => `<div class="scan-line show ok"><span class="sl-ic">✓</span><span class="sl-t">${t}</span><span class="sl-v">${v}</span></div>`;
  return scr('up2', '',
    upHead(1, 'up1') +
    `<div class="eyebrow">Step 2 · Verify</div><div class="s-title" style="font-size:23px">Checked — it’s real</div>` +
    `<p class="s-sub">midnight_drive_master.wav</p>` +
    `<div class="acard" style="margin-top:14px;padding:6px 18px">` +
      line('AudD acoustic fingerprint', 'no match — original') +
      line('C2PA Content Credentials', 'written to file') +
      line('AI-generation scan', '0% synthetic') +
      line('Format &amp; loudness', 'WAV · −14 LUFS') +
    `</div><label class="pbtn" for="scr-up3" style="margin-top:16px">Looks human — continue →</label>`);
}
function screenUp3() {
  return scr('up3', '',
    upHead(2, 'up2') +
    `<div class="eyebrow">Step 3 · Attest</div><div class="s-title" style="font-size:23px">Sign the attestation</div>` +
    `<p class="s-sub">This is the claim with teeth — a signed, on-record statement that the work is human-made. Misrepresentation voids your account.</p>` +
    `<div class="attest signed" style="margin-top:16px"><div style="font-size:14px;line-height:1.6">“I, <b>Mara Vance</b>, made <b>Midnight Drive</b> as a human work. No part was generated by AI. I authorize HRMNY to license it on my behalf under the terms I set.”</div>` +
      `<div class="at-sig">✓ Ready to sign · sig will be recorded on submit</div></div>` +
    `<label class="pbtn" for="scr-up4" style="margin-top:16px">Sign as Mara Vance →</label>`);
}
function screenUp4() {
  const b0 = price(120, 1.0, 0, false).buyer;
  const warmPaid = price(120, 2.2, 2, false).artist;
  const scopeChk = (name, mult) =>
    `<div class="checkrow on"><span class="cbx">✓</span><span class="cl">${name}<small>licenses at ${mult} of base</small></span></div>`;
  return scr('up4', '',
    upHead(3, 'up3') +
    `<div class="eyebrow">Step 4 · Price</div><div class="s-title" style="font-size:23px">Set your terms</div>` +
    `<p class="s-sub">You set the base. HRMNY only ever raises the <i>suggested</i> price as momentum builds — never lowers it, never takes a cut from you.</p>` +
    `<div class="acard" style="margin-top:14px"><div class="field" style="margin:0"><label>Your base price (Organic)</label>` +
      `<input type="text" inputmode="numeric" value="120" aria-label="Base price"></div>` +
      `<hr class="divline"><div class="eyebrow" style="margin-bottom:8px">Offer these scopes</div>` +
      scopeChk('Organic / Creator', '×1.0') + scopeChk('Paid Social', '×2.2') + scopeChk('Broad Campaign', '×4.5') +
    `</div>` +
    `<div class="quote" style="margin-top:12px"><div class="qpanel" style="display:block">` +
      `<div class="qrow"><span class="qk">Buyer-facing “from” price</span><span class="qv" style="color:var(--human)">${money(b0)}</span></div>` +
      `<div class="qproj">New tracks start <b>Cold</b>. As creators pick it up, your suggested price climbs — a Paid Social license would suggest <b>${money(warmPaid)}</b> to you at Warm.</div></div></div>` +
    `<label class="pbtn" for="scr-published" style="margin-top:16px">Publish to catalog →</label>`);
}
const upHead = (step, backTo) =>
  `<div class="schead">${back(backTo)}<span class="sh-t">New track</span></div>` +
  `<div class="steps">${[0,1,2,3].map((i) => `<div class="stp ${i < step ? 'done' : i === step ? 'cur' : ''}"></div>`).join('')}</div>`;

function screenPublished() {
  const b0 = price(120, 1.0, 0, false).buyer;
  return scr('published', '',
    `<div class="schead">${back('studio')}<span class="sh-t">Confirmed</span></div>` +
    `<div style="text-align:center;padding:6px 0 2px"><div class="success-ring">✓</div>` +
      `<div class="s-title" style="text-align:center">You’re live</div>` +
      `<p class="s-sub" style="text-align:center;max-width:30ch;margin:8px auto 0">“Midnight Drive” is verified, attested, and listed at ${money(b0)} from.</p></div>` +
    `<div class="acard" style="margin-top:14px;padding:6px 18px">` +
      `<div class="kv"><span class="k">Verification</span><span class="v" style="color:var(--good)">human · 100%</span></div>` +
      `<div class="kv"><span class="k">Attestation</span><span class="v" style="color:var(--good)">signed</span></div>` +
      `<div class="kv"><span class="k">Registry</span><span class="v">base:tx 0x9f3c…a71d</span></div></div>` +
    `<label class="pbtn" for="scr-discover" style="margin-top:16px">View in catalog</label>` +
    `<label class="pbtn ghost" for="scr-studio" style="margin-top:10px">Back to Studio</label>`);
}

function screenVerify() {
  return scr('verify', '',
    `<div class="eyebrow">Provenance</div><div class="s-title">Verify a track</div>` +
    `<p class="s-sub">Anyone can print “human-made.” HRMNY proves it — fingerprint, content credentials, a signed attestation, and a tamper-proof anchor. Run a check.</p>` +
    `<div class="scanbox" style="margin-top:18px"><div class="scan-target">${coverSVG(track('midnight'))}</div>` +
      `<div style="font-family:var(--display);font-weight:700;font-size:17px">“Midnight Drive”</div>` +
      `<div class="s-sub" style="margin-top:2px">Mara Vance</div>` +
      `<label class="pbtn" for="scr-report" style="margin-top:16px">Run verification</label></div>` +
    `<p class="note-line" style="text-align:center;margin-top:14px">Reachable from any track’s “See proof” too.</p>`);
}
function screenReport() {
  const line = (t, v) => `<div class="scan-line show ok"><span class="sl-ic">✓</span><span class="sl-t">${t}</span><span class="sl-v">${v}</span></div>`;
  return scr('report', '',
    `<div class="schead">${back('verify')}<span class="sh-t">Report</span></div>` +
    `<div class="report-head"><div class="rh-score">100<span style="font-size:24px">%</span></div><div class="rh-lab">Human · verified</div></div>` +
    `<div class="acard" style="margin:14px 0 0;display:flex;gap:12px;align-items:center">` +
      `<span class="tart" style="width:46px;height:46px">${coverSVG(track('midnight'))}</span>` +
      `<div><div style="font-family:var(--display);font-weight:700;font-size:16px">Midnight Drive</div><div class="s-sub" style="margin-top:1px">Mara Vance</div></div></div>` +
    `<div class="acard" style="margin-top:12px;padding:6px 18px">` +
      line('AudD acoustic fingerprint', 'original — no prior match') +
      line('C2PA Content Credentials', 'intact · unbroken chain') +
      line('Human-made attestation', 'signed by Mara Vance') +
      line('AI-generation scan', '0% synthetic') +
      line('Hard AI ban', 'humans-only catalog') +
    `</div>` +
    `<div class="anchor-box" style="margin-top:12px"><div class="ab-h">On-chain registry · ownership &amp; clearance</div>` +
      `<div class="hashrow"><span class="hk">base:tx</span><span>0x9f3c…a71d</span></div>` +
      `<div class="hashrow"><span class="hk">arweave</span><span>kQ7…Lm2</span></div>` +
      `<div class="hashrow"><span class="hk">contract</span><span style="color:var(--good)">pinned · permanent</span></div></div>` +
    `<p class="note-line" style="margin-top:14px">The license stays off-chain and legal; the chain is only a tamper-proof anchor. Provable, not just printable.</p>`);
}
function screenWallet() {
  const txn = (ic, t, sub, v, dir) => `<div class="txn"><span class="tx-ic">${ic}</span><div class="tx-t">${t}<small>${sub}</small></div><span class="tx-v ${dir}">${v}</span></div>`;
  return scr('wallet', '',
    `<div class="eyebrow">Payouts</div><div class="s-title">Wallet</div>` +
    `<div class="earn" style="margin-top:14px"><div class="e-lab">Available to pay out</div>` +
      `<div class="e-amt">$612<small>.00</small></div>` +
      `<label class="pbtn sm payout-btn" for="pay-sent" style="margin-top:10px;width:auto;display:inline-flex;padding:10px 20px">Pay out to bank →</label>` +
      `<div class="payout-done">✓ $612 on its way to •••• 4471 · arrives in ~2 days</div></div>` +
    `<div class="connect" style="margin-top:14px"><span class="cn-dot"></span>` +
      `<div class="cn-t">Stripe Connect · active<small>Verified · payouts land in ~2 business days</small></div></div>` +
    `<div class="eyebrow" style="margin-top:22px">Recent activity</div>` +
    `<div class="acard" style="margin-top:10px;padding:6px 16px">` +
      txn('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="m6 12 6 6 6-6"/></svg>', '“Midnight Drive” · Paid Social', 'Licensed by Lumen Studios', '+$343', 'in') +
      txn('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="m6 12 6 6 6-6"/></svg>', '“Paper Cranes” · Organic', 'Licensed by @veracreates', '+$120', 'in') +
      txn('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6"/><path d="m6 12 6-6 6 6"/></svg>', 'Payout to •••• 4471', 'May 30', '−$1,540', 'out') +
      txn('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13"/><path d="m6 12 6 6 6-6"/></svg>', '“Midnight Drive” · Broad + Exclusive', 'Licensed by Atlas Athletic', '+$2,592', 'in') +
    `</div>` +
    `<p class="note-line" style="margin-top:16px">The gate, working: liquidity first. Payout rails are the precondition — every other pillar sits on top of this transaction clearing.</p>`);
}

function scr(id, mods, inner) {
  return `<section class="screen${mods ? ' ' + mods : ''}" data-screen="${id}">${inner}</section>`;
}

/* ——— tab bar ——— */
function tabbar() {
  const tab = (to, label, svg) => `<label class="tab" for="scr-${to}" data-tab="${to}">${svg}<span class="tlab">${label}</span></label>`;
  return `<nav class="tabbar">` +
    tab('discover', 'Discover', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>') +
    tab('licenses', 'Licenses', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 4-4"/></svg>') +
    tab('studio', 'Studio', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>') +
    tab('verify', 'Verify', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>') +
    tab('wallet', 'Wallet', '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>') +
    `</nav>`;
}

/* ——————————————————— assemble app.html ——————————————————— */
const screensHTML = [
  screenLaunch(), screenDiscover(),
  ...TRACKS.map(screenTrackDetail), ...TRACKS.map(screenCheckout), ...TRACKS.map(screenReceipt),
  screenLicenses(), ...LICENSED.map(screenLicenseDetail), ...ARTISTS.map(screenArtist),
  screenStudio(), screenUp1(), screenUp2(), screenUp3(), screenUp4(), screenPublished(),
  screenVerify(), screenReport(), screenWallet(),
].join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>HRMNY · App Demo</title>
<meta name="description" content="A clickable, no-JS-required prototype of the HRMNY app — discover verified-human tracks, license with live value pricing, upload &amp; verify as an artist, and get paid." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="assets/styles.css" />
<link rel="stylesheet" href="assets/app-proto.css" />
<link rel="stylesheet" href="assets/app-gen.css" />
</head>
<body>

<div class="stage">
  <div class="stage-head">
    <a class="brand" href="index.html" style="text-decoration:none">${LOGO()}<b>HRMNY</b></a>
    <h1>The app, clickable</h1>
    <p>The three pillars as a working product — discover &amp; license verified-human music with live value pricing, upload &amp; prove a track as an artist, and watch the payout land. Tap anything. Works without scripts.</p>
  </div>

  <div class="phone" id="phone">
    ${stateInputs()}
    <div class="notch"></div>
    <div class="statusbar"><span>9:41</span><span class="sb-icons">
      <svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor"/><rect x="5" y="4" width="3" height="8" rx="1" fill="currentColor"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".4"/></svg>
      <svg viewBox="0 0 18 12" aria-hidden="true"><path d="M9 2.5C5.5 2.5 2.7 4 1 5.6l8 6.4 8-6.4C15.3 4 12.5 2.5 9 2.5Z" fill="currentColor"/></svg>
      <svg viewBox="0 0 18 12" aria-hidden="true"><rect x="0.5" y="1" width="14" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="2" y="2.5" width="10" height="7" rx="1" fill="currentColor"/><rect x="15.5" y="4" width="2" height="4" rx="1" fill="currentColor"/></svg>
    </span></div>

    <div class="appbar"><span class="ab-brandrow">${LOGO('logo-mark ab-mark')}<span class="ab-title">HRMNY</span></span></div>

    <div class="screens">
${screensHTML}
    </div>

    ${tabbar()}
  </div>

  <div class="stage-foot">
    <div class="hint" style="margin-bottom:10px">Live prototype — pure CSS, every control responds</div>
    <a href="index.html">‹ Back to the Through-Line</a>
  </div>
</div>

<script src="assets/app-search.js"></script>
</body>
</html>
`;

/* ——————————————————— generated CSS reveal rules ——————————————————— */
let css = `/* GENERATED by generate-app.mjs — do not edit by hand.
   Pure-CSS reveal rules: screen routing, tab highlighting, and the precomputed
   price panels per track × scope × exclusivity. Driven by hidden inputs in
   #phone .state via :has(). */\n\n`;

// screen routing
const allScreens = ['launch', 'discover', 'licenses', 'studio', 'verify', 'wallet', 'up1', 'up2', 'up3', 'up4', 'published', 'report'];
TRACKS.forEach((t) => allScreens.push('det-' + t.id, 'co-' + t.id, 'rc-' + t.id));
LICENSED.forEach((l) => allScreens.push('lic-' + l.id));
ARTISTS.forEach((name) => allScreens.push('artist-' + slugOf(name)));
css += '/* screen routing */\n';
allScreens.forEach((id) => {
  css += `#phone:has(#scr-${id}:checked) .screen[data-screen="${id}"]{display:block}\n`;
});

// tab active families
const fam = { discover: ['discover'], licenses: ['licenses'], studio: ['studio', 'up1', 'up2', 'up3', 'up4', 'published'], verify: ['verify', 'report'], wallet: ['wallet'] };
TRACKS.forEach((t) => { fam.discover.push('det-' + t.id, 'co-' + t.id, 'rc-' + t.id, 'artist-' + slugOf(t.artist)); });
LICENSED.forEach((l) => { fam.licenses.push('lic-' + l.id); });
css += '\n/* tab highlight */\n';
Object.entries(fam).forEach(([tabName, ids]) => {
  ids.forEach((id) => {
    css += `#phone:has(#scr-${id}:checked) .tab[data-tab="${tabName}"]{color:var(--human)}\n`;
    css += `#phone:has(#scr-${id}:checked) .tab[data-tab="${tabName}"] .tlab{color:var(--ink)}\n`;
  });
});
// hide tabbar on launch
css += `\n#phone:has(#scr-launch:checked) .tabbar{display:none}\n`;

// discover filter
css += '\n/* discover filter */\n';
css += `#phone:has(#flt-fire:checked) .feed .tcard:not([data-cat="fire"]){display:none}\n`;
css += `#phone:has(#flt-cold:checked) .feed .tcard:not([data-cat="cold"]){display:none}\n`;
['all', 'fire', 'cold'].forEach((f) => {
  css += `#phone:has(#flt-${f}:checked) .chips .fchip[data-f="${f}"]{border-color:var(--human);color:var(--human)}\n`;
});

// scope segmented-control selected state (accent border + faint tint, accent multiplier)
// scoped to each track's own screen so other tracks' default Organic doesn't bleed in
css += '\n/* scope selection highlight */\n';
TRACKS.forEach((t) => {
  SCOPES.forEach((sc) => {
    const at = `#phone:has(#sc-${t.id}-${sc.id}:checked) .screen[data-screen="det-${t.id}"] .seg-opt[data-scope="${sc.id}"]`;
    css += `${at}{border-color:var(--human);background:rgba(124,58,237,.06)}\n`;
    css += `${at} .so-m{color:var(--human)}\n`;
  });
});

// exclusivity toggle on-state (knob travel matches the 46px/20px switch)
css += '\n/* exclusivity toggle on-state */\n';
TRACKS.filter((t) => t.excl).forEach((t) => {
  css += `#phone:has(#ex-${t.id}:checked) .screen[data-screen="det-${t.id}"] .trow-toggle .sw{background:rgba(124,58,237,.35);border-color:var(--human)}\n`;
  css += `#phone:has(#ex-${t.id}:checked) .screen[data-screen="det-${t.id}"] .trow-toggle .sw .swk{transform:translateX(20px);background:#fff}\n`;
});

// price panels: default hidden, reveal the matching combo
css += '\n/* price panels */\n.qpanel,.copanel,.rcpanel{display:none}\n';
TRACKS.forEach((t) => {
  combos(t).forEach(([sc, ex]) => {
    const exSel = t.excl ? (ex ? `:has(#ex-${t.id}:checked)` : `:not(:has(#ex-${t.id}:checked))`) : '';
    const cond = `#phone:has(#sc-${t.id}-${sc.id}:checked)${exSel}`;
    const suffix = ex ? 'ex' : 'no';
    css += `${cond} .q-${t.id}-${sc.id}-${suffix}{display:block}\n`;
    css += `${cond} .co-${t.id}-${sc.id}-${suffix}{display:block}\n`;
    css += `${cond} .rc-${t.id}-${sc.id}-${suffix}{display:block}\n`;
  });
});

// wallet payout toggle
css += '\n/* wallet payout (!important beats the button\'s inline display) */\n.payout-done{display:none}\n';
css += `#phone:has(#pay-sent:checked) .payout-done{display:block;margin-top:10px;color:var(--good);font-family:var(--mono);font-size:12px}\n`;
css += `#phone:has(#pay-sent:checked) .payout-btn{display:none!important}\n`;

// license download toggle (buyer library)
css += '\n/* license downloads */\n.dl-done{display:none}\n';
LICENSED.forEach((l) => {
  css += `#phone:has(#dl-${l.id}:checked) .dl-${l.id}-done{display:block}\n`;
  css += `#phone:has(#dl-${l.id}:checked) .dl-${l.id}-btn{display:none!important}\n`;
});

// the brand bar is redundant on the launch screen (it has its own big logo)
css += '\n/* launch chrome */\n#phone:has(#scr-launch:checked) .appbar{display:none}\n';

fs.writeFileSync(path.join(dir, 'app.html'), html);
fs.writeFileSync(path.join(dir, 'assets/app-gen.css'), css);
console.log('wrote app.html (' + Math.round(html.length / 1024) + ' KB) + assets/app-gen.css (' + css.split('\n').length + ' rules)');
