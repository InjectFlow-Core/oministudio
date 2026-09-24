// Behaviour shared by every page. Each block checks that its markup exists,
// so a page without that part is left alone.

// Sample videos for the home page's "Made with Omini Studio" section. The
// section and its nav link stay hidden until this list has an entry. To add
// one, put the files next to this script and add a line such as:
//   { title: "Why the Moon has phases", topic: "Astronomy",
//     note: "Made from a 2-minute voice note", length: "2:04",
//     src: "/samples/moon-phases.mp4", poster: "/samples/moon-phases.jpg" },
var SAMPLES = [];

// Light / dark switch. The choice is remembered in the browser; the inline
// script in each page's head applies it before first paint.
(function () {
  var toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.getAttribute("data-theme")
      ? root.getAttribute("data-theme") === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    var next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
})();

// Phone menu.
(function () {
  var button = document.querySelector(".menu-toggle");
  var bar = document.querySelector(".topbar");
  if (!button || !bar) return;
  button.addEventListener("click", function () {
    var open = bar.classList.toggle("nav-open");
    button.setAttribute("aria-expanded", open ? "true" : "false");
  });
  bar.querySelectorAll(".links a").forEach(function (link) {
    link.addEventListener("click", function () {
      bar.classList.remove("nav-open");
      button.setAttribute("aria-expanded", "false");
    });
  });
})();

// Home: the narration timeline. A playhead sweeps across the waveform on a
// loop, lighting the bars it has passed and the beat whose scene is on
// screen. Clicking a beat jumps there. It is an illustration, not a player.
(function () {
  var track = document.querySelector(".track");
  if (!track) return;
  var wave = track.querySelector(".wave");
  var head = track.querySelector(".playhead");
  var beats = Array.prototype.slice.call(track.querySelectorAll(".beat"));
  var starts = beats.map(function (b) { return parseFloat(b.getAttribute("data-start")) || 0; });
  var LOOP = 12000;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bars = [];
  var progress = still ? 1 : 0;
  var last = null;
  var visible = true;

  function height(i) {
    return 8 + Math.round(Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.113) + Math.sin(i * 1.7) * 0.25) * 34);
  }
  function build() {
    var count = Math.max(1, Math.floor((wave.clientWidth + 3) / 7));
    if (count === bars.length) return;
    wave.textContent = "";
    bars = [];
    for (var i = 0; i < count; i++) {
      var bar = document.createElement("span");
      bar.style.height = height(i) + "px";
      wave.appendChild(bar);
      bars.push(bar);
    }
  }
  function paint() {
    var lit = Math.round(progress * bars.length);
    for (var i = 0; i < bars.length; i++) bars[i].classList.toggle("lit", i < lit);
    if (head) head.style.left = (progress * 100) + "%";
    var current = 0;
    for (var j = 0; j < starts.length; j++) if (progress >= starts[j]) current = j;
    beats.forEach(function (b, k) { b.classList.toggle("active", k === current); });
  }
  function tick(now) {
    if (last !== null && visible) progress = (progress + (now - last) / LOOP) % 1;
    last = now;
    paint();
    window.requestAnimationFrame(tick);
  }

  beats.forEach(function (beat, k) {
    beat.addEventListener("click", function () {
      progress = starts[k];
      paint();
    });
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }).observe(track);
  }
  window.addEventListener("resize", function () { build(); paint(); });
  build();
  paint();
  if (!still) window.requestAnimationFrame(tick);
})();

// Home: sample videos.
(function () {
  var section = document.getElementById("examples");
  var grid = document.querySelector(".samples");
  if (!SAMPLES.length) return;
  document.querySelectorAll("[data-examples-link]").forEach(function (link) {
    link.hidden = false;
  });
  if (!section || !grid) return;
  SAMPLES.forEach(function (sample) {
    var card = document.createElement("article");
    card.className = "sample";
    var video = document.createElement("video");
    video.controls = true;
    video.preload = "none";
    video.src = sample.src;
    if (sample.poster) video.poster = sample.poster;
    card.appendChild(video);
    [["span", "topic", sample.topic], ["h3", "", sample.title], ["p", "", [sample.note, sample.length].filter(Boolean).join(" · ")]]
      .forEach(function (part) {
        if (!part[2]) return;
        var el = document.createElement(part[0]);
        if (part[1]) el.className = part[1];
        el.textContent = part[2];
        card.appendChild(el);
      });
    grid.appendChild(card);
  });
  section.hidden = false;
})();

// Pricing: swap every monthly figure for its yearly one. Each element
// carries both, so nothing here has to know what a tier costs.
(function () {
  var toggle = document.querySelector(".period-toggle");
  if (!toggle) return;
  var figures = document.querySelectorAll("[data-month][data-year]");
  toggle.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-period]");
    if (!button) return;
    var period = button.getAttribute("data-period");
    toggle.querySelectorAll("button").forEach(function (other) {
      var selected = other === button;
      other.classList.toggle("is-selected", selected);
      other.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    figures.forEach(function (figure) {
      figure.textContent = figure.getAttribute("data-" + period);
    });
  });
})();
