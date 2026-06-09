/* HRMNY app — Discover search (progressive enhancement only).
   The app itself is pure CSS and works with scripts blocked; the category chips
   are the no-JS filter. This adds free-text search on top: type a phrase and the
   feed narrows by track, artist, or musical key. It only ever toggles a
   .search-hide class, so it composes with the CSS chip filter (a card shows only
   when it passes both). No-op if the search box isn't present. */
(function () {
  "use strict";
  var input = document.querySelector("[data-search-input]");
  if (!input) return;
  var feed = document.querySelector("[data-feed]");
  var clear = document.querySelector("[data-search-clear]");
  var noRes = document.querySelector("[data-no-results]");
  var cards = feed ? feed.querySelectorAll(".tcard[data-search]") : [];

  function apply() {
    var q = input.value.trim().toLowerCase();
    if (clear) clear.hidden = q.length === 0;
    cards.forEach(function (c) {
      var hit = !q || c.getAttribute("data-search").indexOf(q) !== -1;
      c.classList.toggle("search-hide", !hit);
    });
    if (noRes) {
      // visible = not search-hidden AND not chip-hidden (offsetParent null when display:none)
      var anyVisible = false;
      cards.forEach(function (c) { if (!c.classList.contains("search-hide") && c.offsetParent !== null) anyVisible = true; });
      noRes.hidden = anyVisible || q.length === 0 ? anyVisible : false;
      // simpler: show no-results only when a query is present and nothing shows
      noRes.hidden = !(q.length > 0 && !anyVisible);
    }
  }
  input.addEventListener("input", apply);
  if (clear) clear.addEventListener("click", function () { input.value = ""; input.focus(); apply(); });
  apply();
})();
