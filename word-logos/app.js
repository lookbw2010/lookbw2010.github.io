/* WORDMARK 20 — catalogue app */
(function () {
  'use strict';

  var COLORS = [
    { id: 'cobalt', name: '코발트 블루', hex: '#2447D8' },
    { id: 'forest', name: '포레스트 그린', hex: '#157A52' },
    { id: 'ink', name: '잉크 블랙', hex: '#111827' },
    { id: 'vermilion', name: '버밀리온 레드', hex: '#D8382B' }
  ];
  var CATS = [
    { id: 'all', name: '전체', n: 20 },
    { id: 'protect', name: '보호·안심', n: 5 },
    { id: 'health', name: '건강·생명', n: 5 },
    { id: 'future', name: '미래·신뢰', n: 6 },
    { id: 'family', name: '가족·동행', n: 4 }
  ];
  var CATNAME = { protect: '보호 · 안심', health: '건강 · 생명', future: '미래 · 신뢰', family: '가족 · 동행' };
  var INK = '#111827';

  var state = { cat: 'all', color: 'cobalt' };
  var printCache = {};
  var cur = null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function accent() {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === state.color) return COLORS[i].hex;
    return COLORS[0].hex;
  }

  /* ---------- controls ---------- */
  function renderSwatches() {
    var box = $('#swatches');
    box.innerHTML = '';
    COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'sw';
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', c.name);
      b.setAttribute('aria-checked', String(c.id === state.color));
      b.title = c.name;
      b.innerHTML = '<span style="background:' + c.hex + '"></span>';
      b.addEventListener('click', function () {
        state.color = c.id;
        document.documentElement.style.setProperty('--accent', c.hex);
        document.documentElement.style.setProperty('--accent-soft', hexSoft(c.hex));
        renderSwatches();
        if (cur) refreshPrints();
      });
      box.appendChild(b);
    });
  }

  function hexSoft(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r + (255 - r) * 0.9) + ',' + Math.round(g + (255 - g) * 0.9) + ',' + Math.round(b + (255 - b) * 0.9) + ')';
  }

  function renderCats() {
    var box = $('#cats');
    box.innerHTML = '';
    CATS.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.cat === c.id ? ' is-on' : '');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(state.cat === c.id));
      b.innerHTML = c.name + '<b>' + c.n + '</b>';
      b.addEventListener('click', function () {
        state.cat = c.id;
        renderCats();
        renderGrid();
      });
      box.appendChild(b);
    });
  }

  /* ---------- grid ---------- */
  function renderGrid() {
    var grid = $('#grid');
    grid.innerHTML = '';
    window.LOGOS.forEach(function (l) {
      if (state.cat !== 'all' && l.cat !== state.cat) return;
      var t = document.createElement('button');
      t.className = 'tile';
      t.type = 'button';
      t.setAttribute('aria-label', l.word + ' 로고 크게 보기');
      t.innerHTML =
        '<span class="badge">' + CATNAME[l.cat].replace(/ /g, '') + '</span>' +
        '<span class="art"><svg viewBox="0 0 ' + l.vb + ' 120" class="svg-accent" role="img" aria-label="' + l.word + '">' + l.inner + '</svg></span>' +
        '<span class="meta"><span class="w">' + l.word + '</span><span class="k">' + l.ko + '</span></span>';
      t.addEventListener('click', function () { openModal(l); });
      grid.appendChild(t);
    });
  }

  /* ---------- svg string / downloads ---------- */
  function svgString(l, acc) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + l.vb + ' 120" width="' + l.vb + '" height="120">' +
      '<style>.ac{fill:' + acc + ';stroke:none}.acs{fill:none;stroke:' + acc + '}</style>' +
      '<g color="' + INK + '" fill="currentColor">' + l.inner + '</g></svg>';
  }

  function pngURL(l, acc, width) {
    var key = l.id + '|' + acc + '|' + width;
    if (printCache[key]) return Promise.resolve(printCache[key]);
    return new Promise(function (resolve) {
      var scale = width / l.vb;
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas');
        cv.width = Math.round(l.vb * scale);
        cv.height = Math.round(120 * scale);
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL('image/png');
        printCache[key] = url;
        resolve(url);
      };
      img.onerror = function () { resolve(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString(l, acc));
    });
  }

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------- modal ---------- */
  var VIEWNOTE = {
    art: '순수 화이트 아트보드 · 벡터 원본',
    bag: '에코백 인쇄 목업 · 코튼 캔버스',
    tumbler: '텀블러 인쇄 목업 · 매트 스테인리스',
    tee: '티셔츠 인쇄 목업 · 코튼 크루넥'
  };

  function openModal(l) {
    cur = l;
    $('#mTitle').textContent = l.word;
    $('#mKo').textContent = l.ko;
    $('#mCat').textContent = CATNAME[l.cat];
    $('#mNote').textContent = l.note;
    $('#artboard').innerHTML = '<svg viewBox="0 0 ' + l.vb + ' 120" class="svg-accent" role="img" aria-label="' + l.word + '">' + l.inner + '</svg>';
    setView('art');
    refreshPrints();
    var m = $('#modal');
    m.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.x', m).focus({ preventScroll: true });
  }

  function closeModal() {
    $('#modal').hidden = true;
    document.body.style.overflow = '';
    cur = null;
  }

  function setView(v) {
    $$('.view').forEach(function (el) { el.hidden = el.getAttribute('data-view') !== v; });
    $$('.tab').forEach(function (t) {
      var on = t.getAttribute('data-view') === v;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', String(on));
    });
    $('#stageNote').textContent = VIEWNOTE[v];
  }

  function refreshPrints() {
    if (!cur) return;
    var acc = accent();
    ['bag', 'tumbler', 'tee'].forEach(function (k) {
      var img = $('[data-print="' + k + '"]');
      if (!img) return;
      pngURL(cur, acc, k === 'bag' ? 620 : (k === 'tumbler' ? 420 : 560)).then(function (url) {
        if (url) img.src = url;
      });
    });
  }

  /* ---------- events ---------- */
  function bind() {
    $$('[data-close]').forEach(function (el) { el.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    });
    $$('.tab').forEach(function (t) {
      t.addEventListener('click', function () { setView(t.getAttribute('data-view')); });
    });
    $('#dlSvg').addEventListener('click', function () {
      if (!cur) return;
      var svg = svgString(cur, accent());
      saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), 'wordmark-' + cur.id + '.svg');
    });
    $('#dlPng').addEventListener('click', function () {
      if (!cur) return;
      var btn = $('#dlPng');
      btn.disabled = true;
      pngURL(cur, accent(), 1600).then(function (url) {
        var a = document.createElement('a');
        a.href = url;
        a.download = 'wordmark-' + cur.id + '.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
        btn.disabled = false;
      });
    });
  }

  /* ---------- boot ---------- */
  document.documentElement.style.setProperty('--accent', accent());
  document.documentElement.style.setProperty('--accent-soft', hexSoft(accent()));
  renderSwatches();
  renderCats();
  renderGrid();
  bind();
})();
