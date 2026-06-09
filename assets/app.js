/* HRMNY — interactions for both pages. Everything is progressive: if a widget
   isn't on the page, its block simply no-ops. */

/* ——— Reveal on scroll ——— */
(function () {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach((e) => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    },
    { threshold: 0.16 }
  );
  els.forEach((e) => io.observe(e));
})();

/* ——— Value migration (Through-Line §00): tap to move value ——— */
(function () {
  const mig = document.querySelector("[data-valmig]");
  if (!mig) return;
  const toggle = () => mig.classList.toggle("on");
  mig.addEventListener("click", toggle);
  mig.setAttribute("tabindex", "0");
  mig.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
})();

/* ——— Claim vs Proof flip ——— */
(function () {
  const flip = document.querySelector("[data-flip]");
  if (!flip) return;
  flip.addEventListener("click", () => flip.classList.toggle("flipped"));
})();

/* ——— Two views switch (Through-Line §II) ——— */
(function () {
  const toggle = document.querySelector("[data-viewtoggle]");
  if (!toggle) return;
  const see = document.querySelector("[data-view='see']");
  const under = document.querySelector("[data-view='under']");
  const labSee = document.querySelector("[data-vlab='see']");
  const labUnder = document.querySelector("[data-vlab='under']");
  function apply(on) {
    toggle.classList.toggle("on", on);
    see.classList.toggle("hidden", on);
    under.classList.toggle("hidden", !on);
    labSee.classList.toggle("active", !on);
    labUnder.classList.toggle("active", on);
  }
  let on = false;
  toggle.addEventListener("click", () => { on = !on; apply(on); });
  apply(false);
})();

/* ——— Pricing calculator (Through-Line §III) ——— */
(function () {
  const root = document.querySelector("[data-calc]");
  if (!root) return;

  const BASE = 120;
  let scope = 1.0;
  let momentum = 0;
  let exclusive = false;

  const scopeOpts = root.querySelectorAll(".scope-opt");
  const slider = root.querySelector("[data-momentum]");
  const momVal = root.querySelector("[data-momval]");
  const momBadge = root.querySelector("[data-mombadge]");
  const exclToggle = root.querySelector("[data-excl]");

  const outArtist = root.querySelector("[data-out='artist']");
  const outFee = root.querySelector("[data-out='fee']");
  const outBuyer = root.querySelector("[data-out='buyer']");
  const outProj = root.querySelector("[data-out='proj']");

  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");

  function momentumLabel(m) {
    if (m <= 15) return "COLD";
    if (m <= 35) return "COOL";
    if (m <= 60) return "WARM";
    if (m <= 82) return "HOT";
    return "ON FIRE";
  }

  function recompute() {
    // momentum raises the *suggested* artist price only
    const momFactor = 1 + (momentum / 100) * 0.6;        // 1.0 → 1.6
    const exclFactor = exclusive ? 1.5 + (momentum / 100) * 1.5 : 1; // hotter = pricier exclusivity
    const artist = BASE * scope * momFactor * exclFactor;
    const fee = artist * 0.20;          // transparent 20% buyer-side add-on
    const buyer = artist + fee;

    // 30-day projection grows with current momentum trend
    const projTrend = (momentum / 100) * 0.30;
    const projected = buyer * (1 + projTrend);

    outArtist.textContent = fmt(artist);
    outFee.textContent = fmt(fee);
    outBuyer.textContent = fmt(buyer);

    if (projected > buyer + 1) {
      outProj.innerHTML =
        'At this momentum trend, the same license is projected at <b>' +
        fmt(projected) + '</b> in ~30 days. Licensing now is the early-access discount.';
    } else {
      outProj.innerHTML =
        'Cold track — suggested price sits at the scope floor. As momentum rises, so does the suggested price. <b>License before it heats up.</b>';
    }
  }

  scopeOpts.forEach((opt) => {
    opt.addEventListener("click", () => {
      scopeOpts.forEach((o) => o.classList.remove("sel"));
      opt.classList.add("sel");
      scope = parseFloat(opt.dataset.mult);
      recompute();
    });
  });

  slider.addEventListener("input", () => {
    momentum = parseInt(slider.value, 10);
    momVal.textContent = momentum + " / 100";
    momBadge.textContent = momentumLabel(momentum);
    recompute();
  });

  exclToggle.addEventListener("click", () => {
    exclusive = !exclusive;
    exclToggle.classList.toggle("on", exclusive);
    recompute();
  });

  recompute();
})();

/* ——— Interlock (Through-Line synthesis) ——— */
(function () {
  const locks = document.querySelectorAll("[data-lock]");
  if (!locks.length) return;
  const note = document.querySelector("[data-interlock-note]");
  const messages = {
    worth: "Without <b>verified human music</b>, there is no worth — and nothing the proof or the pricing is even about.",
    proof: "Without <b>invisible Web 2.5</b>, the worth is just a claim — checkable by no one, and the premium evaporates.",
    flow: "Without <b>value pricing</b>, artists stop supplying and brands stop buying — the catalog and the proof sit idle.",
  };
  locks.forEach((lock) => {
    lock.addEventListener("click", () => {
      const isActive = lock.classList.contains("active");
      locks.forEach((l) => { l.classList.remove("active"); l.classList.add("dim"); });
      if (isActive) {
        locks.forEach((l) => l.classList.remove("dim"));
        if (note) note.innerHTML = "Select the pillars to see how they hold each other up.";
      } else {
        lock.classList.add("active");
        lock.classList.remove("dim");
        if (note) note.innerHTML = messages[lock.dataset.lock] || "";
      }
    });
  });
})();

/* ——— Stat counters (Plan Brief) ——— */
(function () {
  const stats = document.querySelectorAll("[data-count]");
  if (!stats.length) return;
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const decimals = (el.dataset.decimals | 0);
    const dur = 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = (target * eased).toFixed(decimals);
      el.textContent = prefix + v + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    };
    requestAnimationFrame(step);
  };
  if (!("IntersectionObserver" in window)) { stats.forEach(animate); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.6 });
  stats.forEach((s) => io.observe(s));
})();

/* ——— Build table filter (Plan Brief) ——— */
(function () {
  const tabs = document.querySelectorAll("[data-ftab]");
  if (!tabs.length) return;
  const rows = document.querySelectorAll("[data-cat]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const f = tab.dataset.ftab;
      rows.forEach((r) => {
        const show = f === "all" || r.dataset.cat === f;
        r.classList.toggle("hide", !show);
      });
    });
  });
})();

/* ——— Phase stepper (Plan Brief) ——— */
(function () {
  const tabs = document.querySelectorAll("[data-ptab]");
  if (!tabs.length) return;
  const titleEl = document.querySelector("[data-phase-title]");
  const bodyEl = document.querySelector("[data-phase-body]");
  const data = {
    "0": ["Make payments work", "Set up Stripe Connect so artists get paid. Add secure file delivery. Check every upload is real and human. Design the record now so it's ready to anchor later. Nothing ships until this works end to end."],
    "1": ["Prove the payout promise", "Onboard a first cohort through managers. Prove artists actually get paid, reliably, and that clearance integrity holds under real licenses. Trust is earned with completed transactions, not promises."],
    "2": ["Press the opening", "Lean into the two open windows — TikTok's cleared-music shift and the human-vs-AI split. Scale payout-ready supply and brand demand while the timing advantage lasts."],
    "3": ["Anchor the record", "Flip the switch: anchor the now-stable license and provenance record on Base, store contracts on Arweave. Proof turns on once there's something worth proving — a rebuild avoided, not deferred."],
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const d = data[tab.dataset.ptab];
      if (d) { titleEl.textContent = d[0]; bodyEl.textContent = d[1]; }
    });
  });
})();

/* ——— Chain first vs last (Plan Brief) ——— */
(function () {
  const opts = document.querySelectorAll("[data-opt]");
  if (!opts.length) return;
  const verdict = document.querySelector("[data-verdict]");
  const msg = {
    first: "Engineering goes to the chain before the marketplace can transact. Perfect proof, no market — and the record locks early, so every product change hurts.",
    last: "<b>Chain last wins.</b> Build trust infrastructure when trust is the problem. Early on, the problem is getting started — not proving anything.",
  };
  opts.forEach((opt) => {
    opt.addEventListener("click", () => {
      opts.forEach((o) => { o.classList.remove("active"); o.classList.add("dim"); });
      opt.classList.add("active");
      opt.classList.remove("dim");
      if (verdict) verdict.innerHTML = msg[opt.dataset.opt] || "";
    });
  });
})();
