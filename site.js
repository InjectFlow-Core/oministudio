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
