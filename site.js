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

// Home: the narration timeline. A playhead sweeps across the waveform as the
// hero video plays, lighting the bars it has passed and the beat whose line
// is on screen. Clicking a beat seeks the video there.
(function () {
  var track = document.querySelector(".track");
  if (!track) return;
  var video = track.closest("figure") && track.closest("figure").querySelector("video");
  if (!video) return;
  var wave = track.querySelector(".wave");
  var head = track.querySelector(".playhead");
  var beats = Array.prototype.slice.call(track.querySelectorAll(".beat"));
  var starts = beats.map(function (b) { return parseFloat(b.getAttribute("data-start")) || 0; });
  var bars = [];
  var raf = null;

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
    var progress = video.duration ? video.currentTime / video.duration : 0;
    var lit = Math.round(progress * bars.length);
    for (var i = 0; i < bars.length; i++) bars[i].classList.toggle("lit", i < lit);
    if (head) head.style.left = (progress * 100) + "%";
    var current = 0;
    for (var j = 0; j < starts.length; j++) if (video.currentTime >= starts[j]) current = j;
    beats.forEach(function (b, k) {
      var shown = k === current || k === current - 1;
      b.classList.toggle("active", k === current);
      b.classList.toggle("prev", k === current - 1);
      b.parentElement.classList.toggle("shown", shown);
    });
  }
  function loop() {
    paint();
    if (!video.paused && !video.ended) raf = window.requestAnimationFrame(loop);
  }
  function play() {
    if (raf === null) raf = window.requestAnimationFrame(loop);
  }
  function stop() {
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null;
    paint();
  }

  beats.forEach(function (beat, k) {
    beat.addEventListener("click", function () {
      video.currentTime = starts[k];
      paint();
    });
  });
  video.addEventListener("play", play);
  video.addEventListener("pause", stop);
  video.addEventListener("ended", stop);
  video.addEventListener("seeked", paint);
  video.addEventListener("loadedmetadata", paint);
  window.addEventListener("resize", function () { build(); paint(); });
  build();
  paint();
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

// Fade-up reveal for step and value cards as they scroll into view.
(function () {
  var items = document.querySelectorAll(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .2, rootMargin: "0px 0px -10% 0px" });
  // Wait a frame so the browser paints the hidden state first — otherwise
  // anything already in view on load jumps straight to visible with no
  // animation to see.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      items.forEach(function (el) { observer.observe(el); });
    });
  });
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
