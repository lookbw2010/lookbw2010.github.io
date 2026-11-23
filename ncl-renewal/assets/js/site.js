/* NCL PEOPLES — site interactions (v2) */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var navH = parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 76;

  /* ---------- header: dark over hero → light glass after ---------- */
  var header = doc.querySelector('.site-header');
  var toTop = doc.querySelector('.to-top');
  var progress = doc.querySelector('.header-progress');
  var heroEl = doc.querySelector('.hero, .page-hero');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var limit = 24;
    if (heroEl) limit = Math.max(24, heroEl.offsetTop + heroEl.offsetHeight - navH - 8);
    if (header) header.classList.toggle('is-stuck', y > limit);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    if (progress) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, y / max) : 0;
      progress.style.transform = 'scaleX(' + p + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- mobile drawer ---------- */
  var toggle = doc.querySelector('.nav-toggle');
  var drawer = doc.querySelector('.drawer');
  if (toggle && drawer) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.classList.toggle('is-open', open);
      doc.body.classList.toggle('nav-open', open);
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 940 && drawer.classList.contains('is-open')) setOpen(false);
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || reduceMotion) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- phone showcase (hero) ---------- */
  var phone = doc.querySelector('[data-phone]');
  if (phone) {
    var screens = Array.prototype.slice.call(phone.querySelectorAll('.pscreen'));
    var tabs = Array.prototype.slice.call(phone.querySelectorAll('.phone-tabs button'));
    var icons = Array.prototype.slice.call(phone.querySelectorAll('.phone-tabbar i'));
    var tabBar = phone.querySelector('.phone-tabs');
    var current = 0;
    var timer = null;
    var hovered = false;
    var visible = true;

    function show(i) {
      current = (i + screens.length) % screens.length;
      screens.forEach(function (s, n) { s.classList.toggle('is-on', n === current); });
      tabs.forEach(function (t, n) {
        var on = n === current;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.setAttribute('tabindex', on ? '0' : '-1');
      });
      icons.forEach(function (ic, n) { ic.classList.toggle('is-on', n === current); });
      if (tabBar) {
        tabBar.classList.remove('is-running');
        void tabBar.offsetWidth;
        if (!reduceMotion) tabBar.classList.add('is-running');
      }
    }
    function tick() {
      if (!hovered && visible) show(current + 1);
    }
    function start() {
      stop();
      if (reduceMotion) return;
      timer = window.setInterval(tick, 4000);
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    tabs.forEach(function (t, n) {
      t.addEventListener('click', function () { show(n); start(); });
      t.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = n + 1;
        if (e.key === 'ArrowLeft') next = n - 1;
        if (next !== null) {
          e.preventDefault();
          show(next);
          tabs[(next + tabs.length) % tabs.length].focus();
          start();
        }
      });
    });

    var stage = phone.querySelector('.phone-stage') || phone;
    stage.addEventListener('mouseenter', function () { hovered = true; });
    stage.addEventListener('mouseleave', function () { hovered = false; });
    phone.addEventListener('focusin', function () { hovered = true; });
    phone.addEventListener('focusout', function () { hovered = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.15 }).observe(phone);
    }

    show(0);
    start();
  }

  /* ---------- count-up ---------- */
  var counters = Array.prototype.slice.call(doc.querySelectorAll('[data-count]'));
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var from = parseFloat(el.getAttribute('data-from') || '0');
      var out = el.querySelector('.cn') || el;
      if (reduceMotion || !('requestAnimationFrame' in window)) {
        out.textContent = target.toLocaleString('ko-KR');
        return;
      }
      var start = null;
      var dur = 1500;
      var step = function (ts) {
        if (!start) start = ts;
        var t = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = Math.round(from + (target - from) * eased);
        out.textContent = val.toLocaleString('ko-KR');
        if (t < 1) window.requestAnimationFrame(step);
        else out.textContent = target.toLocaleString('ko-KR');
      };
      window.requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- bento spotlight ---------- */
  Array.prototype.slice.call(doc.querySelectorAll('.bento-card')).forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });

  /* ---------- 5ive touch panel (home) ---------- */
  var touchPanel = doc.querySelector('[data-touch-panel]');
  if (touchPanel) {
    var ttabs = Array.prototype.slice.call(touchPanel.querySelectorAll('.touch-tab'));
    var titems = Array.prototype.slice.call(touchPanel.querySelectorAll('.tp-item'));
    var tselect = function (i) {
      ttabs.forEach(function (t, n) {
        var on = n === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      titems.forEach(function (p, n) { p.classList.toggle('is-on', n === i); });
    };
    ttabs.forEach(function (t, i) {
      t.addEventListener('click', function () { tselect(i); });
      t.addEventListener('mouseenter', function () { tselect(i); });
      t.addEventListener('focus', function () { tselect(i); });
    });
  }

  /* ---------- business flow steps ---------- */
  var flow = doc.querySelector('[data-flow]');
  if (flow) {
    var fsteps = Array.prototype.slice.call(flow.querySelectorAll('.flow-step'));
    var fpanels = Array.prototype.slice.call(flow.querySelectorAll('.flow-panel'));
    var fselect = function (i) {
      fsteps.forEach(function (s, n) {
        var on = n === i;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      fpanels.forEach(function (p, n) { p.classList.toggle('is-on', n === i); });
    };
    fsteps.forEach(function (s, i) {
      s.addEventListener('click', function () { fselect(i); });
      s.addEventListener('mouseenter', function () { fselect(i); });
      s.addEventListener('focus', function () { fselect(i); });
    });
  }

  /* ---------- marquee: repeat set for a seamless loop ---------- */
  Array.prototype.slice.call(doc.querySelectorAll('.marquee-track')).forEach(function (track) {
    var set = track.querySelector('.mq-set');
    if (!set) return;
    for (var i = 0; i < 3; i++) {
      var clone = set.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      Array.prototype.slice.call(clone.querySelectorAll('a, button')).forEach(function (el) {
        el.setAttribute('tabindex', '-1');
      });
      track.appendChild(clone);
    }
  });

  /* ---------- portfolio filter ---------- */
  var filterBar = doc.querySelector('.filter-bar');
  if (filterBar) {
    var buttons = Array.prototype.slice.call(filterBar.querySelectorAll('.filter-btn'));
    var items = Array.prototype.slice.call(doc.querySelectorAll('.pf-item'));
    var empty = doc.querySelector('.pf-empty');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var shown = 0;
      items.forEach(function (item) {
        var show = cat === 'all' || item.getAttribute('data-cat') === cat;
        item.classList.toggle('is-hidden', !show);
        if (show) shown++;
      });
      if (empty) empty.style.display = shown ? 'none' : 'block';
      var grid = doc.getElementById('pfGrid');
      if (grid) grid.setAttribute('data-active', cat);
    });
  }

  /* ---------- solution page: rail + scrollspy ---------- */
  var solNav = doc.querySelector('.sol-nav');
  if (solNav) {
    var links = Array.prototype.slice.call(solNav.querySelectorAll('a[href^="#"]'));
    var blocks = links.map(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var setActive = function (id) {
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
    };
    if (blocks.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        var vis = entries.filter(function (en) { return en.isIntersecting; });
        if (!vis.length) return;
        vis.sort(function (a, b) { return a.target.offsetTop - b.target.offsetTop; });
        setActive(vis[0].target.id);
      }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
      blocks.forEach(function (b) { spy.observe(b); });
    }
  }

  /* ---------- news archive: reveal older items ---------- */
  var newsMore = doc.getElementById('newsMore');
  if (newsMore) {
    newsMore.addEventListener('click', function () {
      var arch = doc.getElementById('newsArchive');
      if (arch) arch.classList.add('is-expanded');
      newsMore.setAttribute('aria-expanded', 'true');
      var wrap = newsMore.parentNode;
      if (wrap) wrap.style.display = 'none';
    });
  }
})();
