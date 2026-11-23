/* NCL PEOPLES — site interactions */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  /* header state */
  var header = doc.querySelector('.site-header');
  var toTop = doc.querySelector('.to-top');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-stuck', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* mobile drawer */
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
      if (window.innerWidth > 900 && drawer.classList.contains('is-open')) setOpen(false);
    });
  }

  /* reveal on scroll */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('.reveal'));
  if (revealEls.length) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

  /* portfolio filter */
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

  /* solution page: rail + scrollspy */
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
        var visible = entries.filter(function (en) { return en.isIntersecting; });
        if (!visible.length) return;
        visible.sort(function (a, b) { return a.target.offsetTop - b.target.offsetTop; });
        setActive(visible[0].target.id);
      }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });
      blocks.forEach(function (b) { spy.observe(b); });
    }
  }

  /* news archive: reveal older items */
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

  /* footer year / count animation not needed */
})();
