/* 도미노 글자 편지 — app.js
 * 서버 없이 동작합니다. 공유 링크(?t=...) 안에 편지가 통째로 담깁니다.
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ══════════════════════ 소리 ══════════════════════ */
  var Sfx = (function () {
    var ctx = null, master = null, muted = false;
    try { muted = localStorage.getItem('domino-letter-muted') === '1'; } catch (e) { }

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } }
        return ctx;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ctx.destination);
      return ctx;
    }

    function setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('domino-letter-muted', muted ? '1' : '0'); } catch (e) { }
      if (master) master.gain.value = muted ? 0 : 0.85;
    }

    /* 나무·아크릴 타일이 부딪히는 짧은 소리 */
    function clack(i, n) {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.002;
      var rate = ctx.sampleRate;
      var len = Math.max(1, Math.round(rate * 0.075));
      var buf = ctx.createBuffer(1, len, rate);
      var d = buf.getChannelData(0);
      for (var k = 0; k < len; k++) {
        var e = 1 - k / len;
        d[k] = (Math.random() * 2 - 1) * Math.pow(e, 4.2);
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1050 + (i % 6) * 95 + Math.random() * 240;
      bp.Q.value = 1.3;
      var g = ctx.createGain();
      g.gain.value = 0.5;
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t);

      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      var ratio = n > 1 ? i / (n - 1) : 0;
      var f = 286 + ratio * 150 + Math.random() * 36;
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.52, t + 0.085);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.2, t + 0.006);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.125);
      osc.connect(g2); g2.connect(master);
      osc.start(t); osc.stop(t + 0.14);
    }

    /* 마지막 타일 → 편지가 열릴 때의 종소리 */
    function chime() {
      if (!ctx || muted) return;
      var t0 = ctx.currentTime + 0.02;
      var notes = [783.99, 987.77, 1318.51];
      notes.forEach(function (f, i) {
        var t = t0 + i * 0.085;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16 / (1 + i * 0.35), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.9);
      });
    }

    function ui() {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.001;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.05);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.11);
    }

    return {
      ensure: ensure,
      setMuted: setMuted,
      isMuted: function () { return muted; },
      clack: clack,
      chime: chime,
      ui: ui
    };
  })();

  /* ══════════════════════ 모델 · 인코딩 ══════════════════════ */
  var THEMES = [
    { id: 'wood', label: '웜 우드', a: '#F2C894', b: '#D89A5C', c: '#A9703A' },
    { id: 'mint', label: '파스텔 민트', a: '#DCF6EC', b: '#A5E1CB', c: '#6CBCA2' },
    { id: 'coral', label: '코랄 핑크', a: '#FFD8CC', b: '#F8A48F', c: '#DE7C64' },
    { id: 'noir', label: '블랙 & 골드', a: '#3B3429', b: '#1E1A14', c: '#0D0B08' }
  ];
  var THEME_IDS = THEMES.map(function (t) { return t.id; });
  var PRESETS = ['생일 축하해', '고마워요', '사랑해요', '수고했어요', '새해 복 많이', '잘 다녀와'];
  var FALLBACK_PHRASE = '도미노 편지';

  function cut(s, n) {
    s = String(s == null ? '' : s);
    s = s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.slice(0, n);
  }
  function normModel(o) {
    o = o && typeof o === 'object' ? o : {};
    return {
      to: cut(o.t, 16),
      from: cut(o.f, 16),
      phrase: cut(o.p, 12),
      body: String(o.b == null ? '' : o.b).replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, 200),
      theme: THEME_IDS.indexOf(o.c) >= 0 ? o.c : 'wood'
    };
  }
  function b64url(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(tok) {
    var s = String(tok).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeModel(m) {
    return b64url(JSON.stringify({ v: 1, t: m.to, f: m.from, p: m.phrase, b: m.body, c: m.theme }));
  }
  function decodeModel(tok) {
    try {
      var o = JSON.parse(unb64url(tok));
      var m = normModel(o);
      if (!m.phrase && !m.body) return null;
      return m;
    } catch (e) { return null; }
  }

  /* ══════════════════════ 도미노 무대 ══════════════════════ */
  var GAP_MS = 88;      /* 타일 사이 간격 */
  var FALL_MS = 330;    /* 한 장이 넘어지는 시간 */
  var HIT_MS = 175;     /* 부딪히는 순간 */

  function Field(stage, board, opts) {
    this.stage = stage;
    this.board = board;
    this.opts = opts || {};
    this.model = null;
    this.tiles = [];
    this.done = false;
    this.running = false;
    this.timers = [];
    this.builtW = 0;
    this.builtH = 0;
  }

  Field.prototype.setModel = function (m, keepState) {
    this.model = m;
    this.stage.setAttribute('data-theme', m.theme || 'wood');
    this.build(keepState);
  };

  Field.prototype.build = function (keepState) {
    var stage = this.stage, board = this.board;
    var W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    this.clearTimers();

    var phrase = (this.model && this.model.phrase) || '';
    var chars = phrase.replace(/\s+/g, '').split('');
    if (!chars.length) chars = FALLBACK_PHRASE.split('');

    /* 앞쪽 점 타일(도미노 눈금) → 글자 타일 → 마지막 편지 타일 */
    var lead = chars.length <= 5 ? 3 : (chars.length <= 8 ? 2 : 1);
    var list = [];
    for (var i = 0; i < lead; i++) list.push({ kind: 'pip', pips: 2 + (i % 3) });
    chars.forEach(function (c) { list.push({ kind: 'char', ch: c }); });
    list.push({ kind: 'finale' });

    var n = list.length;
    var geom = this.measure(W, H, n);
    board.innerHTML = '';
    this.tiles = [];
    this.builtW = W; this.builtH = H;
    board.style.width = W + 'px';
    board.style.height = H + 'px';

    var pts = this.pathPoints(geom, n);
    var self = this;

    pts.forEach(function (pt, idx) {
      var item = list[idx];
      var dir = pt.dir;
      var wrap = document.createElement('div');
      wrap.className = 'wrap';
      wrap.style.left = pt.x.toFixed(1) + 'px';
      wrap.style.top = pt.y.toFixed(1) + 'px';
      wrap.style.setProperty('--tw', geom.tileW + 'px');
      wrap.style.setProperty('--th', geom.tileH + 'px');
      wrap.style.zIndex = String(n - idx + 1);

      var sh = document.createElement('span');
      sh.className = 'sh';
      sh.setAttribute('aria-hidden', 'true');
      wrap.appendChild(sh);

      var tile = document.createElement('div');
      tile.className = 'tile' + (item.kind === 'finale' ? ' finale' : '');
      tile.style.setProperty('--org', dir > 0 ? '100% 100%' : '0% 100%');
      var tilt = ((idx * 37) % 7 - 3) * 0.55;
      tile.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');

      if (item.kind === 'char') {
        var g = document.createElement('span');
        g.className = 'glyph';
        g.textContent = item.ch;
        tile.appendChild(g);
      } else if (item.kind === 'pip') {
        var p = document.createElement('span');
        p.className = 'pips';
        for (var k = 0; k < item.pips; k++) p.appendChild(document.createElement('i'));
        tile.appendChild(p);
      } else {
        var f = document.createElement('span');
        f.className = 'glyph';
        f.textContent = '✉';
        tile.appendChild(f);
      }

      wrap.appendChild(tile);
      board.appendChild(wrap);
      self.tiles.push({ node: tile, dir: dir, tilt: tilt, index: idx });
    });

    if (keepState && this.done) this.applyFallen();
  };

  /* 무대 크기와 타일 수로 타일 크기·줄 수를 정한다 */
  Field.prototype.measure = function (W, H, n) {
    var rows = n <= 10 ? 2 : 3;
    var per = Math.ceil(n / rows);
    var best = null;
    for (var tileH = Math.min(96, Math.round(H * 0.5)); tileH >= 42; tileH -= 2) {
      var tileW = Math.round(tileH * 0.62);
      var pitch = Math.round(tileH * 1.36);
      var margin = Math.ceil(tileW * 0.62 + 6);
      /* 마지막 타일이 오른쪽으로 넘어질 자리(무대 밖으로 잘리지 않게) */
      var marginR = Math.round(tileH * 1.18) + 4;
      var L = W - margin - marginR;
      if (L < 90) continue;
      if (tileH + (rows - 1) * pitch + 12 > H) continue;
      var spacing = per > 1 ? L / (per - 1) : L;
      var cand = {
        tileW: tileW, tileH: tileH, rows: rows, rowPitch: pitch, per: per,
        margin: margin, marginR: marginR, spacing: spacing, W: W, H: H, n: n
      };
      if (!best) best = cand;
      if (spacing >= tileH * 0.72 && spacing <= tileH * 0.94) { best = cand; break; }
    }
    if (!best) {
      var th = 46, tw = Math.round(th * 0.62);
      best = {
        tileW: tw, tileH: th, rows: 3, rowPitch: Math.round(th * 1.36), per: Math.ceil(n / 3),
        margin: Math.ceil(tw * 0.62 + 6), marginR: Math.round(th * 1.18) + 4,
        spacing: th * 0.8, W: W, H: H, n: n
      };
    }
    return best;
  };

  /* 줄마다 타일을 같은 간격으로 세우고, 줄이 바뀌면 다음 줄 왼쪽부터 이어진다(릴레이) */
  Field.prototype.pathPoints = function (g, n) {
    var rows = g.rows, pitch = g.rowPitch, tileH = g.tileH;
    var blockH = tileH + (rows - 1) * pitch;
    var startY = Math.max(8, Math.round((g.H - blockH) / 2));
    var xL = g.margin;
    var xR = g.W - (g.marginR || g.margin);
    var span = xR - xL;
    var maxCnt = g.per;
    var spacing = maxCnt > 1 ? span / (maxCnt - 1) : span;
    var left = n;
    var out = [];
    for (var r = 0; r < rows; r++) {
      var cnt = Math.min(left, maxCnt);
      if (r === rows - 1) cnt = left;
      left -= cnt;
      if (cnt <= 0) continue;
      var y = startY + tileH + r * pitch;
      var rowW = (cnt - 1) * spacing;
      var pad = (span - rowW) / 2;
      for (var i = 0; i < cnt; i++) {
        /* 줄마다 왼쪽에서 오른쪽으로 — 글자가 읽히는 순서를 지키고, 다음 줄은 왼쪽에서 이어진다 */
        out.push({ x: xL + pad + i * spacing, y: y, row: r, dir: 1 });
      }
    }
    return out;
  };

  Field.prototype.clearTimers = function () {
    this.timers.forEach(function (t) { clearTimeout(t); });
    this.timers = [];
  };

  Field.prototype.later = function (fn, ms) {
    var id = setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  };

  Field.prototype.reset = function (hard) {
    this.clearTimers();
    this.running = false;
    var wasDown = this.done;
    this.done = false;
    var self = this;
    this.tiles.forEach(function (t, i) {
      if (t.node.getAnimations) {
        t.node.getAnimations().forEach(function (a) { a.cancel(); });
      }
      t.node.classList.remove('down');
      if (wasDown && !reduceMotion && t.node.animate) {
        t.node.animate([
          { transform: 'rotate(' + (t.dir * 73 + t.tilt * 0.4).toFixed(2) + 'deg)' },
          { transform: 'rotate(' + (t.tilt - 2.4).toFixed(2) + 'deg)' },
          { transform: 'rotate(' + t.tilt.toFixed(2) + 'deg)' }
        ], { duration: 430, delay: i * 24, easing: 'cubic-bezier(.2,1.1,.35,1)', fill: 'forwards' });
      } else {
        t.node.style.transform = 'rotate(' + t.tilt.toFixed(2) + 'deg)';
      }
    });
    if (hard) this.build(false);
    if (this.opts.onReset) this.opts.onReset();
  };

  Field.prototype.applyFallen = function () {
    this.tiles.forEach(function (t) {
      t.node.style.transform = 'rotate(' + (t.dir * 73 + t.tilt * 0.4).toFixed(2) + 'deg)';
      t.node.classList.add('down');
    });
    this.done = true;
  };

  Field.prototype.run = function () {
    if (this.running) return;
    if (this.done) this.reset(false);
    if (!this.tiles.length) return;
    Sfx.ensure();
    var self = this;
    this.running = true;
    var n = this.tiles.length;

    this.tiles.forEach(function (t, i) {
      self.later(function () {
        if (!self.running) return;
        self.fall(i);
      }, i * GAP_MS);
    });

    this.later(function () {
      self.running = false;
      self.done = true;
      try { if (navigator.vibrate) navigator.vibrate([10, 34, 16]); } catch (e) { }
      Sfx.chime();
      if (self.opts.onDone) self.opts.onDone();
    }, (n - 1) * GAP_MS + FALL_MS + 60);
  };

  Field.prototype.fall = function (i) {
    var t = this.tiles[i];
    if (!t) return;
    var from = t.tilt;
    var to = t.dir * 73 + t.tilt * 0.4;
    var over = t.dir * 81 + t.tilt * 0.4;
    if (reduceMotion || !t.node.animate) {
      t.node.style.transform = 'rotate(' + to.toFixed(2) + 'deg)';
    } else {
      t.node.animate([
        { transform: 'rotate(' + from.toFixed(2) + 'deg)' },
        { transform: 'rotate(' + over.toFixed(2) + 'deg)', offset: 0.66 },
        { transform: 'rotate(' + to.toFixed(2) + 'deg)' }
      ], { duration: FALL_MS, easing: 'linear', fill: 'forwards' });
    }
    t.node.classList.add('down');
    var self = this;
    this.later(function () { Sfx.clack(i, self.tiles.length); }, HIT_MS);
  };

  /* ══════════════════════ 화면 · 상태 ══════════════════════ */
  var receiveView = $('#receiveView');
  var makeView = $('#makeView');
  var rcvStage = $('#rcvStage');
  var mkStage = $('#mkStage');
  var letterCard = $('#letterCard');
  var pushBtn = $('#pushBtn');
  var previewBtn = $('#previewBtn');
  var previewNote = $('#previewNote');
  var toMakeBtn = $('#toMakeBtn');

  var draft = {
    to: '', from: '', phrase: '생일 축하해',
    body: '오늘 하루도 네 덕분에 웃었어.\n내일은 더 좋은 일만 가득하길 바랄게.',
    theme: 'wood'
  };

  var rcvField = new Field(rcvStage, $('#rcvBoard'), {
    onDone: function () { showLetter(); }
  });
  var mkField = new Field(mkStage, $('#mkBoard'), {
    onDone: function () {
      previewNote.textContent = '이렇게 도착해요 ✓';
      previewBtn.querySelector('.push-ico').textContent = '↻';
      previewBtn.lastChild.textContent = ' 다시 밀어보기';
    }
  });

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return legacyCopy(txt); });
    }
    return Promise.resolve(legacyCopy(txt));
  }
  function legacyCopy(txt) {
    try {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ── 받는 사람 화면 ── */
  function showLetter() {
    var m = rcvField.model || draft;
    receiveView.classList.add('pushed');
    pushBtn.hidden = true;
    $('#rcvHint').hidden = true;
    $('#letterFrom').textContent = m.from ? (m.to ? m.to + ' 님에게 · ' + m.from + ' 님이 보냄' : m.from + ' 님이 보냄') : '도미노 편지가 도착했어요';
    $('#letterPhrase').textContent = m.phrase || FALLBACK_PHRASE;
    var body = $('#letterBody');
    body.textContent = m.body || '';
    body.hidden = !m.body;
    var sign = $('#letterSign');
    if (m.from) { sign.textContent = '— ' + m.from + ' 드림'; sign.hidden = false; }
    else { sign.hidden = true; }
    letterCard.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { letterCard.classList.add('show'); });
    });
  }

  function openReceive(m) {
    draft = normModel({ t: m.to, f: m.from, p: m.phrase, b: m.body, c: m.theme });
    makeView.hidden = true;
    receiveView.hidden = false;
    toMakeBtn.hidden = false;
    $('#rcvKicker').textContent = m.to ? (m.to + ' 님에게 도착한 도미노 편지') : '도미노 편지가 도착했어요';
    $('#rcvTitle').textContent = '첫 도미노를 톡, 밀어봐';
    document.title = '도미노 편지' + (m.from ? ' — ' + m.from + ' 님이 보냄' : '');
    rcvField.setModel(draft, false);
  }

  function openMake() {
    receiveView.hidden = true;
    receiveView.classList.remove('pushed');
    makeView.hidden = false;
    toMakeBtn.hidden = true;
    letterCard.hidden = true;
    letterCard.classList.remove('show');
    document.title = '도미노 글자 편지 — 톡 밀면 열리는 편지';
    mkField.setModel(draft, false);
    mkField.reset(false);
    previewNote.textContent = '받는 사람에게 보이는 그대로예요';
    previewBtn.querySelector('.push-ico').textContent = '👆';
    previewBtn.lastChild.textContent = ' 미리 밀어보기';
    if (location.protocol !== 'file:') {
      try {
        var u = new URL(location.href);
        if (u.search || u.hash) history.replaceState(null, '', u.pathname);
      } catch (e) { }
    }
  }

  function startReceive() {
    if (receiveView.hidden) return;
    if (rcvField.done) return;
    pushBtn.blur();
    rcvField.run();
  }

  pushBtn.addEventListener('click', startReceive);
  rcvStage.addEventListener('click', function () { startReceive(); });
  rcvStage.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startReceive(); }
  });

  $('#againBtn').addEventListener('click', function () {
    Sfx.ensure(); Sfx.ui();
    receiveView.classList.remove('pushed');
    pushBtn.hidden = false;
    $('#rcvHint').hidden = false;
    letterCard.classList.remove('show');
    setTimeout(function () { letterCard.hidden = true; }, 220);
    rcvField.reset(false);
  });
  $('#makeBtn').addEventListener('click', function () {
    Sfx.ensure(); Sfx.ui();
    openMake();
  });
  toMakeBtn.addEventListener('click', function () {
    Sfx.ensure(); Sfx.ui();
    openMake();
  });
  var brandHome = $('#brandHome');
  if (brandHome) brandHome.addEventListener('click', function (e) {
    if (!receiveView.hidden) { e.preventDefault(); openMake(); }
  });

  /* ── 소리 토글 ── */
  var muteBtn = $('#muteBtn');
  function paintMute() {
    muteBtn.setAttribute('aria-pressed', Sfx.isMuted() ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', Sfx.isMuted() ? '소리 켜기' : '소리 끄기');
  }
  muteBtn.addEventListener('click', function () {
    Sfx.ensure();
    Sfx.setMuted(!Sfx.isMuted());
    paintMute();
    if (!Sfx.isMuted()) Sfx.ui();
    toast(Sfx.isMuted() ? '소리를 껐어요' : '소리를 켰어요');
  });

  /* ── 만드는 사람 화면 ── */
  var phraseInput = $('#phraseInput');
  var bodyInput = $('#bodyInput');
  var toInput = $('#toInput');
  var fromInput = $('#fromInput');
  var themeRow = $('#themeRow');
  var linkBox = $('#linkBox');
  var linkOut = $('#linkOut');

  THEMES.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(draft.theme === t.id));
    b.setAttribute('data-theme', t.id);
    b.style.setProperty('--a', t.a);
    b.style.setProperty('--b', t.b);
    b.style.setProperty('--c', t.c);
    var sw = document.createElement('span');
    sw.className = 'sw';
    sw.setAttribute('aria-hidden', 'true');
    var lb = document.createElement('span');
    lb.textContent = t.label;
    b.appendChild(sw);
    b.appendChild(lb);
    b.addEventListener('click', function () {
      draft.theme = t.id;
      Array.prototype.forEach.call(themeRow.children, function (x) {
        x.setAttribute('aria-checked', String(x === b));
      });
      mkField.stage.setAttribute('data-theme', t.id);
      Sfx.ensure(); Sfx.ui();
      syncPreview(true);
    });
    themeRow.appendChild(b);
  });

  var chipsWrap = $('#phraseChips');
  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = p;
    b.addEventListener('click', function () {
      draft.phrase = p;
      phraseInput.value = p;
      paintCounts();
      Sfx.ensure(); Sfx.ui();
      syncPreview(true);
    });
    chipsWrap.appendChild(b);
  });

  function paintCounts() {
    $('#phraseCount').textContent = phraseInput.value.length + ' / 12';
    $('#bodyCount').textContent = bodyInput.value.length + ' / 200';
  }

  var previewTimer = null;
  function syncPreview(reset) {
    draft.to = toInput.value;
    draft.from = fromInput.value;
    draft.phrase = phraseInput.value;
    draft.body = bodyInput.value;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      mkField.setModel({
        to: draft.to, from: draft.from,
        phrase: draft.phrase || FALLBACK_PHRASE,
        body: draft.body, theme: draft.theme
      }, false);
      mkField.reset(false);
      previewNote.textContent = '받는 사람에게 보이는 그대로예요';
      previewBtn.querySelector('.push-ico').textContent = '👆';
      previewBtn.lastChild.textContent = ' 미리 밀어보기';
    }, reset ? 0 : 140);
  }

  [phraseInput, bodyInput, toInput, fromInput].forEach(function (el) {
    el.addEventListener('input', function () {
      if (el === phraseInput || el === bodyInput) paintCounts();
      syncPreview(false);
      if (!linkBox.hidden) linkBox.hidden = true;
    });
  });
  phraseInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); phraseInput.blur(); }
  });

  previewBtn.addEventListener('click', function () {
    Sfx.ensure();
    mkField.run();
  });
  mkStage.addEventListener('click', function () { Sfx.ensure(); mkField.run(); });

  function makeLink() {
    var m = normModel({
      t: toInput.value, f: fromInput.value,
      p: phraseInput.value || FALLBACK_PHRASE,
      b: bodyInput.value, c: draft.theme
    });
    var base = location.origin + location.pathname;
    if (location.protocol === 'file:') base = 'https://lookbw2010.github.io/domino-letter/';
    return base.replace(/[?#].*$/, '') + '?t=' + encodeModel(m);
  }

  $('#makeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    Sfx.ensure();
    if (!phraseInput.value.trim()) {
      toast('도미노 문구를 먼저 적어주세요');
      return;
    }
    var url = makeLink();
    linkOut.value = url;
    linkBox.hidden = false;
    copyText(url).then(function (ok) {
      if (ok) {
        Sfx.ui();
        toast('링크를 복사했어요. 붙여넣기만 하면 돼요 ✓');
      } else {
        toast('자동 복사가 막혀 있어요. 아래 링크를 길게 눌러 복사해 주세요');
      }
    });
  });

  var shareBtn = $('#shareBtn');
  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      Sfx.ensure();
      if (!phraseInput.value.trim()) { toast('도미노 문구를 먼저 적어주세요'); return; }
      var url = makeLink();
      linkOut.value = url;
      linkBox.hidden = false;
      navigator.share({
        title: '도미노 글자 편지',
        text: (toInput.value ? toInput.value + ' 님에게 ' : '') + '도미노 편지가 도착했어요. 밀어서 열어봐요!',
        url: url
      }).then(function () { Sfx.ui(); }, function () { });
    });
  }

  /* ── 첫 터치에서 소리 준비 ── */
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      Sfx.ensure();
      document.removeEventListener(ev, once);
    }, { once: true, passive: true });
  });

  /* ── 크기 변화 ── */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!receiveView.hidden && (rcvStage.clientWidth !== rcvField.builtW || rcvStage.clientHeight !== rcvField.builtH)) {
        rcvField.build(rcvField.done);
      }
      if (!makeView.hidden && (mkStage.clientWidth !== mkField.builtW || mkStage.clientHeight !== mkField.builtH)) {
        mkField.build(false);
      }
    }, 180);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 260);
  });

  /* ══════════════════════ 시작 ══════════════════════ */
  paintMute();
  phraseInput.value = draft.phrase;
  bodyInput.value = draft.body;
  paintCounts();

  var token = null;
  try {
    var q = new URLSearchParams(location.search).get('t');
    if (q) token = q;
    else if (location.hash && location.hash.length > 2) {
      var h = location.hash.replace(/^#/, '');
      token = h.indexOf('t=') === 0 ? h.slice(2) : h;
    }
  } catch (e) { }

  if (token) {
    var got = decodeModel(token);
    if (got) {
      openReceive(got);
    } else {
      openMake();
      setTimeout(function () { toast('링크를 읽지 못했어요. 새로 만들어 보내주세요'); }, 400);
    }
  } else {
    openMake();
  }

  if (window.requestAnimationFrame) {
    requestAnimationFrame(function () {
      if (!makeView.hidden) mkField.build(false);
      if (!receiveView.hidden) rcvField.build(false);
    });
  }
})();
