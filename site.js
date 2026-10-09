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

// A plan card's button goes straight to that plan's checkout in the app, for
// the billing period on screen. Signed-out visitors sign in first and are
// returned there; the app resolves the plan's name to its current version.
function setPlanLink(link, period) {
  var plan = link.getAttribute("data-plan");
  if (!plan || !/^[a-z0-9-]+$/.test(plan)) return;
  link.setAttribute("href", "https://app.oministudio.com/credits?plan=" + plan + "&period=" + (period === "year" ? "year" : "month"));
}

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
    document.querySelectorAll(".plan-cta").forEach(function (link) { setPlanLink(link, period); });
  });
})();

// Pricing: enhance the numbers above with live figures from the app, if it
// answers in time. The markup already has the current prices baked in as the
// default; each card updates independently and falls back to its own static
// default whenever its own data is missing, malformed, or can't be ranked
// unambiguously — never a page-wide all-or-nothing swap. Cards are matched to
// plans/packs by price/size rank (cheapest tier first, smallest pack first),
// matching how they're laid out on the page — not by name, which can
// currently collide across tiers during the transition to this page's names
// (e.g. the backend still has a plan literally named "Studio" priced like
// this page's middle tier, not its top one).
(function () {
  var tiers = Array.prototype.slice.call(document.querySelectorAll(".tiers .tier"));
  var packs = Array.prototype.slice.call(
    document.querySelectorAll('section[aria-label="Credit packs"] .faq details')
  );
  if (!tiers.length && !packs.length) return;
  if (!("fetch" in window)) return;

  // Upper bounds are deliberately generous — just enough to catch a backend
  // unit mistake (e.g. cents sent as dollars) or a negative/zero/"unlimited"
  // sentinel, without second-guessing a legitimate future price change.
  // Returns NaN (not null) on anything implausible so this doubles as a rank
  // key: an implausible value makes rankUnambiguously refuse the *whole*
  // group below, rather than just this one field, so it can't silently push
  // a neighboring, perfectly valid entry into the wrong rank slot.
  function plausible(value) {
    var n = parseFloat(value);
    return isFinite(n) && n > 0 && n <= 100000 ? n : NaN;
  }
  function dollars(value) {
    var n = plausible(value);
    if (isNaN(n)) return null;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  }
  function wholeNumber(value) {
    var n = plausible(value);
    return isNaN(n) ? null : Math.round(n);
  }
  function pluralize(count, word) {
    return count.toLocaleString("en-US") + " " + word + (count === 1 ? "" : "s");
  }
  function currentPeriod() {
    var pressed = document.querySelector(".period-toggle button[aria-pressed='true']");
    var period = pressed && pressed.getAttribute("data-period");
    return period === "year" ? "year" : "month";
  }

  function applyTier(tier, plan) {
    var monthly = dollars(plan && plan.monthlyUsd);
    var annual = dollars(plan && plan.annualUsd);
    var credits = wholeNumber(plan && plan.monthlyCredits);
    if (monthly === null || annual === null || credits === null) return;
    var amount = tier.querySelector(".price .amount");
    if (amount) {
      amount.setAttribute("data-month", monthly);
      amount.setAttribute("data-year", annual);
      // Reflect whichever period is on screen right now, not just monthly —
      // a visitor may have already switched to yearly before this resolves.
      amount.textContent = currentPeriod() === "year" ? annual : monthly;
    }
    var rate = tier.querySelector(".rate");
    if (rate && /^\d+ credits a month$/.test(rate.textContent.trim())) {
      rate.textContent = pluralize(credits, "credit") + " a month";
    }
    var strong = tier.querySelector(".checks li strong");
    if (strong && /^Up to \d+ video minutes a month$/.test(strong.textContent.trim())) {
      strong.textContent = "Up to " + pluralize(credits, "video minute") + " a month";
    }
    var yearTotal = tier.querySelector(".checks li .year-total");
    if (yearTotal) {
      yearTotal.setAttribute("data-year", "(" + pluralize(credits * 12, "minute") + " a year)");
      if (currentPeriod() === "year") yearTotal.textContent = yearTotal.getAttribute("data-year");
    }
    applyQuality(tier, plan.videoQuality);
    var cta = tier.querySelector(".plan-cta");
    if (cta && typeof plan.slug === "string") {
      cta.setAttribute("data-plan", plan.slug);
      setPlanLink(cta, currentPeriod());
    }
  }

  // The plan's video quality, as a line after "Final video export included".
  // The app leaves `videoQuality` out when it is switched off for this page,
  // so the line is only ever added from live data and removed otherwise.
  function applyQuality(tier, quality) {
    var list = tier.querySelector(".checks");
    if (!list) return;
    var existing = list.querySelector("li.video-quality");
    var name = quality && typeof quality.name === "string" ? quality.name.trim() : "";
    var fps = wholeNumber(quality && quality.fps);
    if (!name || fps === null || name.length > 40) {
      if (existing) existing.remove();
      return;
    }
    var line = existing;
    if (!line) {
      var template = list.querySelector("li");
      if (!template) return;
      line = template.cloneNode(true);
      line.className = "video-quality";
      var anchor = Array.prototype.find.call(list.children, function (li) {
        return /^Final video export included$/.test(li.textContent.trim());
      });
      list.insertBefore(line, anchor ? anchor.nextSibling : null);
    }
    var span = line.querySelector("span");
    if (!span) return;
    span.textContent = name + " video at " + fps + " fps";
  }

  function applyPack(details, pack) {
    var span = details.querySelector("summary span");
    var amount = dollars(pack && pack.amountUsd);
    var credits = wholeNumber(pack && pack.credits);
    if (!span || amount === null || credits === null) return;
    if (/^\d+ credits · \$\d+(?:\.\d+)?$/.test(span.textContent.trim())) {
      span.textContent = pluralize(credits, "credit") + " · " + amount;
    }
  }

  // Sorts `list` by `keyFn` ascending and returns it, or null if the result
  // would be ambiguous: a different count than the cards on the page, a
  // non-numeric key, or a tie (two items ranking equal, so "first" and
  // "second" aren't well-defined). Refusing on any of these means a card is
  // only ever updated when its rank is unambiguous.
  function rankUnambiguously(list, keyFn, expectedLength) {
    if (list.length !== expectedLength) return null;
    var keyed = list.map(function (item) { return { item: item, key: keyFn(item) }; });
    if (!keyed.every(function (k) { return isFinite(k.key); })) return null;
    keyed.sort(function (a, b) { return a.key - b.key; });
    for (var i = 1; i < keyed.length; i++) {
      if (keyed[i].key <= keyed[i - 1].key) return null;
    }
    return keyed.map(function (k) { return k.item; });
  }

  var options = {};
  try {
    if (window.AbortSignal && AbortSignal.timeout) options.signal = AbortSignal.timeout(4000);
  } catch (e) {}

  fetch("https://app.oministudio.com/api/public/pricing", options)
    .then(function (response) {
      if (!response.ok) throw new Error("pricing endpoint returned " + response.status);
      return response.json();
    })
    .then(function (data) {
      var plans = Array.isArray(data && data.plans) ? data.plans : [];
      var creditPacks = Array.isArray(data && data.creditPacks) ? data.creditPacks : [];
      var rankedPlans = rankUnambiguously(
        plans,
        function (p) { return plausible(p && p.monthlyUsd); },
        tiers.length
      );
      if (rankedPlans) {
        tiers.forEach(function (tier, i) { applyTier(tier, rankedPlans[i]); });
      } else if (window.console) {
        console.warn("pricing: plans from the API couldn't be ranked unambiguously against the page's tiers; static prices left as-is", plans);
      }
      var rankedPacks = rankUnambiguously(
        creditPacks,
        function (c) { return plausible(c && c.credits); },
        packs.length
      );
      if (rankedPacks) {
        packs.forEach(function (details, i) { applyPack(details, rankedPacks[i]); });
      } else if (window.console) {
        console.warn("pricing: credit packs from the API couldn't be ranked unambiguously against the page's packs; static prices left as-is", creditPacks);
      }
    })
    .catch(function () {
      // Offline, blocked, timed out, or shaped unexpectedly — the static
      // numbers already on the page are the fallback, not an error state.
    });
})();
