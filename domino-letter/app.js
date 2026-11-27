/* 오늘의 한 줌 — 3D 글자 블록 탑
 * 서버 없이 동작합니다. 문구·편지는 공유 링크(?m=...) 안에 담깁니다.
 *  - 탑: 알록달록한 3D 큐브 글자 블록이 아슬아슬 쌓인 상태(글자는 랜덤 셔플 + 위장 글자)
 *  - 터치: 블록이 와르르 무너진 뒤 황금빛과 함께 한 줄로 정렬되어 숨은 문구가 완성됩니다.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var r2 = function (n) { return Math.round(n * 100) / 100; };

  /* ══════════════════════ 소리 (Web Audio) ══════════════════════ */
  var Sfx = (function () {
    var ctx = null, master = null, muted = false;
    try { muted = localStorage.getItem('bt-muted') === '1'; } catch (e) { }

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } }
        return ctx;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      return ctx;
    }

    function setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('bt-muted', muted ? '1' : '0'); } catch (e) { }
      if (master) master.gain.value = muted ? 0 : 0.9;
    }

    function noiseBuffer(dur) {
      var rate = ctx.sampleRate;
      var len = Math.max(1, Math.round(rate * dur));
      var buf = ctx.createBuffer(1, len, rate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        var e = 1 - i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(e, 3.4);
      }
      return buf;
    }

    /* 나무·아크릴 블록이 딱 부딪히는 소리 (delayMs 뒤에) */
    function clackAt(delayMs, pitch, vol) {
      if (!ctx || muted) return;
      var t = ctx.currentTime + Math.max(0, delayMs) / 1000;
      var p = pitch || 1250;
      var v = vol == null ? 1 : vol;

      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.085);
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = p;
      bp.Q.value = 1.7;
      var g = ctx.createGain();
      g.gain.value = 0.4 * v;
      src.connect(bp); bp.connect(g); g.connect(master);
      src.start(t);

      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p * 0.26, t);
      osc.frequency.exponentialRampToValueAtTime(p * 0.13, t + 0.085);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.006);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g2); g2.connect(master);
      osc.start(t); osc.stop(t + 0.16);
    }

    /* 톡, 누르는 손맛 */
    function thunk() {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.001;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(215, t);
      osc.frequency.exponentialRampToValueAtTime(68, t + 0.2);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.34, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.3);
      clackAt(0, 820, 0.75);
    }

    /* 줄 맞출 때 또각 (음이 올라간다) */
    function tickAt(delayMs, freq, vol) {
      if (!ctx || muted) return;
      var t = ctx.currentTime + Math.max(0, delayMs) / 1000;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13 * (vol == null ? 1 : vol), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.24);
      clackAt(delayMs, freq * 2.1, 0.22);
    }

    /* 완성의 종소리 */
    function chimeAt(delayMs) {
      if (!ctx || muted) return;
      var t0 = ctx.currentTime + Math.max(0, delayMs) / 1000;
      [783.99, 1046.5, 1318.51, 1567.98].forEach(function (f, i) {
        var t = t0 + i * 0.075;
        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.14 / (1 + i * 0.4), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 1.05);
      });
    }

    function ui() {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.001;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.05);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.12);
    }

    return {
      ensure: ensure, setMuted: setMuted, isMuted: function () { return muted; },
      clackAt: clackAt, thunk: thunk, tickAt: tickAt, chimeAt: chimeAt, ui: ui
    };
  })();

  /* ══════════════════════ 모델 · 링크 ══════════════════════ */
  var FALLBACK = 'HAPPY DAY';
  var DEMO = {
    to: '', from: '',
    phrase: 'HAPPY DAY',
    body: '오늘 하루도 수고 많았어요.\n블록을 정리하면, 내가 숨겨 둔 마음이 보일 거예요.'
  };

  function cut(s, n) {
    s = String(s == null ? '' : s);
    s = s.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.slice(0, n);
  }
  function normModel(o) {
    o = o && typeof o === 'object' ? o : {};
    var phrase = String(o.p == null ? '' : o.p).replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12);
    return {
      to: cut(o.t, 16),
      from: cut(o.f, 16),
      phrase: phrase,
      body: String(o.b == null ? '' : o.b).replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, 200)
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
    return b64url(JSON.stringify({ v: 1, t: m.to, f: m.from, p: m.phrase, b: m.body }));
  }
  function decodeToken(tok) {
    try {
      var o = JSON.parse(unb64url(tok));
      if (!o || typeof o !== 'object') return null;
      var m = normModel({ t: o.t, f: o.f, p: o.p, b: o.b });
      if (!m.phrase && !m.body) return null;
      if (!m.phrase) { m.phrase = FALLBACK; }
      return m;
    } catch (e) { return null; }
  }

  /* ══════════════════════ 블록 색 ══════════════════════ */
  var PALETTE = [
    { h: 265, s: 76, l: 58 },  /* 퍼플 */
    { h: 339, s: 76, l: 55 },  /* 핑크 */
    { h: 24, s: 88, l: 55 },   /* 오렌지 */
    { h: 176, s: 64, l: 44 },  /* 틸 */
    { h: 214, s: 78, l: 54 },  /* 블루 */
    { h: 43, s: 88, l: 53 },   /* 앰버 */
    { h: 96, s: 52, l: 45 },   /* 그린 */
    { h: 322, s: 68, l: 50 },  /* 마젠타 */
    { h: 196, s: 74, l: 48 },  /* 스카이 */
    { h: 8, s: 66, l: 53 },    /* 레드 */
    { h: 30, s: 46, l: 48 }    /* 브라운 */
  ];
  function hsl(h, s, l) {
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(92, l));
    return 'hsl(' + Math.round(h) + ' ' + Math.round(s) + '% ' + Math.round(l) + '%)';
  }
  function faceColors(p) {
    return {
      '--cFront': hsl(p.h, p.s, p.l),
      '--cLow': hsl(p.h, p.s * 1.02, p.l - 7),
      '--cTop': hsl(p.h, p.s * 0.95, p.l + 12),
      '--cTop2': hsl(p.h, p.s * 0.9, p.l + 19),
      '--cSide': hsl(p.h, p.s, p.l - 15),
      '--cBack': hsl(p.h, p.s * 1.04, p.l - 10),
      '--cBot': hsl(p.h, p.s, p.l - 26)
    };
  }

  /* ══════════════════════ 글자 준비 ══════════════════════ */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var LATIN_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var HANGUL_POOL = '가나다라마바사아자차카타파하거고구기노누니도두드미보부비서세소수시오우유주지초코토포호루롤봄별솔한줌빛꿈숨뜻결길밤낮';

  function isLatin(ch) { return /[A-Za-z]/.test(ch); }

  /* 위장 글자 — 결과 문구를 미리 상상할 수 없게 섞는다 */
  function makeDecoys(chars) {
    var latin = isLatin(chars[0] || 'A');
    var total = Math.min(13, Math.max(9, Math.round(chars.length * 1.55)));
    var need = Math.max(0, total - chars.length);
    if (!need) return [];
    var used = {};
    chars.forEach(function (c) { used[c.toUpperCase()] = 1; });
    var pool = (latin ? LATIN_POOL : HANGUL_POOL).split('').filter(function (c) {
      return !used[c.toUpperCase()];
    });
    shuffle(pool);
    return pool.slice(0, need);
  }

  /* 완성 줄 배치 계산 */
  function rowLayout(n, W) {
    var pad = 16, gap = 3, maxS = 62, minS = 32;
    var rows = n <= 8 ? 1 : (n <= 16 ? 2 : 3);
    var per = Math.ceil(n / rows);
    var s = Math.floor((W - pad * 2 - gap * (per - 1)) / per);
    s = Math.max(minS, Math.min(maxS, s));
    return { rows: rows, per: per, s: s, gap: gap };
  }

  function tfv(o) {
    return 'translate3d(' + r2(o.x) + 'px,' + r2(o.y) + 'px,' + r2(o.z) + 'px)' +
      ' rotateX(' + r2(o.rx) + 'deg) rotateY(' + r2(o.ry) + 'deg) rotateZ(' + r2(o.rz) + 'deg)' +
      ' scale3d(' + r2(o.k) + ',' + r2(o.k) + ',' + r2(o.k) + ')';
  }

  /* ══════════════════════ 반짝이는 티끌 ══════════════════════ */
  var DUST_COLS = ['#FFD873', '#FFB443', '#FF8FC0', '#8FD8FF', '#C8A6FF', '#9CFFD0', '#FFF3C9'];
  function fillDust(host) {
    if (!host) return;
    host.textContent = '';
    for (var i = 0; i < 20; i++) {
      var d = document.createElement('i');
      var size = 2 + Math.random() * 4;
      d.style.width = size.toFixed(1) + 'px';
      d.style.height = size.toFixed(1) + 'px';
      d.style.left = (7 + Math.random() * 86).toFixed(1) + '%';
      d.style.top = (5 + Math.random() * 62).toFixed(1) + '%';
      d.style.background = DUST_COLS[i % DUST_COLS.length];
      d.style.color = DUST_COLS[i % DUST_COLS.length];
      d.style.animationDelay = (Math.random() * 3.4).toFixed(2) + 's';
      d.style.animationDuration = (2.6 + Math.random() * 2.2).toFixed(2) + 's';
      host.appendChild(d);
    }
    host.classList.add('on');
  }

  /* ══════════════════════ 탑 ══════════════════════ */
  function Tower(opts) {
    this.scene = opts.scene;
    this.stage = opts.stage || opts.scene.parentNode;
    this.finger = opts.finger || null;
    this.fx = opts.fx || null;
    this.dust = opts.dust || null;
    this.vFit = opts.vFit || 0.80;
    this.onDone = opts.onDone || function () { };
    this.blocks = [];
    this.state = 'empty';
    this.anims = [];
    this.timers = [];
    this.W = 0; this.H = 0; this.S = 0; this.fs = 0;
    this.row = null;
  }

  Tower.prototype.later = function (fn, ms) {
    var id = setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  };
  Tower.prototype.clearTimers = function () {
    this.timers.forEach(function (t) { clearTimeout(t); });
    this.timers = [];
  };
  Tower.prototype.stopAnims = function () {
    this.anims.forEach(function (a) { try { a.cancel(); } catch (e) { } });
    this.anims = [];
  };

  Tower.prototype.build = function (model) {
    this.model = model;
    this.stopAnims();
    this.clearTimers();
    var W = this.scene.clientWidth;
    var H = this.scene.clientHeight;
    if (!W || !H) { this.state = 'empty'; return; }
    this.W = W; this.H = H;

    var phrase = String((model && model.phrase) || '').trim();
    var chars = phrase.replace(/\s+/g, '').split('');
    if (!chars.length) chars = FALLBACK.replace(/\s+/g, '').split('');
    if (chars.length > 12) chars = chars.slice(0, 12);
    this.chars = chars;

    /* 1) 완성 줄 크기 */
    var rl = rowLayout(chars.length, W);
    this.row = rl;

    /* 2) 탑 줄 구성 (위에서부터 1 · 2 · 2 · 3 …) */
    var items = [];
    chars.forEach(function (ch, i) { items.push({ ch: ch, ci: i, decoy: false }); });
    makeDecoys(chars).forEach(function (ch) { items.push({ ch: ch, ci: -1, decoy: true }); });
    shuffle(items);

    var n = items.length;
    var sizes = [], left = n;
    if (n >= 7) { sizes.push(1); left = n - 1; }
    while (left > 0) {
      var s = (left >= 3 && Math.random() < 0.42) ? 3 : (left >= 2 ? 2 : 1);
      sizes.push(s);
      left -= s;
    }
    var rows = sizes.length;

    /* 3) 블록 크기 */
    var sV = (H * this.vFit) / (1 + (rows - 1) * 0.90);
    var sW = W * 0.315;
    var S = Math.round(Math.max(30, Math.min(96, Math.min(sV, sW))));
    var k = rl.s / S;
    var fs = Math.min(S * 0.64, Math.max(26 / k + 1, S * 0.54));
    this.S = S; this.fs = fs;

    /* 4) 위치 */
    var pitch = S * 0.90;
    var totalH = S + (rows - 1) * pitch;
    var yTop = -totalH / 2 + S / 2;
    var yOffset = H * 0.02;                 /* 탑의 중심을 무대 가운데보다 살짝 아래로 */
    var step = S * 0.92;
    var leanDir = Math.random() < 0.5 ? -1 : 1;
    var lean = leanDir * (0.05 + Math.random() * 0.10);

    var blocks = [], idx = 0;
    for (var r = 0; r < rows; r++) {
      var cnt = sizes[r];
      var y = yTop + r * pitch + yOffset;
      var rowLean = lean * (rows > 1 ? r / (rows - 1) : 0) * S;
      var alt = (r % 2 ? 1 : -1) * S * 0.13;
      for (var i = 0; i < cnt; i++) {
        if (idx >= items.length) break;
        var it = items[idx++];
        blocks.push({
          ch: it.ch, ci: it.ci, decoy: it.decoy,
          x: (i - (cnt - 1) / 2) * step + rowLean + alt + (Math.random() - 0.5) * S * 0.10,
          y: y + (Math.random() - 0.5) * S * 0.05,
          z: (Math.random() - 0.5) * 8,
          rx: -8 - Math.random() * 7,
          ry: -5 - Math.random() * 11,
          rz: (Math.random() - 0.5) * 10 + (r % 2 ? 1.4 : -1.4),
          k: 1
        });
      }
    }

    /* 5) DOM */
    var scene = this.scene;
    scene.textContent = '';
    var pal = shuffle(PALETTE.slice());
    var frag = document.createDocumentFragment();
    blocks.forEach(function (b, i) {
      var el = document.createElement('div');
      el.className = 'blk';
      el.style.setProperty('--s', String(S));
      el.style.setProperty('--fs', String(r2(fs)));
      var cols = faceColors(pal[i % pal.length]);
      Object.keys(cols).forEach(function (key) { el.style.setProperty(key, cols[key]); });
      ['front', 'top', 'right', 'left', 'bottom', 'back'].forEach(function (f) {
        var face = document.createElement('div');
        face.className = 'face f-' + f;
        if (f === 'front') {
          var g = document.createElement('span');
          g.className = 'glyph';
          g.textContent = b.ch;
          face.appendChild(g);
        }
        el.appendChild(face);
      });
      el.style.transform = tfv(b);
      b.el = el;
      frag.appendChild(el);
    });
    scene.appendChild(frag);

    this.blocks = blocks;
    this.state = 'stack';
    if (this.dust) { this.dust.classList.remove('on'); this.dust.textContent = ''; }
    var gEl = $('.glow', this.stage), fEl = $('.floor', this.stage);
    if (gEl) gEl.classList.remove('on');
    if (fEl) fEl.classList.remove('on');
    this.placeFinger();
    if (this.finger) this.finger.classList.add('on');
  };

  /* 손가락 힌트를 맨 아래 블록 위에 */
  Tower.prototype.placeFinger = function () {
    if (!this.finger) return;
    var low = null;
    this.blocks.forEach(function (b) { if (!low || b.y > low.y) low = b; });
    if (!low) return;
    var sr = this.stage.getBoundingClientRect();
    var br = low.el.getBoundingClientRect();
    var x = br.left + br.width * 0.62 - sr.left;
    var y = br.top + br.height * 0.62 - sr.top;
    x = Math.max(52, Math.min(sr.width - 52, x));
    y = Math.max(52, Math.min(sr.height - 52, y));
    this.finger.style.left = r2(x) + 'px';
    this.finger.style.top = r2(y) + 'px';
  };

  Tower.prototype.hideHint = function () {
    if (this.finger) this.finger.classList.remove('on');
  };

  /* ── 무너뜨리기 ── */
  Tower.prototype.collapse = function () {
    if (this.state !== 'stack') return;
    var self = this;
    this.state = 'falling';
    this.stopAnims();
    this.hideHint();

    var W = this.W, H = this.H, S = this.S;
    var floor = H * 0.40;
    var order = this.blocks.slice().sort(function (a, b) { return b.y - a.y; });
    var FALL = reduceMotion ? 220 : 540;
    var STAG = reduceMotion ? 12 : 40;
    var n = order.length;

    order.forEach(function (b, i) {
      var delay = i * STAG;
      var ang = (Math.random() < 0.5 ? -1 : 1) * (42 + Math.random() * 82);
      var tx = b.x + (Math.random() - 0.5) * W * 0.66;
      tx = Math.max(-W * 0.45, Math.min(W * 0.45, tx));
      var ty = floor + (Math.random() - 0.5) * S * 0.5;
      var tz = b.z + (Math.random() - 0.5) * 70;
      var trx = b.rx + (Math.random() - 0.5) * 44;
      var try_ = b.ry + (Math.random() - 0.5) * 44;
      var trz = b.rz + ang;
      var tk = b.k * (0.96 + Math.random() * 0.07);

      var land = { x: tx, y: ty, z: tz, rx: trx, ry: try_, rz: trz, k: tk };
      var squash = { x: tx, y: ty + S * 0.06, z: tz, rx: trx + 3, ry: try_, rz: trz + 3, k: tk };
      var bounce = { x: tx, y: ty - S * 0.11, z: tz, rx: trx - 7, ry: try_, rz: trz - 5, k: tk };
      b.land = land;

      if (reduceMotion) {
        b.el.style.transform = tfv(land);
        b.el.style.opacity = '0';
        return;
      }
      var anim = b.el.animate([
        { transform: tfv(b), opacity: 1, offset: 0, easing: 'cubic-bezier(.55,0,.9,.45)' },
        { transform: tfv(squash), opacity: 1, offset: 0.66 },
        { transform: tfv(bounce), opacity: 1, offset: 0.84, easing: 'cubic-bezier(.3,.9,.4,1)' },
        { transform: tfv(land), opacity: 1, offset: 1 }
      ], { duration: FALL, delay: delay, fill: 'both', easing: 'linear' });
      self.anims.push(anim);
      Sfx.clackAt(delay + FALL * 0.86, 850 + Math.random() * 820, 0.85);
    });

    var fallEnd = (n - 1) * STAG + FALL;
    this.later(function () {
      self.stopAnims();
      order.forEach(function (b) {
        if (!b.land) return;
        b.x = b.land.x; b.y = b.land.y; b.z = b.land.z;
        b.rx = b.land.rx; b.ry = b.land.ry; b.rz = b.land.rz; b.k = b.land.k;
        b.el.style.transform = tfv(b);
        b.el.style.opacity = '1';
      });
      self.later(function () { self.arrange(); }, reduceMotion ? 40 : 90);
    }, fallEnd + 20);
  };

  /* ── 한 줄로 정렬 ── */
  Tower.prototype.arrange = function () {
    var self = this;
    var W = this.W, H = this.H, S = this.S;
    var rl = this.row, sRow = rl.s, gap = rl.gap, per = rl.per, rows = rl.rows;
    var kRow = sRow / S;
    var rowGap = 10;
    var groupH = rows * sRow + (rows - 1) * rowGap;
    var midY = H * 0.24 - (groupH - sRow) / 2;
    var DUR = reduceMotion ? 120 : 460;
    var STAG = reduceMotion ? 6 : 52;
    var lead = reduceMotion ? 10 : 120;

    var msgs = this.blocks.filter(function (b) { return !b.decoy; })
      .sort(function (a, b) { return a.ci - b.ci; });

    /* 위장 블록은 아래로 흘러 사라진다 */
    this.blocks.filter(function (b) { return b.decoy; }).forEach(function (b, i) {
      if (reduceMotion) { b.el.style.opacity = '0'; return; }
      var anim = b.el.animate([
        { transform: tfv(b), opacity: 1, offset: 0, easing: 'cubic-bezier(.3,0,.7,1)' },
        {
          transform: tfv({
            x: b.x + (Math.random() - 0.5) * W * 0.42,
            y: b.y + H * 0.30, z: b.z - 140,
            rx: b.rx + 46, ry: b.ry + 20, rz: b.rz + 120, k: b.k * 0.66
          }), opacity: 0, offset: 1
        }
      ], { duration: 520, delay: i * 18, fill: 'both', easing: 'linear' });
      self.anims.push(anim);
    });

    /* 진짜 문구 블록은 왼쪽부터 차례로 자리를 찾는다 */
    msgs.forEach(function (b, i) {
      var r = Math.floor(i / per);
      var ci = i % per;
      var cnt = Math.min(per, msgs.length - r * per);
      var rowW = cnt * sRow + (cnt - 1) * gap;
      var x = -rowW / 2 + sRow / 2 + ci * (sRow + gap);
      var y = midY + r * (sRow + rowGap);
      var slot = { x: x, y: y, z: 0, rx: -9, ry: 0, rz: 0, k: kRow };
      b.slot = slot;
      var delay = lead + i * STAG;

      if (reduceMotion) {
        b.x = slot.x; b.y = slot.y; b.z = 0; b.rx = -9; b.ry = 0; b.rz = 0; b.k = kRow;
        b.el.style.transform = tfv(b);
        return;
      }
      var lift = { x: x, y: y - sRow * 0.42, z: 40, rx: -14, ry: 0, rz: (i % 2 ? 5 : -5), k: kRow * 1.06 };
      var anim = b.el.animate([
        { transform: tfv(b), offset: 0, easing: 'cubic-bezier(.35,0,.3,1)' },
        { transform: tfv(lift), offset: 0.58, easing: 'cubic-bezier(.35,0,.3,1)' },
        { transform: tfv(slot), offset: 1 }
      ], { duration: DUR, delay: delay, fill: 'both', easing: 'linear' });
      self.anims.push(anim);
      Sfx.tickAt(delay + DUR * 0.82, 587.33 * Math.pow(1.0595, i * 2), 0.9);
    });

    var last = (msgs.length - 1) * STAG + DUR + lead;

    /* 광채 · 꽃가루 */
    this.later(function () {
      var glow = $('#glow', self.stage) || $('#mkGlow', self.stage);
      var fl = $('#floor', self.stage) || $('#mkFloor', self.stage);
      if (glow) glow.classList.add('on');
      if (fl) fl.classList.add('on');
      if (self.fx) self.fx.burst(W / 2, H / 2 + midY + sRow * 0.2, 78);
    }, Math.max(60, lead + 200));

    this.later(function () {
      self.stopAnims();
      self.blocks.forEach(function (b) {
        if (b.decoy) { b.el.style.opacity = '0'; b.el.style.display = 'none'; return; }
        if (!b.slot) return;
        b.x = b.slot.x; b.y = b.slot.y; b.z = 0;
        b.rx = -9; b.ry = 0; b.rz = 0; b.k = b.slot.k;
        b.el.style.transform = tfv(b);
        b.el.style.opacity = '1';
      });
      self.state = 'done';
      fillDust(self.dust);
      Sfx.chimeAt(0);
      try { if (navigator.vibrate) navigator.vibrate([8, 40, 14, 40, 26]); } catch (e) { }
      self.onDone(self.model);
    }, last + 140);
  };

  Tower.prototype.reset = function () {
    this.stopAnims();
    this.clearTimers();
    this.state = 'empty';
    this.build(this.model);
  };

  /* ══════════════════════ 꽃가루 ══════════════════════ */
  function FX(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.raf = 0;
    this.last = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.fit();
  }
  FX.prototype.fit = function () {
    var w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    this.w = w; this.h = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  FX.prototype.burst = function (cx, cy, count) {
    if (!this.ctx || reduceMotion) return;
    var cols = ['#FFD873', '#FFB443', '#FFF3C9', '#FF8FC0', '#8FD8FF', '#C8A6FF', '#9CFFD0'];
    for (var i = 0; i < count; i++) {
      var ang = (-Math.PI / 2) + (Math.random() - 0.5) * 2.3;
      var sp = 1.4 + Math.random() * 5.4;
      this.parts.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 18,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - Math.random() * 1.6,
        g: 0.055 + Math.random() * 0.06,
        life: 0,
        ttl: 70 + Math.random() * 70,
        size: 1.4 + Math.random() * 2.4,
        col: cols[(Math.random() * cols.length) | 0],
        spin: (Math.random() - 0.5) * 0.4
      });
    }
    this.start();
  };
  FX.prototype.start = function () {
    if (this.raf) return;
    var self = this;
    this.last = 0;
    var step = function (now) {
      if (!self.last) self.last = now;
      var dt = Math.min(3, (now - self.last) / 16.67);
      self.last = now;
      self.tick(dt);
      if (self.parts.length) self.raf = requestAnimationFrame(step);
      else { self.raf = 0; self.ctx.clearRect(0, 0, self.w, self.h); }
    };
    this.raf = requestAnimationFrame(step);
  };
  FX.prototype.tick = function (dt) {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    var keep = [];
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      p.life += dt;
      if (p.life > p.ttl) continue;
      p.vy += p.g * dt;
      p.vx *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var t = 1 - p.life / p.ttl;
      ctx.globalAlpha = Math.max(0, t * t);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + t * 0.7), 0, Math.PI * 2);
      ctx.fill();
      keep.push(p);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.parts = keep;
  };

  /* ══════════════════════ 화면 ══════════════════════ */
  var receiveView = $('#receiveView');
  var makeView = $('#makeView');
  var stageEl = $('#stage');
  var letterEl = $('#letter');
  var liveEl = $('#live');
  var soundBtn = $('#soundBtn');

  var rcvFx = new FX($('#fx'));
  var mkFx = new FX($('#mkFx'));

  var current = normModel({ t: DEMO.to, f: DEMO.from, p: DEMO.phrase, b: DEMO.body });

  var tower = new Tower({
    scene: $('#scene'), stage: stageEl, finger: $('#finger'),
    fx: rcvFx, dust: $('#dust'),
    onDone: function (model) {
      showLetter(model || current);
      $('#brandSub').textContent = '블록이 정리됐어요';
      letterEl.setAttribute('aria-label', '도착한 편지');
      liveEl.textContent = '블록이 정리되었습니다. 숨겨진 문구는 ' + ((model && model.phrase) || current.phrase) + ' 입니다.';
    }
  });

  var mkTower = new Tower({
    scene: $('#mkScene'), stage: $('#mkStage'), fx: mkFx, dust: $('#mkDust'), vFit: 0.72,
    onDone: function () {
      $('#mkNote').textContent = '이렇게 도착해요 ✓';
      $('#previewBtn').textContent = '↻ 다시 보기';
    }
  });

  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
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

  /* ── 편지 카드 ── */
  function showLetter(m) {
    var to = $('#lTo');
    var bits = [];
    if (m.to) bits.push(m.to + ' 님에게 도착한 한 줌');
    else bits.push('도착한 한 줌');
    if (m.from) bits.push(m.from + ' 님이 보냄');
    to.textContent = bits.join(' · ');

    $('#lPhrase').textContent = m.phrase || FALLBACK;
    var body = $('#lBody');
    body.textContent = m.body || '';
    body.hidden = !m.body;
    var sign = $('#lSign');
    sign.textContent = m.from ? '— ' + m.from + ' 드림' : '';
    sign.hidden = !m.from;

    receiveView.classList.add('done');
    var cta = $('#stackCta');
    if (cta) cta.hidden = true;
    letterEl.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { letterEl.classList.add('show'); });
    });
    setTimeout(function () {
      if (letterEl.getBoundingClientRect().bottom > window.innerHeight) {
        letterEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 320);
  }

  function hideLetter() {
    letterEl.classList.remove('show');
    receiveView.classList.remove('done');
    setTimeout(function () {
      letterEl.hidden = true;
      var cta = $('#stackCta');
      if (cta) cta.hidden = false;
    }, 240);
  }

  /* ── 탑 화면 ── */
  function openReceive(m, fromLink) {
    current = normModel({ t: m.to, f: m.from, p: m.phrase || FALLBACK, b: m.body });
    makeView.hidden = true;
    receiveView.hidden = false;
    letterEl.hidden = true;
    letterEl.classList.remove('show');
    receiveView.classList.remove('done');
    var cta0 = $('#stackCta');
    if (cta0) cta0.hidden = false;
    document.title = fromLink ? (current.phrase + ' — 오늘의 한 줌') : '오늘의 한 줌 — 3D 글자 블록 탑';
    $('#brandSub').textContent = '블록을 눌러 정리해보세요';
    setSoundBtn();
    requestAnimationFrame(function () {
      tower.build(current);
      rcvFx.fit();
    });
  }

  function tapStage() {
    if (tower.state !== 'stack') return;
    Sfx.ensure();
    Sfx.thunk();
    tower.collapse();
  }

  stageEl.addEventListener('click', function (e) {
    if (letterEl.contains(e.target)) return;
    tapStage();
  });
  stageEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapStage(); }
  });

  $('#againBtn').addEventListener('click', function () {
    Sfx.ensure(); Sfx.ui();
    hideLetter();
    $('#brandSub').textContent = '블록을 눌러 정리해보세요';
    tower.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#makeBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#ctaMake').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#toMakeBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#backBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openReceive(current, false); });

  /* ── 소리 토글 ── */
  function setSoundBtn() {
    soundBtn.setAttribute('aria-pressed', Sfx.isMuted() ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', Sfx.isMuted() ? '소리 켜기' : '소리 끄기');
  }
  soundBtn.addEventListener('click', function () {
    Sfx.ensure();
    Sfx.setMuted(!Sfx.isMuted());
    setSoundBtn();
    if (!Sfx.isMuted()) Sfx.ui();
    toast(Sfx.isMuted() ? '소리를 껐어요' : '소리를 켰어요');
  });

  /* ── 만들기 화면 ── */
  var phraseInput, bodyInput, toInput, fromInput, linkBox, linkOut;
  var draft = { to: '', from: '', phrase: 'HAPPY DAY', body: '' };

  function openMake() {
    receiveView.hidden = true;
    makeView.hidden = false;
    document.title = '3D 글자 블록 탑 — 만들기';
    window.scrollTo({ top: 0, behavior: 'auto' });
    /* 자동 focus 는 절대 하지 않는다 */
    requestAnimationFrame(function () {
      mkFx.fit();
      mkTower.build(normModel({ t: draft.to, f: draft.from, p: draft.phrase || FALLBACK, b: draft.body }));
      $('#previewBtn').textContent = '👆 미리 눌러보기';
      $('#mkNote').textContent = '받는 사람 화면 그대로';
    });
  }

  var PRESETS = ['HAPPY DAY', '고마워요', '사랑해요', '생일 축하해', '수고했어요', '잘 다녀와'];

  function initMake() {
    phraseInput = $('#phraseInput');
    bodyInput = $('#bodyInput');
    toInput = $('#toInput');
    fromInput = $('#fromInput');
    linkBox = $('#linkBox');
    linkOut = $('#linkOut');

    phraseInput.value = draft.phrase;
    bodyInput.value = draft.body;
    paintCounts();

    var chips = $('#phraseChips');
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = p;
      b.addEventListener('click', function () {
        phraseInput.value = p;
        draft.phrase = p;
        paintCounts();
        Sfx.ensure(); Sfx.ui();
        syncPreview(true);
      });
      chips.appendChild(b);
    });

    function paintCounts() {
      $('#phraseCount').textContent = phraseInput.value.length + ' / 12';
      $('#bodyCount').textContent = bodyInput.value.length + ' / 200';
    }
    window.__paintCounts = paintCounts;

    var timer = null;
    function syncPreview(now) {
      draft.to = toInput.value;
      draft.from = fromInput.value;
      draft.phrase = phraseInput.value;
      draft.body = bodyInput.value;
      clearTimeout(timer);
      timer = setTimeout(function () {
        mkTower.build(normModel({ t: draft.to, f: draft.from, p: draft.phrase || FALLBACK, b: draft.body }));
        $('#previewBtn').textContent = '👆 미리 눌러보기';
        $('#mkNote').textContent = '받는 사람 화면 그대로';
      }, now ? 0 : 180);
    }
    window.__syncPreview = function (now) { syncPreview(now); };

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

    $('#previewBtn').addEventListener('click', function () {
      Sfx.ensure();
      if (mkTower.state === 'done') {
        mkTower.reset();
        $('#previewBtn').textContent = '👆 미리 눌러보기';
        $('#mkNote').textContent = '받는 사람 화면 그대로';
      } else if (mkTower.state === 'stack') {
        Sfx.thunk();
        mkTower.collapse();
      }
    });
    $('#mkStage').addEventListener('click', function () {
      Sfx.ensure();
      if (mkTower.state === 'stack') { Sfx.thunk(); mkTower.collapse(); }
    });
    $('#mkStage').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        Sfx.ensure();
        if (mkTower.state === 'stack') { Sfx.thunk(); mkTower.collapse(); }
      }
    });

    $('#makeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      Sfx.ensure();
      var p = phraseInput.value.replace(/\s+/g, ' ').trim();
      if (p.length < 2) { toast('숨길 문구를 2자 이상 적어주세요'); return; }
      var url = makeLink();
      linkOut.value = url;
      linkBox.hidden = false;
      copyText(url).then(function (ok) {
        if (ok) { Sfx.ui(); toast('링크를 복사했어요. 붙여넣기만 하면 돼요 ✓'); }
        else { toast('자동 복사가 막혀 있어요. 아래 링크를 길게 눌러 복사해 주세요'); }
      });
    });

    var shareBtn = $('#shareBtn');
    if (navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () {
        Sfx.ensure();
        var p = phraseInput.value.replace(/\s+/g, ' ').trim();
        if (p.length < 2) { toast('숨길 문구를 2자 이상 적어주세요'); return; }
        var url = makeLink();
        linkOut.value = url;
        linkBox.hidden = false;
        navigator.share({
          title: '오늘의 한 줌 — 3D 글자 블록 탑',
          text: (toInput.value ? toInput.value + ' 님에게 ' : '') + '글자 블록 탑이 도착했어요. 눌러서 정리해봐요!',
          url: url
        }).then(function () { Sfx.ui(); }, function () { });
      });
    }
  }

  function makeLink() {
    var m = normModel({
      t: toInput.value, f: fromInput.value,
      p: phraseInput.value || FALLBACK,
      b: bodyInput.value
    });
    var base = location.origin + location.pathname;
    if (location.protocol === 'file:') base = 'https://lookbw2010.github.io/domino-letter/';
    return base.replace(/[?#].*$/, '') + '?m=' + encodeModel(m);
  }

  /* ── 첫 터치에서 오디오 준비 ── */
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, function once() {
      Sfx.ensure();
      document.removeEventListener(ev, once);
    }, { once: true, passive: true });
  });

  /* ── 크기 변화 ── */
  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      rcvFx.fit();
      mkFx.fit();
      if (!receiveView.hidden) {
        var wasDone = tower.state === 'done';
        tower.build(current);
        if (wasDone) instantDone(tower);
      }
      if (!makeView.hidden) mkTower.build(mkTower.model || normModel({ p: draft.phrase }));
    }, 220);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 300);
  });

  /* 크기 변경 뒤 완성 상태를 즉시 복원 */
  function instantDone(t) {
    var rl = t.row, sRow = rl.s, S = t.S, kRow = sRow / S;
    var groupH = rl.rows * sRow + (rl.rows - 1) * 10;
    var midY = t.H * 0.24 - (groupH - sRow) / 2;
    t.blocks.forEach(function (b) {
      if (b.decoy) { b.el.style.opacity = '0'; b.el.style.display = 'none'; return; }
      var r = Math.floor(b.ci / rl.per), ci = b.ci % rl.per;
      var cnt = Math.min(rl.per, t.chars.length - r * rl.per);
      var rowW = cnt * sRow + (cnt - 1) * rl.gap;
      b.x = -rowW / 2 + sRow / 2 + ci * (sRow + rl.gap);
      b.y = midY + r * (sRow + 10);
      b.z = 0; b.rx = -9; b.ry = 0; b.rz = 0; b.k = kRow;
      b.el.style.transform = tfv(b);
      b.el.style.opacity = '1';
    });
    t.state = 'done';
    var glow = $('#glow', t.stage) || $('#mkGlow', t.stage);
    if (glow) glow.classList.add('on');
    fillDust(t.dust);
  }

  /* ── 시작 ── */
  function boot() {
    initMake();
    setSoundBtn();
    var token = null;
    try {
      var q = new URLSearchParams(location.search);
      token = q.get('m') || q.get('t') || null;
      if (!token && location.hash && location.hash.length > 3) {
        var h = location.hash.replace(/^#/, '');
        token = h.indexOf('m=') === 0 ? h.slice(2) : (h.indexOf('t=') === 0 ? h.slice(2) : h);
      }
    } catch (e) { }

    var got = token ? decodeToken(token) : null;
    if (got) {
      openReceive(got, true);
    } else {
      if (token) setTimeout(function () { toast('링크를 읽지 못했어요. 새로 만들어 보내주세요'); }, 500);
      openReceive(DEMO, false);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
