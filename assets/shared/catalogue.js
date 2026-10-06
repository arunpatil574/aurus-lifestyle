/* ============================================================
   AURUS — catalogue.js
   "Cinematic stage" catalogue viewer for every brand page.

   A brand page only needs:
     1. a mount element  <div id="cat-stage" class="stage" ...></div>
     2. a config object on window:

        window.AURUS_CATALOGUE = {
          brand:      "Blinco",
          descriptor: "Premium laminates",
          base:       "../assets/brands/blinco/",
          pages:      ["blinco-06.jpg", ...]
        };

   The stage shows one page centred with its neighbours peeking;
   glide through with arrows, keyboard (←/→/Home/End), trackpad,
   touch swipe and pointer drag, plus a thumbnail filmstrip.
   Clicking the centred page opens a distraction-free full-screen
   viewer (its own prev/next/keyboard/swipe). No libraries.
   ============================================================ */
(function () {
  "use strict";

  var cfg = window.AURUS_CATALOGUE;
  var mount = document.getElementById("cat-stage");
  if (!cfg || !mount || !Array.isArray(cfg.pages) || !cfg.pages.length) return;

  var pages = cfg.pages;
  var base = cfg.base || "";
  var N = pages.length;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lightweight WebP derivatives (tools/optimize-images.py); fall back to
  // the original if a derivative is missing. Names are URL-encoded so
  // spaces/punctuation resolve.
  function stem(n) { return n.replace(/\.[^.]+$/, ""); }
  function origSrc(n)  { return base + encodeURIComponent(n); }
  function viewSrc(n)  { return base + "view/" + encodeURIComponent(stem(n) + ".webp"); }
  function thumbSrc(n) { return base + "thumbs/" + encodeURIComponent(stem(n) + ".webp"); }
  function label(i) { return cfg.brand + " — page " + (i + 1) + " of " + N; }
  function pad(i) { return String(i + 1).padStart(2, "0"); }

  function onImgError(e) {
    var img = e.target;
    if (img && img.tagName === "IMG" && img.dataset.orig && img.src.indexOf(img.dataset.orig) === -1) {
      img.src = img.dataset.orig;
    }
  }

  var SVG = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H3v6M21 9V3h-6M3 15v6h6M15 21h6v-6"/></svg>',
    zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>',
    zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>'
  };

  /* ========================================================
     Build the stage
     ======================================================== */
  mount.classList.add("stage");
  mount.setAttribute("aria-roledescription", "carousel");
  if (!mount.getAttribute("aria-label")) mount.setAttribute("aria-label", cfg.brand + " catalogue");

  var slidesHTML = "";
  for (var i = 0; i < N; i++) {
    var eager = i < 3; // first few load immediately
    slidesHTML +=
      '<button type="button" class="stage__slide" data-index="' + i + '" tabindex="-1" aria-label="' + label(i) + ' — click to view full screen">' +
        '<img src="' + viewSrc(pages[i]) + '" data-orig="' + origSrc(pages[i]) + '" alt="' + label(i) + '" ' +
        'loading="' + (eager ? "eager" : "lazy") + '" decoding="async">' +
        '<span class="stage__expand" aria-hidden="true">' + SVG.expand + '</span>' +
      '</button>';
  }

  mount.innerHTML =
    '<button type="button" class="stage__nav stage__nav--prev" aria-label="Previous page">' + SVG.prev + '</button>' +
    '<div class="stage__viewport">' +
      '<div class="stage__track">' + slidesHTML + '</div>' +
    '</div>' +
    '<button type="button" class="stage__nav stage__nav--next" aria-label="Next page">' + SVG.next + '</button>' +
    '<div class="stage__meta">' +
      '<span class="stage__count" aria-live="polite"><b>' + pad(0) + '</b> / ' + pad(N - 1) + '</span>' +
      '<span class="stage__progress" aria-hidden="true"><i></i></span>' +
    '</div>' +
    '<div class="stage__strip" role="tablist" aria-label="Catalogue pages"></div>';

  var viewport = mount.querySelector(".stage__viewport");
  var track = mount.querySelector(".stage__track");
  var navPrev = mount.querySelector(".stage__nav--prev");
  var navNext = mount.querySelector(".stage__nav--next");
  var count = mount.querySelector(".stage__count");
  var progress = mount.querySelector(".stage__progress i");
  var strip = mount.querySelector(".stage__strip");
  var slides = Array.prototype.slice.call(track.children);

  track.addEventListener("error", onImgError, true);

  // Filmstrip
  var thumbs = [];
  var stripFrag = document.createDocumentFragment();
  for (var t = 0; t < N; t++) {
    var th = document.createElement("button");
    th.type = "button";
    th.className = "stage__thumb";
    th.setAttribute("role", "tab");
    th.setAttribute("aria-label", label(t));
    th.dataset.index = t;
    th.innerHTML = '<img src="' + thumbSrc(pages[t]) + '" data-orig="' + origSrc(pages[t]) + '" alt="" loading="lazy" decoding="async">';
    stripFrag.appendChild(th);
    thumbs.push(th);
  }
  strip.appendChild(stripFrag);
  strip.addEventListener("error", onImgError, true);
  strip.addEventListener("click", function (e) {
    var th = e.target.closest(".stage__thumb");
    if (th) goTo(+th.dataset.index);
  });

  /* ========================================================
     Geometry + navigation
     ======================================================== */
  var active = 0;
  var step = 0, slideW = 0, gap = 0, vpW = 0;

  function measure() {
    slideW = slides[0].offsetWidth;
    var cs = getComputedStyle(track);
    gap = parseFloat(cs.columnGap || cs.gap || "0") || 0;
    step = slideW + gap;
    vpW = viewport.clientWidth;
  }

  function translateFor(i) {
    return Math.round(vpW / 2 - slideW / 2 - i * step);
  }

  function place(px, animate) {
    if (!animate) track.style.transition = "none";
    track.style.transform = "translate3d(" + px + "px,0,0)";
    if (!animate) {
      // force reflow then restore transition
      void track.offsetWidth;
      track.style.transition = "";
    }
  }

  function ensureLoaded(i) {
    for (var j = i - 2; j <= i + 2; j++) {
      if (j >= 0 && j < N) {
        var im = slides[j].querySelector("img");
        if (im && im.loading === "lazy") im.loading = "eager";
      }
    }
  }

  function render(animate) {
    slides.forEach(function (s, i) {
      var on = i === active;
      s.classList.toggle("is-active", on);
      s.tabIndex = on ? 0 : -1;
    });
    thumbs.forEach(function (th, i) {
      th.setAttribute("aria-current", i === active ? "true" : "false");
    });
    count.innerHTML = "<b>" + pad(active) + "</b> / " + pad(N - 1);
    progress.style.setProperty("--p", (N > 1 ? active / (N - 1) : 1).toFixed(4));
    navPrev.disabled = active === 0;
    navNext.disabled = active === N - 1;
    place(translateFor(active), animate !== false);

    var th = thumbs[active];
    if (th && th.scrollIntoView) {
      th.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }
    ensureLoaded(active);
  }

  function goTo(i, animate) {
    i = Math.max(0, Math.min(N - 1, i));
    active = i;
    render(animate);
  }
  function go(delta) { goTo(active + delta); }

  navPrev.addEventListener("click", function () { go(-1); });
  navNext.addEventListener("click", function () { go(1); });

  /* ---- Click a slide: active → full screen, neighbour → centre ---- */
  var suppressClick = false;
  track.addEventListener("click", function (e) {
    if (suppressClick) { suppressClick = false; return; }
    var slide = e.target.closest(".stage__slide");
    if (!slide) return;
    var i = +slide.dataset.index;
    if (i === active) openViewer(active);
    else goTo(i);
  });

  /* ---- Keyboard (when full-screen viewer is closed) ---- */
  document.addEventListener("keydown", function (e) {
    if (viewer.classList.contains("is-open")) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(N - 1); }
  });

  /* ---- Pointer drag / swipe ---- */
  var dragging = false, startX = 0, startY = 0, baseX = 0, moved = 0, lockedAxis = "";
  viewport.addEventListener("pointerdown", function (e) {
    if (e.isPrimary === false) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(".stage__nav")) return;
    dragging = true; lockedAxis = ""; moved = 0;
    startX = e.clientX; startY = e.clientY;
    baseX = translateFor(active);
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (!lockedAxis) {
      // Only commit to a horizontal drag when the gesture is clearly
      // horizontal — a vertical/page scroll must never turn pages.
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        lockedAxis = "x";
        track.classList.add("is-dragging");
      } else if (Math.abs(dy) > 10) {
        dragging = false; // it's a vertical scroll — let it go
        return;
      } else {
        return; // not enough movement to decide yet
      }
    }
    moved = dx;
    place(baseX + dx, false);
  });
  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    if (lockedAxis !== "x") return;
    if (Math.abs(moved) > 8) suppressClick = true; // it was a drag, not a tap
    var shift = -moved / step;
    var target = Math.round(active + shift);
    if (target === active && Math.abs(moved) > step * 0.14) target = active + (moved < 0 ? 1 : -1);
    goTo(target);
  });

  /* ---- Resize ---- */
  var rT = null;
  window.addEventListener("resize", function () {
    clearTimeout(rT);
    rT = setTimeout(function () { measure(); render(false); }, 120);
  });

  /* ========================================================
     Full-screen viewer (reused on click / expand)
     ======================================================== */
  var viewer = document.createElement("div");
  viewer.className = "viewer";
  viewer.setAttribute("role", "dialog");
  viewer.setAttribute("aria-modal", "true");
  viewer.setAttribute("aria-label", cfg.brand + " — full screen");
  viewer.innerHTML =
    '<div class="viewer__top">' +
      '<div class="viewer__title"><b>' + cfg.brand + '</b><span>' + (cfg.descriptor || "") + '</span></div>' +
      '<div class="viewer__tools">' +
        '<span class="viewer__count" aria-live="polite"></span>' +
        '<div class="viewer__zoom">' +
          '<button type="button" class="viewer__zbtn viewer__zbtn--out" aria-label="Zoom out">' + SVG.zoomOut + '</button>' +
          '<button type="button" class="viewer__zlevel" aria-label="Reset zoom">100%</button>' +
          '<button type="button" class="viewer__zbtn viewer__zbtn--in" aria-label="Zoom in">' + SVG.zoomIn + '</button>' +
        '</div>' +
        '<button type="button" class="viewer__close" aria-label="Close full screen">' + SVG.close + '</button>' +
      '</div>' +
    '</div>' +
    '<div class="viewer__stage">' +
      '<button type="button" class="viewer__nav viewer__nav--prev" aria-label="Previous page">' + SVG.prev + '</button>' +
      '<img class="viewer__img" alt="">' +
      '<button type="button" class="viewer__nav viewer__nav--next" aria-label="Next page">' + SVG.next + '</button>' +
    '</div>';
  document.body.appendChild(viewer);

  var vStage = viewer.querySelector(".viewer__stage");
  var vImg = viewer.querySelector(".viewer__img");
  var vCount = viewer.querySelector(".viewer__count");
  var vPrev = viewer.querySelector(".viewer__nav--prev");
  var vNext = viewer.querySelector(".viewer__nav--next");
  var vClose = viewer.querySelector(".viewer__close");
  var vZoomIn = viewer.querySelector(".viewer__zbtn--in");
  var vZoomOut = viewer.querySelector(".viewer__zbtn--out");
  var vZoomLevel = viewer.querySelector(".viewer__zlevel");
  var lastFocus = null;

  function vPreload(i) { if (i >= 0 && i < N) { var im = new Image(); im.src = viewSrc(pages[i]); } }

  function vShow(i, dir) {
    if (i < 0 || i >= N) return;
    active = i;
    resetZoom();
    vImg.dataset.orig = origSrc(pages[i]);
    vImg.src = viewSrc(pages[i]);
    vImg.alt = label(i);
    vCount.textContent = pad(i) + " / " + pad(N - 1);
    vPrev.disabled = i === 0;
    vNext.disabled = i === N - 1;
    if (!reduceMotion && dir) { vStage.setAttribute("data-dir", dir); void vStage.offsetWidth; }
    vPreload(i + 1); vPreload(i - 1);
  }

  function openViewer(i) {
    lastFocus = document.activeElement;
    vShow(i);
    viewer.classList.add("is-open");
    document.body.classList.add("viewer-open");
    vClose.focus();
  }
  function closeViewer() {
    viewer.classList.remove("is-open");
    document.body.classList.remove("viewer-open");
    render(false);           // sync the stage to wherever we ended up
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function vNextFn() { if (active < N - 1) vShow(active + 1, "next"); }
  function vPrevFn() { if (active > 0) vShow(active - 1, "prev"); }

  vImg.addEventListener("error", onImgError);
  vNext.addEventListener("click", vNextFn);
  vPrev.addEventListener("click", vPrevFn);
  vClose.addEventListener("click", closeViewer);
  vStage.addEventListener("click", function (e) { if (e.target === vStage) closeViewer(); });

  document.addEventListener("keydown", function (e) {
    if (!viewer.classList.contains("is-open")) return;
    if (e.key === "Escape") { if (zoom > 1) resetZoom(); else closeViewer(); }
    else if (e.key === "ArrowRight") vNextFn();
    else if (e.key === "ArrowLeft") vPrevFn();
    else if (e.key === "Home") vShow(0);
    else if (e.key === "End") vShow(N - 1);
    else if (e.key === "+" || e.key === "=") zoomTo(zoom + ZSTEP);
    else if (e.key === "-" || e.key === "_") zoomTo(zoom - ZSTEP);
    else if (e.key === "0") resetZoom();
    else if (e.key === "Tab") {
      var f = viewer.querySelectorAll("button:not([disabled])");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Touch swipe inside the full-screen viewer
  var vsx = 0, vsy = 0, vsw = false;
  vStage.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1 || zoom > 1) return;   // when zoomed, the gesture pans (below)
    vsx = e.touches[0].clientX; vsy = e.touches[0].clientY; vsw = true;
  }, { passive: true });
  vStage.addEventListener("touchend", function (e) {
    if (!vsw) return; vsw = false;
    var tch = e.changedTouches[0], dx = tch.clientX - vsx, dy = tch.clientY - vsy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) vNextFn(); else vPrevFn(); }
  }, { passive: true });

  /* ========================================================
     Zoom & pan inside the full-screen viewer
     ======================================================== */
  var zoom = 1, panX = 0, panY = 0;
  var ZMIN = 1, ZMAX = 4, ZSTEP = 0.5;

  function clampPan() {
    var sw = vStage.clientWidth, sh = vStage.clientHeight;
    var iw = vImg.offsetWidth * zoom, ih = vImg.offsetHeight * zoom;
    var ox = Math.max(0, (iw - sw) / 2), oy = Math.max(0, (ih - sh) / 2);
    panX = Math.max(-ox, Math.min(ox, panX));
    panY = Math.max(-oy, Math.min(oy, panY));
  }
  function applyZoom() {
    clampPan();
    vImg.style.transform = "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")";
    vStage.classList.toggle("is-zoomed", zoom > 1);
    vZoomLevel.textContent = Math.round(zoom * 100) + "%";
    vZoomOut.disabled = zoom <= ZMIN + 0.001;
    vZoomIn.disabled = zoom >= ZMAX - 0.001;
  }
  function resetZoom() {
    zoom = 1; panX = 0; panY = 0;
    vStage.classList.remove("is-zoomed", "is-panning");
    vImg.style.transform = "";
    if (vZoomLevel) {
      vZoomLevel.textContent = "100%";
      vZoomOut.disabled = true;
      vZoomIn.disabled = false;
    }
  }
  // Zoom toward a screen point (cx,cy); omit to zoom about centre.
  function zoomTo(nz, cx, cy) {
    nz = Math.max(ZMIN, Math.min(ZMAX, nz));
    if (nz === zoom) return;
    var r = vStage.getBoundingClientRect();
    var dx = (cx == null ? 0 : cx - (r.left + r.width / 2));
    var dy = (cy == null ? 0 : cy - (r.top + r.height / 2));
    panX = dx - (dx - panX) * (nz / zoom);
    panY = dy - (dy - panY) * (nz / zoom);
    zoom = nz;
    if (zoom === 1) { panX = 0; panY = 0; }
    applyZoom();
  }

  vZoomIn.addEventListener("click", function () { zoomTo(zoom + ZSTEP); });
  vZoomOut.addEventListener("click", function () { zoomTo(zoom - ZSTEP); });
  vZoomLevel.addEventListener("click", function () { resetZoom(); });

  // Wheel / trackpad zoom, focused on the cursor
  vStage.addEventListener("wheel", function (e) {
    e.preventDefault();
    zoomTo(zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18), e.clientX, e.clientY);
  }, { passive: false });

  // Double-click / double-tap toggles between fit and 2.5×
  vImg.addEventListener("dblclick", function (e) {
    e.preventDefault();
    if (zoom > 1) resetZoom(); else zoomTo(2.5, e.clientX, e.clientY);
  });

  // Drag to pan when zoomed (mouse + touch via pointer events)
  var panning = false, pStartX = 0, pStartY = 0, pOrigX = 0, pOrigY = 0;
  vImg.addEventListener("pointerdown", function (e) {
    if (zoom <= 1) return;
    panning = true;
    pStartX = e.clientX; pStartY = e.clientY; pOrigX = panX; pOrigY = panY;
    vStage.classList.add("is-panning");
    try { vImg.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  vImg.addEventListener("pointermove", function (e) {
    if (!panning) return;
    panX = pOrigX + (e.clientX - pStartX);
    panY = pOrigY + (e.clientY - pStartY);
    applyZoom();
  });
  function endPan(e) {
    if (!panning) return;
    panning = false;
    vStage.classList.remove("is-panning");
    try { vImg.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  vImg.addEventListener("pointerup", endPan);
  vImg.addEventListener("pointercancel", endPan);
  vImg.draggable = false;

  /* ========================================================
     Boot
     ======================================================== */
  function boot() {
    measure();
    if (measure && slideW === 0) { // layout not ready yet
      requestAnimationFrame(boot);
      return;
    }
    render(false);
    // reveal the stage if it was registered with the shared observer
    mount.classList.add("is-in");
  }
  // wait a frame so the slide layout (aspect-ratio) has resolved
  requestAnimationFrame(function () { requestAnimationFrame(boot); });
})();
