/* HRMNY — clickable app prototype engine.
   A tiny screen router + the three flows (Discover/license, Studio/upload, Verify)
   wired to the real value-pricing model from the Through-Line page. Sample data
   only; no network, no real payments. */
(function () {
  "use strict";

  /* ——————————————————————— pricing model ———————————————————————
     Canonical model (matches the Through-Line calculator):
     artist = base × scope × momentum × (exclusive ? exclFactor : 1)
     buyer  = artist × 1.20   (transparent 20% buyer-side fee)            */
  var SCOPES = [
    { id: "org",   name: "Organic / Creator", sub: "1 platform · organic posts", mult: 1.0 },
    { id: "paid",  name: "Paid Social",        sub: "boosted / paid ads",          mult: 2.2 },
    { id: "broad", name: "Broad Campaign",     sub: "multi-platform · all media",  mult: 4.5 }
  ];
  var MOM = [
    { key: "cold", label: "Cold",    mom: 1.00, excl: 1.500, score: 10 },
    { key: "cool", label: "Cool",    mom: 1.15, excl: 1.875, score: 30 },
    { key: "warm", label: "Warm",    mom: 1.30, excl: 2.250, score: 54 },
    { key: "hot",  label: "Hot",     mom: 1.45, excl: 2.625, score: 78 },
    { key: "fire", label: "On Fire", mom: 1.60, excl: 3.000, score: 94 }
  ];
  function scopeMult(id) { for (var i = 0; i < SCOPES.length; i++) if (SCOPES[i].id === id) return SCOPES[i].mult; return 1; }
  function price(base, scopeId, momIdx, exclusive) {
    var m = MOM[momIdx];
    var artist = base * scopeMult(scopeId) * m.mom * (exclusive ? m.excl : 1);
    var fee = artist * 0.20;
    return { artist: Math.round(artist), fee: Math.round(fee), buyer: Math.round(artist + fee) };
  }
  function projected(base, scopeId, momIdx, exclusive) {
    // suggested ~30-day price: one momentum tier up (top tier keeps climbing +18%)
    if (momIdx >= MOM.length - 1) return Math.round(price(base, scopeId, momIdx, exclusive).buyer * 1.18);
    return price(base, scopeId, momIdx + 1, exclusive).buyer;
  }
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  function fromPrice(t) { return price(t.base, "org", t.mom, false).buyer; } // cheapest entry, buyer-facing

  /* ——————————————————————— sample catalog ——————————————————————— */
  var ART = {
    violet: "linear-gradient(135deg,#7c3aed,#c77dff)",
    green:  "linear-gradient(135deg,#5fd39a,#7c3aed)",
    fire:   "linear-gradient(135deg,#c77dff,#ff8ab0)",
    cool:   "linear-gradient(135deg,#4356c7,#9d6bf5)",
    dusk:   "linear-gradient(135deg,#2a1a4a,#7c3aed)",
    sand:   "linear-gradient(135deg,#6a6580,#15111d)"
  };
  // mom = index into MOM; mine = appears in the artist's Studio catalog
  var TRACKS = [
    { id: "midnight", title: "Midnight Drive", artist: "Mara Vance",  base: 120, mom: 3, art: ART.violet, excl: true,  mine: true,  bpm: 112, key: "F♯ min", licenses: 17, earned: 4820 },
    { id: "neon",     title: "Neon Tide",      artist: "KOJI",         base: 150, mom: 4, art: ART.fire,   excl: true,  mine: false, bpm: 128, key: "A min" },
    { id: "bloom",    title: "Slow Bloom",     artist: "Elara",        base: 90,  mom: 2, art: ART.dusk,   excl: true,  mine: false, bpm: 96,  key: "C maj" },
    { id: "gravity",  title: "Gravity Sells",  artist: "The Foley",    base: 110, mom: 1, art: ART.cool,   excl: false, mine: false, bpm: 104, key: "D min" },
    { id: "cranes",   title: "Paper Cranes",   artist: "Mara Vance",   base: 100, mom: 0, art: ART.green,  excl: true,  mine: true,  bpm: 88,  key: "G maj", licenses: 4, earned: 480 },
    { id: "cellar",   title: "Cellar Door",    artist: "Mara Vance",   base: 110, mom: 2, art: ART.cool,   excl: true,  mine: true,  bpm: 100, key: "E min", licenses: 6, earned: 1290 },
    { id: "static",   title: "Static Bloom",   artist: "Wren",         base: 80,  mom: 0, art: ART.sand,   excl: false, mine: false, bpm: 120, key: "B min" }
  ];
  function track(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return TRACKS[i]; return null; }

  /* ——————————————————————— DOM + router ——————————————————————— */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var screens = $("#screens");
  var abBack = $("#abBack"), abTitle = $("#abTitle"), abMark = $("#abMark"), abAction = $("#abAction");
  var tabbar = $("#tabbar"), toastEl = $("#toast");

  // screen → { title, tab (which bottom tab lights), root (a tab destination?) }
  var META = {
    launch:   { title: "HRMNY",   tab: null,       root: false, bare: true },
    discover: { title: "Discover", tab: "discover", root: true  },
    track:    { title: "License",  tab: "discover", root: false },
    checkout: { title: "Checkout", tab: "discover", root: false },
    receipt:  { title: "Confirmed", tab: "discover", root: false },
    studio:   { title: "Studio",   tab: "studio",   root: true  },
    upload:   { title: "New track", tab: "studio",  root: false },
    manage:   { title: "Track",    tab: "studio",   root: false },
    verify:   { title: "Verify",   tab: "verify",   root: true  },
    report:   { title: "Report",   tab: "verify",   root: false },
    wallet:   { title: "Wallet",   tab: "wallet",   root: true  }
  };

  var stack = ["launch"];
  function current() { return stack[stack.length - 1]; }

  function paint() {
    var name = current(), meta = META[name];
    // show the right section
    var all = screens.querySelectorAll(".screen");
    for (var i = 0; i < all.length; i++) all[i].classList.toggle("active", all[i].getAttribute("data-screen") === name);
    screens.scrollTop = 0;
    // app bar
    abTitle.textContent = meta.title;
    var atRoot = meta.root || stack.length <= 1;
    abBack.hidden = atRoot;
    abMark.style.display = atRoot ? "" : "none";
    abAction.hidden = true; abAction.onclick = null;
    // tab bar visibility + active state
    tabbar.classList.toggle("hidden", !!meta.bare);
    var tabs = tabbar.querySelectorAll(".tab");
    for (var j = 0; j < tabs.length; j++) tabs[j].classList.toggle("active", tabs[j].getAttribute("data-tab") === meta.tab);
  }

  // navigate: push a new screen
  function go(name, render) {
    if (typeof render === "function") render();
    stack.push(name);
    paint();
  }
  // switch to a tab root (resets stack to that root)
  function goTab(name, render) {
    if (typeof render === "function") render();
    stack = [name];
    paint();
  }
  function back() {
    if (stack.length > 1) { stack.pop(); paint(); }
  }
  abBack.addEventListener("click", back);

  var tabBtns = tabbar.querySelectorAll(".tab");
  for (var t = 0; t < tabBtns.length; t++) {
    (function (btn) {
      btn.addEventListener("click", function () {
        var dest = btn.getAttribute("data-tab");
        if (dest === "discover") goTab("discover", renderFeed);
        else if (dest === "studio") goTab("studio", renderStudio);
        else if (dest === "verify") goTab("verify");
        else goTab("wallet");
      });
    })(tabBtns[t]);
  }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1900);
  }
  function hex(n) { var s = ""; for (var i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)]; return s; }

  /* ——————————————————————— LAUNCH ——————————————————————— */
  $("#roleBrand").addEventListener("click", function () { goTab("discover", renderFeed); });
  $("#roleArtist").addEventListener("click", function () { goTab("studio", renderStudio); });

  /* ——————————————————————— DISCOVER ——————————————————————— */
  var feedFilter = "all";
  function momChip(idx) {
    var m = MOM[idx];
    return '<span class="mom-chip" data-m="' + m.key + '">' + (idx >= 3 ? "🔥 " : "") + m.label + " · " + m.score + "</span>";
  }
  function trackCardHTML(t) {
    return '<button class="tcard" data-open="' + t.id + '">' +
      '<span class="tart" style="background:' + t.art + '"></span>' +
      '<span class="tmeta"><span class="tt">' + t.title + '</span>' +
      '<span class="ta">' + t.artist + '</span>' +
      '<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>' + momChip(t.mom) + '</span></span>' +
      '<span class="tprice"><span class="pf">from</span><span class="pv">' + money(fromPrice(t)) + "</span></span></button>";
  }
  function renderFeed() {
    var list = TRACKS.slice();
    if (feedFilter === "fire") list = list.filter(function (t) { return t.mom >= 3; });
    else if (feedFilter === "cold") list = list.filter(function (t) { return t.mom <= 1; });
    else if (feedFilter === "value") list.sort(function (a, b) { return fromPrice(a) - fromPrice(b); });
    var feed = $("#feed");
    feed.innerHTML = list.length ? list.map(trackCardHTML).join("") : '<div class="empty">No tracks match.</div>';
    wireOpeners(feed);
  }
  $("#discoverChips").addEventListener("click", function (e) {
    var b = e.target.closest("[data-scopefilter]"); if (!b) return;
    feedFilter = b.getAttribute("data-scopefilter");
    var chips = this.querySelectorAll(".fchip");
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle("active", chips[i] === b);
    renderFeed();
  });
  function wireOpeners(root) {
    var cards = root.querySelectorAll("[data-open]");
    for (var i = 0; i < cards.length; i++) {
      (function (c) { c.addEventListener("click", function () { openTrack(c.getAttribute("data-open")); }); })(cards[i]);
    }
  }

  /* ——————————————————————— TRACK DETAIL + LICENSE BUILDER ——————————————————————— */
  var sel = { scope: "org", excl: false }; // current license selection
  function openTrack(id) {
    var t = track(id);
    sel = { scope: "org", excl: false };
    go("track", function () { drawTrack(t); });
  }
  function drawTrack(t) {
    var m = MOM[t.mom];
    var body = $("#trackBody");
    body.innerHTML =
      '<div class="hero-art" style="background:' + t.art + '">' +
        '<div class="ha-play">▶</div>' +
        '<div class="ha-meta"><div class="htt">' + t.title + '</div><div class="hta">' + t.artist + '</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">' +
        '<span class="vbadge"><span class="vdot"></span>Verified human</span>' + momChip(t.mom) +
        '<button class="ab-action" data-verify="' + t.id + '" style="margin-left:auto;color:var(--chain)">See proof ›</button>' +
      '</div>' +

      '<div class="acard" style="margin-top:14px">' +
        '<div class="eyebrow">Momentum score</div>' +
        '<div class="gauge" style="margin-top:10px"><div class="gtrack"><div class="gfill" style="width:0%"></div></div>' +
        '<div class="glab"><span>Cold</span><span>' + m.label + " · " + m.score + '/100</span><span>On fire</span></div></div>' +
        '<div class="kv"><span class="k">Tempo</span><span class="v">' + t.bpm + ' BPM · ' + t.key + '</span></div>' +
        '<div class="kv"><span class="k">Clearance</span><span class="v">worldwide · perpetual · non-exclusive*</span></div>' +
      '</div>' +

      '<div class="acard" style="margin-top:12px">' +
        '<div class="eyebrow">Build your license</div>' +
        '<div class="seg" id="segScope" style="margin-top:12px">' +
          SCOPES.map(function (s) {
            return '<label class="seg-opt' + (s.id === sel.scope ? " sel" : "") + '" data-scope="' + s.id + '">' +
              '<span class="so-l">' + s.name + '<small>' + s.sub + '</small></span>' +
              '<span class="so-m">×' + s.mult.toFixed(1) + '</span></label>';
          }).join("") +
        '</div>' +
        (t.excl ?
          '<hr class="divline"><label class="trow-toggle' + (sel.excl ? " on" : "") + '" id="exclToggle">' +
            '<span class="tt-copy">Make it exclusive<small>forecloses every future sale — priced highest when hot</small></span>' +
            '<span class="sw"><span class="swk"></span></span></label>'
          : "") +
      '</div>' +

      '<div class="quote" id="quoteBox" style="margin-top:12px"></div>' +
      '<button class="pbtn" id="licenseBtn" style="margin-top:14px">License this track →</button>' +
      '<p class="note-line" style="text-align:center;margin-top:12px">Artist keeps 100%. The 20% is the only add-on, shown above.</p>';

    // animate gauge
    setTimeout(function () { var f = body.querySelector(".gfill"); if (f) f.style.width = m.score + "%"; }, 60);

    // wire scope
    body.querySelector("#segScope").addEventListener("click", function (e) {
      var o = e.target.closest("[data-scope]"); if (!o) return;
      sel.scope = o.getAttribute("data-scope");
      var opts = this.querySelectorAll(".seg-opt");
      for (var i = 0; i < opts.length; i++) opts[i].classList.toggle("sel", opts[i] === o);
      drawQuote(t);
    });
    var ex = body.querySelector("#exclToggle");
    if (ex) ex.addEventListener("click", function () { sel.excl = !sel.excl; this.classList.toggle("on", sel.excl); drawQuote(t); });
    body.querySelector("[data-verify]").addEventListener("click", function () { openReport(t); });
    body.querySelector("#licenseBtn").addEventListener("click", function () { openCheckout(t); });
    drawQuote(t);
  }
  function drawQuote(t) {
    var p = price(t.base, sel.scope, t.mom, sel.excl);
    var proj = projected(t.base, sel.scope, t.mom, sel.excl);
    var projHTML = t.mom === 0
      ? 'Cold track — the price sits at the scope floor. As momentum rises, so does the suggested price. <b>License before it heats up.</b>'
      : 'Same license is projected at <b>' + money(proj) + '</b> in ~30 days. Licensing now is the early-access discount.';
    $("#quoteBox").innerHTML =
      '<div class="qrow artist"><span class="qk">Artist receives <span class="faint">(keeps 100%)</span></span><span class="qv">' + money(p.artist) + '</span></div>' +
      '<div class="qrow"><span class="qk">HRMNY fee <span class="faint">(20%, buyer-side)</span></span><span class="qv">' + money(p.fee) + '</span></div>' +
      '<div class="qrow total"><span class="qk">You pay</span><span class="qv">' + money(p.buyer) + '</span></div>' +
      '<div class="qproj">' + projHTML + '</div>';
  }

  /* ——————————————————————— CHECKOUT ——————————————————————— */
  function openCheckout(t) {
    go("checkout", function () { drawCheckout(t); });
  }
  function drawCheckout(t) {
    var p = price(t.base, sel.scope, t.mom, sel.excl);
    var sc = SCOPES.filter(function (s) { return s.id === sel.scope; })[0];
    $("#checkoutBody").innerHTML =
      '<div class="acard" style="display:flex;gap:13px;align-items:center">' +
        '<span class="tart" style="width:52px;height:52px;background:' + t.art + '"></span>' +
        '<div><div style="font-family:var(--display);font-weight:700;font-size:17px">' + t.title + '</div>' +
        '<div class="s-sub" style="margin-top:1px">' + t.artist + '</div></div></div>' +
      '<div class="acard" style="margin-top:12px;padding:6px 18px">' +
        '<div class="line"><span class="lk">License scope<small>' + sc.name + (sel.excl ? ' · exclusive' : '') + '</small></span><span class="lv">×' + (sc.mult * (sel.excl ? MOM[t.mom].excl : 1)).toFixed(2) + '</span></div>' +
        '<div class="line"><span class="lk">Artist price<small>paid through in full</small></span><span class="lv">' + money(p.artist) + '</span></div>' +
        '<div class="line"><span class="lk">HRMNY fee<small>20% · buyer-side</small></span><span class="lv">' + money(p.fee) + '</span></div>' +
        '<div class="line tot"><span class="lk">Total due</span><span class="lv">' + money(p.buyer) + '</span></div>' +
      '</div>' +
      '<div class="eyebrow" style="margin-top:18px">Payment</div>' +
      '<div class="paychip" style="margin-top:10px"><span class="pc-ic"></span><div class="pc-t">Visa •••• 4242<small>Processed by Stripe</small></div><span style="margin-left:auto;color:var(--good)">✓</span></div>' +
      '<button class="pbtn" id="payBtn" style="margin-top:16px">Pay ' + money(p.buyer) + '</button>' +
      '<p class="note-line" style="text-align:center;margin-top:12px">No wallet, no tokens. Feels like any checkout — the provenance record is anchored behind the scenes.</p>';

    $("#payBtn").addEventListener("click", function () {
      var btn = this; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Processing…';
      setTimeout(function () { openReceipt(t, p); }, 1100);
    });
  }

  /* ——————————————————————— RECEIPT ——————————————————————— */
  function openReceipt(t, p) {
    go("receipt", function () { drawReceipt(t, p); });
  }
  function drawReceipt(t, p) {
    var sc = SCOPES.filter(function (s) { return s.id === sel.scope; })[0];
    var tx = "0x" + hex(4) + "…" + hex(4), ar = hex(3) + "…" + hex(3);
    $("#receiptBody").innerHTML =
      '<div style="text-align:center;padding:6px 0 2px"><div class="success-ring">✓</div>' +
        '<div class="s-title" style="text-align:center">License confirmed</div>' +
        '<p class="s-sub" style="text-align:center;max-width:30ch;margin:8px auto 0">' + t.title + ' is cleared for ' + sc.name + (sel.excl ? ', exclusive' : '') + '. Receipt emailed.</p></div>' +
      '<div class="acard" style="margin-top:14px;padding:6px 18px">' +
        '<div class="kv"><span class="k">Track</span><span class="v">' + t.title + ' · ' + t.artist + '</span></div>' +
        '<div class="kv"><span class="k">Cleared for</span><span class="v">' + sc.name + (sel.excl ? ' · exclusive' : ' · non-exclusive') + '</span></div>' +
        '<div class="kv"><span class="k">Term</span><span class="v">worldwide · perpetual</span></div>' +
        '<div class="kv"><span class="k">Paid</span><span class="v">' + money(p.buyer) + '</span></div>' +
      '</div>' +
      '<div class="anchor-box" style="margin-top:12px">' +
        '<div class="ab-h">⛓ Anchored · tamper-proof registry</div>' +
        '<div class="hashrow"><span class="hk">base:tx</span><span>' + tx + '</span></div>' +
        '<div class="hashrow"><span class="hk">arweave</span><span>' + ar + '</span></div>' +
        '<div class="hashrow"><span class="hk">status</span><span style="color:var(--good)">contract pinned · permanent</span></div>' +
      '</div>' +
      '<button class="pbtn ghost" id="rcVerify" style="margin-top:14px">Verify this license ›</button>' +
      '<button class="pbtn ghost sm" id="rcPdf" style="margin-top:10px">Download receipt (PDF)</button>' +
      '<button class="pbtn" id="rcDone" style="margin-top:10px">Back to Discover</button>';
    $("#rcVerify").addEventListener("click", function () { openReport(t); });
    $("#rcPdf").addEventListener("click", function () { toast("📄 Receipt downloaded"); });
    $("#rcDone").addEventListener("click", function () { goTab("discover", renderFeed); });
  }

  /* ——————————————————————— STUDIO ——————————————————————— */
  function renderStudio() {
    var mine = TRACKS.filter(function (t) { return t.mine; });
    var totalEarned = mine.reduce(function (a, t) { return a + (t.earned || 0); }, 0);
    var totalLic = mine.reduce(function (a, t) { return a + (t.licenses || 0); }, 0);
    $("#earnAmt").textContent = totalEarned.toLocaleString("en-US");
    $("#statTracks").textContent = mine.length;
    $("#statLicenses").textContent = totalLic;
    var sf = $("#studioFeed");
    sf.innerHTML = mine.map(function (t) {
      return '<button class="tcard" data-manage="' + t.id + '">' +
        '<span class="tart" style="width:60px;height:60px;background:' + t.art + '"></span>' +
        '<span class="tmeta"><span class="tt">' + t.title + '</span>' +
        '<span class="ta">' + (t.licenses || 0) + ' licenses · ' + money(t.earned || 0) + ' earned</span>' +
        '<span class="trow"><span class="vbadge"><span class="vdot"></span>Human</span>' + momChip(t.mom) + '</span></span>' +
        '<span class="tprice"><span class="pf">status</span><span class="pv" style="font-size:13px;color:var(--good)">LIVE</span></span></button>';
    }).join("");
    var btns = sf.querySelectorAll("[data-manage]");
    for (var i = 0; i < btns.length; i++) (function (b) { b.addEventListener("click", function () { openManage(b.getAttribute("data-manage")); }); })(btns[i]);
  }
  $("#goUpload").addEventListener("click", function () { startUpload(); });

  /* ——————————————————————— MANAGE TRACK ——————————————————————— */
  function openManage(id) {
    var t = track(id);
    go("manage", function () {
      var m = MOM[t.mom];
      $("#manageBody").innerHTML =
        '<div class="hero-art" style="background:' + t.art + '"><div class="ha-meta"><div class="htt">' + t.title + '</div><div class="hta">Your track</div></div></div>' +
        '<div class="minigrid" style="margin-top:14px">' +
          '<div class="mstat"><div class="mn">' + money(t.earned || 0) + '</div><div class="ml">earned · you kept 100%</div></div>' +
          '<div class="mstat"><div class="mn">' + (t.licenses || 0) + '</div><div class="ml">licenses sold</div></div>' +
        '</div>' +
        '<div class="acard" style="margin-top:12px">' +
          '<div class="eyebrow">Momentum · drives your suggested price</div>' +
          '<div class="gauge" style="margin-top:10px"><div class="gtrack"><div class="gfill" style="width:' + m.score + '%"></div></div>' +
          '<div class="glab"><span>Cold</span><span>' + m.label + " · " + m.score + '/100</span><span>On fire</span></div></div>' +
          '<p class="s-sub" style="margin-top:10px">At current momentum, a Paid Social license suggests <b style="color:var(--human)">' + money(price(t.base, "paid", t.mom, false).artist) + '</b> to you. HRMNY suggests; you decide.</p>' +
        '</div>' +
        '<div class="eyebrow" style="margin-top:18px">Recent licenses</div>' +
        '<div class="acard" style="margin-top:10px;padding:6px 16px">' +
          '<div class="txn"><span class="tx-ic">↓</span><div class="tx-t">Paid Social<small>Lumen Studios · 3d ago</small></div><span class="tx-v in">+' + money(price(t.base, "paid", t.mom, false).artist) + '</span></div>' +
          '<div class="txn"><span class="tx-ic">↓</span><div class="tx-t">Organic<small>@veracreates · 1w ago</small></div><span class="tx-v in">+' + money(price(t.base, "org", t.mom, false).artist) + '</span></div>' +
        '</div>' +
        '<button class="pbtn ghost" id="mgVerify" style="margin-top:14px">View provenance ›</button>';
      $("#mgVerify").addEventListener("click", function () { openReport(t); });
    });
  }

  /* ——————————————————————— UPLOAD FLOW ——————————————————————— */
  var up = { step: 0, file: null, signed: false, base: 120, scopes: { org: true, paid: true, broad: true }, excl: true };
  function setSteps(n) {
    var bars = $("#upSteps").children;
    for (var i = 0; i < bars.length; i++) {
      bars[i].className = "stp" + (i < n ? " done" : i === n ? " cur" : "");
    }
  }
  function startUpload() {
    up = { step: 0, file: null, signed: false, base: 120, scopes: { org: true, paid: true, broad: true }, excl: true };
    go("upload", function () { drawUpload(); });
  }
  function drawUpload() {
    setSteps(up.step);
    var b = $("#uploadBody");

    if (up.step === 0) { // choose file
      b.innerHTML =
        '<div class="eyebrow">Step 1 · File</div><div class="s-title" style="font-size:23px">Add your track</div>' +
        '<div class="dropzone" id="dz" style="margin-top:16px"><div class="dz-ic">⤓</div>' +
          '<div class="dz-t">Drop an audio file</div><div class="dz-s">WAV / FLAC / MP3 · up to 100 MB</div></div>' +
        '<p class="note-line" style="margin-top:14px">Humans only. Every upload is fingerprinted and scanned — AI-generated tracks are rejected.</p>';
      $("#dz").addEventListener("click", function () {
        up.file = "midnight_drive_master.wav"; up.step = 1; drawUpload();
      });

    } else if (up.step === 1) { // verify / scan
      b.innerHTML =
        '<div class="eyebrow">Step 2 · Verify</div><div class="s-title" style="font-size:23px">Checking it’s real</div>' +
        '<p class="s-sub">' + up.file + '</p>' +
        '<div class="acard" style="margin-top:14px;padding:6px 18px" id="scanList">' +
          scanLine("fp", "AudD acoustic fingerprint", "no match — original") +
          scanLine("c2", "C2PA Content Credentials", "written to file") +
          scanLine("ai", "AI-generation scan", "0% synthetic") +
          scanLine("fmt", "Format &amp; loudness", "WAV · −14 LUFS") +
        '</div>' +
        '<button class="pbtn" id="upNext" style="margin-top:16px" disabled>Analyzing…</button>';
      runScanList(function () {
        var btn = $("#upNext"); btn.disabled = false; btn.textContent = "Looks human — continue →";
        btn.addEventListener("click", function () { up.step = 2; drawUpload(); });
      });

    } else if (up.step === 2) { // attest
      b.innerHTML =
        '<div class="eyebrow">Step 3 · Attest</div><div class="s-title" style="font-size:23px">Sign the attestation</div>' +
        '<p class="s-sub">This is the claim with teeth — a signed, on-record statement that the work is human-made. Misrepresentation voids your account.</p>' +
        '<div class="attest" id="attestCard" style="margin-top:16px">' +
          '<div style="font-size:14px;line-height:1.6">“I, <b>Mara Vance</b>, made <b>Midnight Drive</b> as a human work. No part was generated by AI. I authorize HRMNY to license it on my behalf under the terms I set.”</div>' +
          '<div class="at-sig" id="atSig">— awaiting signature —</div>' +
        '</div>' +
        '<button class="pbtn" id="signBtn" style="margin-top:16px">Sign as Mara Vance</button>';
      $("#signBtn").addEventListener("click", function () {
        if (up.signed) { up.step = 3; drawUpload(); return; }
        up.signed = true;
        $("#attestCard").classList.add("signed");
        $("#atSig").innerHTML = "✓ Signed · " + new Date().toLocaleDateString() + " · sig 0x" + hex(6);
        var btn = this; btn.textContent = "Set your terms →";
        setTimeout(function () { up.step = 3; drawUpload(); }, 700);
      });

    } else { // price / publish
      b.innerHTML =
        '<div class="eyebrow">Step 4 · Price</div><div class="s-title" style="font-size:23px">Set your terms</div>' +
        '<p class="s-sub">You set the base. HRMNY only ever raises the <i>suggested</i> price as momentum builds — never lowers it, never takes a cut from you.</p>' +
        '<div class="acard" style="margin-top:14px">' +
          '<div class="field" style="margin:0"><label>Your base price (Organic)</label>' +
            '<input type="number" id="upBase" value="' + up.base + '" min="20" step="10"></div>' +
          '<hr class="divline"><div class="eyebrow" style="margin-bottom:8px">Offer these scopes</div>' +
          scopeCheck("org", "Organic / Creator", "×1.0") +
          scopeCheck("paid", "Paid Social", "×2.2") +
          scopeCheck("broad", "Broad Campaign", "×4.5") +
          '<hr class="divline"><label class="trow-toggle' + (up.excl ? " on" : "") + '" id="upExcl">' +
            '<span class="tt-copy">Allow exclusive buyouts<small>priced highest when the track is hot</small></span>' +
            '<span class="sw"><span class="swk"></span></span></label>' +
        '</div>' +
        '<div class="quote" id="upPreview" style="margin-top:12px"></div>' +
        '<button class="pbtn" id="publishBtn" style="margin-top:16px">Publish to catalog →</button>';
      var redraw = function () {
        var b0 = price(up.base, "org", 0, false).buyer;
        $("#upPreview").innerHTML =
          '<div class="qrow"><span class="qk">Buyer-facing “from” price</span><span class="qv" style="color:var(--human)">' + money(b0) + '</span></div>' +
          '<div class="qproj">New tracks start <b>Cold</b>. As creators pick it up, your suggested price climbs — a Paid Social license would suggest <b>' + money(price(up.base, "paid", 2, false).artist) + '</b> to you at Warm.</div>';
      };
      $("#upBase").addEventListener("input", function () { up.base = parseInt(this.value, 10) || 0; redraw(); });
      b.querySelectorAll("[data-scopechk]").forEach(function (row) {
        row.addEventListener("click", function () {
          var id = row.getAttribute("data-scopechk"); up.scopes[id] = !up.scopes[id];
          row.classList.toggle("on", up.scopes[id]);
        });
      });
      $("#upExcl").addEventListener("click", function () { up.excl = !up.excl; this.classList.toggle("on", up.excl); });
      $("#publishBtn").addEventListener("click", publishTrack);
      redraw();
    }
  }
  function scanLine(id, title, val) {
    return '<div class="scan-line" data-scan="' + id + '"><span class="sl-ic"><span class="spinner"></span></span>' +
      '<span class="sl-t">' + title + '</span><span class="sl-v" data-scanv>scanning…</span></div>';
  }
  function runScanList(done) {
    var lines = $("#scanList").querySelectorAll(".scan-line");
    var vals = ["no match — original", "written to file", "0% synthetic", "WAV · −14 LUFS"];
    var i = 0;
    (function next() {
      if (i >= lines.length) { if (done) done(); return; }
      var ln = lines[i];
      setTimeout(function () {
        ln.classList.add("show", "ok");
        ln.querySelector(".sl-ic").innerHTML = "✓";
        ln.querySelector("[data-scanv]").textContent = vals[i];
        i++; next();
      }, 620);
    })();
  }
  function scopeCheck(id, name, mult) {
    return '<div class="checkrow ' + (up.scopes[id] ? "on" : "") + '" data-scopechk="' + id + '">' +
      '<span class="cbx">✓</span><span class="cl">' + name + '<small>licenses at ' + mult + ' of base</small></span></div>';
  }
  function publishTrack() {
    var btn = $("#publishBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Publishing…';
    setTimeout(function () {
      // prepend the new track to the catalog as a live, cold, mine track
      if (!track("midnight-new")) {
        TRACKS.unshift({ id: "midnight-new", title: "Midnight Drive", artist: "Mara Vance", base: up.base, mom: 0,
          art: ART.violet, excl: up.excl, mine: true, bpm: 112, key: "F♯ min", licenses: 0, earned: 0 });
      }
      go("receipt", function () { drawPublished(); });
    }, 1100);
  }
  function drawPublished() {
    var tx = "0x" + hex(4) + "…" + hex(4);
    $("#receiptBody").innerHTML =
      '<div style="text-align:center;padding:6px 0 2px"><div class="success-ring">✓</div>' +
        '<div class="s-title" style="text-align:center">You’re live</div>' +
        '<p class="s-sub" style="text-align:center;max-width:30ch;margin:8px auto 0">“Midnight Drive” is verified, attested, and listed at ' + money(price(up.base, "org", 0, false).buyer) + ' from.</p></div>' +
      '<div class="acard" style="margin-top:14px;padding:6px 18px">' +
        '<div class="kv"><span class="k">Verification</span><span class="v" style="color:var(--good)">human · 100%</span></div>' +
        '<div class="kv"><span class="k">Attestation</span><span class="v" style="color:var(--good)">signed</span></div>' +
        '<div class="kv"><span class="k">Registry</span><span class="v">base:tx ' + tx + '</span></div>' +
      '</div>' +
      '<button class="pbtn" id="pubView" style="margin-top:16px">View in catalog</button>' +
      '<button class="pbtn ghost" id="pubStudio" style="margin-top:10px">Back to Studio</button>';
    $("#pubView").addEventListener("click", function () { goTab("discover", renderFeed); });
    $("#pubStudio").addEventListener("click", function () { goTab("studio", renderStudio); });
  }

  /* ——————————————————————— VERIFY ——————————————————————— */
  $("#runScan").addEventListener("click", function () {
    var beam = $("#scanBeam"); beam.style.display = "block";
    var btn = this; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Scanning…';
    setTimeout(function () { beam.style.display = "none"; btn.disabled = false; btn.innerHTML = "Run verification"; openReport(track("midnight")); }, 1500);
  });

  function openReport(t) {
    go("report", function () { drawReport(t); });
  }
  function drawReport(t) {
    var tx = "0x" + hex(4) + "…" + hex(4), ar = hex(3) + "…" + hex(3);
    $("#reportBody").innerHTML =
      '<div class="report-head"><div class="rh-score">100<span style="font-size:24px">%</span></div><div class="rh-lab">Human · verified</div></div>' +
      '<div class="acard" style="margin:14px 0 0;display:flex;gap:12px;align-items:center">' +
        '<span class="tart" style="width:46px;height:46px;background:' + t.art + '"></span>' +
        '<div><div style="font-family:var(--display);font-weight:700;font-size:16px">' + t.title + '</div><div class="s-sub" style="margin-top:1px">' + t.artist + '</div></div></div>' +
      '<div class="acard" style="margin-top:12px;padding:6px 18px">' +
        proofLine("AudD acoustic fingerprint", "original — no prior match") +
        proofLine("C2PA Content Credentials", "intact · unbroken chain") +
        proofLine("Human-made attestation", "signed by " + t.artist) +
        proofLine("AI-generation scan", "0% synthetic") +
        proofLine("Hard AI ban", "humans-only catalog") +
      '</div>' +
      '<div class="anchor-box" style="margin-top:12px">' +
        '<div class="ab-h">⛓ On-chain registry · ownership &amp; clearance</div>' +
        '<div class="hashrow"><span class="hk">base:tx</span><span>' + tx + '</span></div>' +
        '<div class="hashrow"><span class="hk">arweave</span><span>' + ar + '</span></div>' +
        '<div class="hashrow"><span class="hk">contract</span><span style="color:var(--good)">pinned · permanent</span></div>' +
      '</div>' +
      '<p class="note-line" style="margin-top:14px">The license stays off-chain and legal; the chain is only a tamper-proof anchor. Provable, not just printable.</p>' +
      '<button class="pbtn ghost" id="rpDone" style="margin-top:14px">Done</button>';
    $("#rpDone").addEventListener("click", back);
  }
  function proofLine(title, val) {
    return '<div class="scan-line show ok" style="opacity:1"><span class="sl-ic">✓</span>' +
      '<span class="sl-t">' + title + '</span><span class="sl-v">' + val + '</span></div>';
  }

  /* ——————————————————————— misc wiring ——————————————————————— */
  $("#payoutBtn").addEventListener("click", function () { toast("💸 $612 on its way to •••• 4471"); });

  // boot
  paint();
})();
