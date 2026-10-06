/* ============================================================
   AURUS — shell.js
   Shared, dependency-free behaviour for every page:
   · reveal-on-scroll (IntersectionObserver, "veil & lift")
   · sticky bar that solidifies once you scroll
   · catalogue switcher dropdown
   · soft fade-and-rise page transitions between internal pages
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Reveal on scroll ---------------------------------- */
  // Exposed so dynamically-built content (e.g. the catalogue grid,
  // created after this script runs) can register its elements too.
  var revealObserver = null;

  function revealNow(el) { el.classList.add("is-in"); }

  function observeReveal(els) {
    els = Array.prototype.slice.call(els);
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(revealNow);
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var group = el.closest("[data-stagger]");
          if (group && !el.style.getPropertyValue("--reveal-delay")) {
            var sibs = group.querySelectorAll(".reveal, .framed");
            var idx = Array.prototype.indexOf.call(sibs, el);
            el.style.setProperty("--reveal-delay", Math.min(idx, 8) * 45 + "ms");
          }
          revealNow(el);
          revealObserver.unobserve(el);
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    }
    els.forEach(function (el) { revealObserver.observe(el); });
  }

  // Public hook for late-built content.
  window.AurusReveal = observeReveal;

  function initReveals() {
    observeReveal(document.querySelectorAll(".reveal, .framed"));
  }

  /* ---- Sticky bar solidifies on scroll ------------------- */
  function initBar() {
    var bar = document.querySelector(".shell-bar");
    if (!bar) return;
    var ticking = false;
    function update() {
      bar.classList.toggle("shell-bar--solid", window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---- Catalogue switcher -------------------------------- */
  function initSwitch() {
    var sw = document.querySelector(".switch");
    if (!sw) return;
    var btn = sw.querySelector(".switch__btn");
    function setOpen(open) {
      sw.setAttribute("data-open", open ? "true" : "false");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(sw.getAttribute("data-open") !== "true");
    });
    document.addEventListener("click", function (e) {
      if (!sw.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ---- Soft page transitions ----------------------------- */
  function initTransitions() {
    if (reduceMotion) return;
    var veil = document.createElement("div");
    veil.className = "page-veil";
    document.body.appendChild(veil);

    // Clear the leaving state if we return via back/forward (bfcache).
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) document.body.classList.remove("page-leaving");
    });

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== window.location.origin) return;
      if (href.charAt(0) === "#") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(function () { window.location.href = a.href; }, 260);
    });
  }

  function init() {
    initReveals();
    initBar();
    initSwitch();
    initTransitions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
