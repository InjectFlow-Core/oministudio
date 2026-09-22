// Light / dark switch, shared by every page. The choice is remembered in the
// browser; the inline script in each page applies it before first paint.
document.querySelector(".theme-toggle").addEventListener("click", function () {
  var root = document.documentElement;
  var dark = root.getAttribute("data-theme")
    ? root.getAttribute("data-theme") === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  var next = dark ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch (e) {}
});

// Pricing page: swap every monthly figure for its yearly one. Each element
// carries both, so nothing here has to know what a tier costs.
(function () {
  var toggle = document.querySelector(".period-toggle");
  if (!toggle) return;
  var figures = document.querySelectorAll("[data-month][data-year]");
  // The tier buttons carry the choice into the app, so they switch too.
  var links = document.querySelectorAll("[data-href-month][data-href-year]");
  toggle.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-period]");
    if (!button) return;
    var period = button.getAttribute("data-period");
    toggle.querySelectorAll("button").forEach(function (other) {
      other.classList.toggle("is-selected", other === button);
    });
    figures.forEach(function (figure) {
      figure.textContent = figure.getAttribute("data-" + period);
    });
    links.forEach(function (link) {
      link.setAttribute("href", link.getAttribute("data-href-" + period));
    });
  });
})();
