/* 오늘의 한 줄 — 3D 글자 블록 탑 (Three.js 실시간 렌더링)
 *  - 탑: 둥근 모서리 3D 큐브 글자 블록이 아슬아슬 쌓인 상태(글자는 랜덤 셔플 + 위장 글자)
 *  - 터치: 블록이 물리적으로 쏟아진 뒤, 진짜 문구 블록만 황금빛 후광 속에서 한 줄로 정렬
 *  - 문구·편지는 서버 없이 공유 링크(?m=...) 안에만 담깁니다.
 */
(function () {
  'use strict';

  var THREE = window.THREE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInOutCubic = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOutQuint = function (t) { return 1 - Math.pow(1 - t, 5); };

  /* ══════════════════════ 소리 — 맑고 잔잔한 여운 ══════════════════════ */
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
      master.gain.value = muted ? 0 : 0.72;
      master.connect(ctx.destination);
      return ctx;
    }
    function setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('bt-muted', muted ? '1' : '0'); } catch (e) { }
      if (master) master.gain.value = muted ? 0 : 0.72;
    }
    function noise(dur) {
      var rate = ctx.sampleRate, len = Math.max(1, Math.round(rate * dur));
      var buf = ctx.createBuffer(1, len, rate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        var e = 1 - i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(e, 2.6);
      }
      return buf;
    }
    /* 블록이 닿는 소리 — 부드럽게 낮춰 잡은 톡 */
    function clack(delay, pitch, vol) {
      if (!ctx || muted) return;
      var t = ctx.currentTime + Math.max(0, delay) / 1000;
      var p = pitch || 900, v = (vol == null ? 1 : vol) * 0.5;
      var src = ctx.createBufferSource(); src.buffer = noise(0.09);
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p * 1.5; lp.Q.value = 0.7;
      var g = ctx.createGain(); g.gain.value = 0.16 * v;
      src.connect(lp); lp.connect(g); g.connect(master); src.start(t);
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(p * 0.32, t);
      osc.frequency.exponentialRampToValueAtTime(p * 0.16, t + 0.12);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(g2); g2.connect(master); osc.start(t); osc.stop(t + 0.24);
    }
    function thunk() {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.001;
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(176, t);
      osc.frequency.exponentialRampToValueAtTime(64, t + 0.3);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.46);
      clack(0, 700, 0.7);
    }
    /* 줄 맞출 때 — 아주 여린 또각 */
    function tick(delay, freq) {
      if (!ctx || muted) return;
      var t = ctx.currentTime + Math.max(0, delay) / 1000;
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.54);
    }
    /* 완성 — 튀지 않고 길게 남는 차임 */
    function chime(delay) {
      if (!ctx || muted) return;
      var base = ctx.currentTime + Math.max(0, delay) / 1000;
      var notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach(function (f, i) {
        var t = base + i * 0.17;
        var osc = ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045 / (1 + i * 0.35), t + 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 + i * 0.2);
        osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 3.0);
        var o2 = ctx.createOscillator(); o2.type = 'triangle';
        o2.frequency.setValueAtTime(f * 2.002, t);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.0001, t);
        g2.gain.linearRampToValueAtTime(0.008, t + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o2.connect(g2); g2.connect(master); o2.start(t); o2.stop(t + 1.7);
      });
      var pad = ctx.createOscillator(); pad.type = 'sine';
      pad.frequency.setValueAtTime(130.81, base);
      var gp = ctx.createGain();
      gp.gain.setValueAtTime(0.0001, base);
      gp.gain.linearRampToValueAtTime(0.05, base + 0.6);
      gp.gain.exponentialRampToValueAtTime(0.0001, base + 3.6);
      pad.connect(gp); gp.connect(master); pad.start(base); pad.stop(base + 3.8);
    }
    function ui() {
      if (!ctx || muted) return;
      var t = ctx.currentTime + 0.001;
      var osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(560, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.06);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + 0.16);
    }
    return {
      ensure: ensure, setMuted: setMuted, isMuted: function () { return muted; },
      clack: clack, thunk: thunk, tick: tick, chime: chime, ui: ui
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
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(tok) {
    var s = String(tok).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
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
      if (!m.phrase) m.phrase = FALLBACK;
      return m;
    } catch (e) { return null; }
  }

  /* ══════════════════════ 색 · 재질 ══════════════════════ */
  var PALETTE = [
    '#8A4DFF', /* 퍼플 */
    '#FF3D80', /* 핑크 */
    '#FF7A1F', /* 오렌지 */
    '#16BAB5', /* 틸 */
    '#2F7BE8', /* 블루 */
    '#FFBC26', /* 앰버 */
    '#63BC3C', /* 그린 */
    '#E23A56', /* 크림슨 */
    '#B87A42', /* 브라운 */
    '#33AED6', /* 스카이 */
    '#E8409A'  /* 마젠타 */
  ];
  var SPARK_COLORS = ['#FFD98A', '#FFC46B', '#FFA6CC', '#A8DBFF', '#CBB7FF', '#B6FFDF', '#FFF6DC'];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var LATIN_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var HANGUL_POOL = '가나다라마바사아자차카타파하거고구기노누니도두드미보부비서세소수시오우유주지초코토포호루롤봄별솔한줄빛꿈숨뜻결길밤낮꽃달새물바람';

  /* ══════════════════════ 텍스처 ══════════════════════ */
  function c2d(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function tex(canvas, srgb) {
    var t = new THREE.CanvasTexture(canvas);
    t.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }

  /* 글자 텍스처 — 굵고 또렷한 흰 글자, 살짝 눌린 그림자로 입체감 */
  function glyphTexture(glyph) {
    var S = 512;
    var c = c2d(S, S), g = c.getContext('2d');
    var fs = S * 0.70;
    g.font = '900 ' + fs + 'px "Noto Sans CJK KR","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    var cx = S / 2, cy = S * 0.47;

    /* 아래로 깔리는 부드러운 그림자 */
    g.save();
    g.filter = 'blur(' + Math.round(S * 0.012) + 'px)';
    g.fillStyle = 'rgba(0,0,0,0.26)';
    g.fillText(glyph, cx, cy + S * 0.014);
    g.restore();

    /* 글자 본체 */
    var grad = g.createLinearGradient(0, S * 0.2, 0, S * 0.82);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.62, '#FFFFFF');
    grad.addColorStop(1, '#F0F4FF');
    g.fillStyle = grad;
    g.strokeStyle = grad;
    g.lineWidth = fs * 0.03;
    g.fillText(glyph, cx, cy);
    g.strokeText(glyph, cx, cy);

    /* 윗면 살짝 반짝이는 하이라이트 */
    g.save();
    g.globalCompositeOperation = 'source-atop';
    var hi = g.createLinearGradient(0, S * 0.18, 0, S * 0.52);
    hi.addColorStop(0, 'rgba(226,240,255,0.55)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi;
    g.fillRect(0, 0, S, S);
    g.restore();

    return tex(c);
  }

  /* 환경 반사 — 부드러운 스튜디오 조명이 담긴 파노라마 */
  function envTexture() {
    var W = 1024, H = 512;
    var c = c2d(W, H), g = c.getContext('2d');
    var lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, '#4A5F80');
    lg.addColorStop(0.30, '#33415C');
    lg.addColorStop(0.58, '#1E2838');
    lg.addColorStop(0.80, '#141C29');
    lg.addColorStop(1, '#0E141E');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    function blob(x, y, r, col) {
      var rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    blob(300, 48, 300, 'rgba(255,255,255,1)');
    blob(800, 80, 250, 'rgba(255,244,226,0.9)');
    blob(60, 200, 200, 'rgba(190,215,255,0.55)');
    blob(980, 210, 230, 'rgba(255,205,160,0.42)');
    blob(520, 300, 340, 'rgba(120,155,210,0.30)');
    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* 부드러운 후광 · 빛살 */
  function glowTexture() {
    var S = 512;
    var c = c2d(S, S), g = c.getContext('2d');
    var cx = S / 2, cy = S * 0.58;
    g.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 48; i++) {
      var a = (i / 48) * Math.PI * 2 + rand(-0.05, 0.05);
      var len = S * rand(0.22, 0.44);
      var x2 = cx + Math.cos(a) * len, y2 = cy + Math.sin(a) * len * 0.62;
      var grd = g.createLinearGradient(cx, cy, x2, y2);
      grd.addColorStop(0, 'rgba(255,214,158,0.11)');
      grd.addColorStop(0.6, 'rgba(255,190,118,0.04)');
      grd.addColorStop(1, 'rgba(255,160,70,0)');
      g.strokeStyle = grd;
      g.lineWidth = S * rand(0.006, 0.020);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(x2, y2); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    var rg = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
    rg.addColorStop(0, 'rgba(255,250,236,0.60)');
    rg.addColorStop(0.10, 'rgba(255,238,200,0.52)');
    rg.addColorStop(0.26, 'rgba(255,206,132,0.30)');
    rg.addColorStop(0.52, 'rgba(255,176,92,0.11)');
    rg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(cx, cy, S * 0.5, 0, Math.PI * 2); g.fill();
    return tex(c);
  }

  /* 작은 다이아몬드 스파클 */
  function sparkTexture() {
    var S = 64, c = c2d(S, S), g = c.getContext('2d');
    var rg = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)');
    rg.addColorStop(0.4, 'rgba(255,255,255,0.20)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();

    g.translate(32, 32);
    var k = 15;
    var dg = g.createRadialGradient(0, 0, 0, 0, 0, k * 1.5);
    dg.addColorStop(0, 'rgba(255,255,255,1)');
    dg.addColorStop(0.62, 'rgba(255,255,255,0.96)');
    dg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = dg;
    g.beginPath();
    g.moveTo(0, -k); g.lineTo(k * 0.78, 0); g.lineTo(0, k); g.lineTo(-k * 0.78, 0);
    g.closePath(); g.fill();
    return tex(c);
  }

  /* 바닥 그림자 · 바닥 안개 */
  function softTex(inner, mid) {
    var S = 256, c = c2d(S, S), g = c.getContext('2d');
    var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, inner);
    rg.addColorStop(0.42, mid);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    return tex(c);
  }

  /* ══════════════════════ 둥근 상자 지오메트리 ══════════════════════ */
  function roundedBox(w, h, d, radius, seg) {
    var half = [w / 2, h / 2, d / 2];
    var r = Math.min(radius, Math.min(half[0], half[1], half[2]) * 0.98);
    seg = seg || 7;
    var pos = [], nor = [], uvs = [], idx = [];
    var FACES = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
    for (var fi = 0; fi < FACES.length; fi++) {
      var a = FACES[fi][0], s = FACES[fi][1];
      var u = (a + 1) % 3, v = (a + 2) % 3;
      var start = pos.length / 3;
      for (var i = 0; i <= seg; i++) {
        for (var j = 0; j <= seg; j++) {
          var p = [0, 0, 0];
          p[a] = s * half[a];
          p[u] = -half[u] + 2 * half[u] * (i / seg);
          p[v] = -half[v] + 2 * half[v] * (j / seg);
          var cq = [0, 0, 0];
          for (var k = 0; k < 3; k++) cq[k] = clamp(p[k], -(half[k] - r), half[k] - r);
          var nx = p[0] - cq[0], ny = p[1] - cq[1], nz = p[2] - cq[2];
          var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= len; ny /= len; nz /= len;
          pos.push(cq[0] + nx * r, cq[1] + ny * r, cq[2] + nz * r);
          nor.push(nx, ny, nz);
          uvs.push(i / seg, j / seg);
        }
      }
      for (var ii = 0; ii < seg; ii++) {
        for (var jj = 0; jj < seg; jj++) {
          var a0 = start + ii * (seg + 1) + jj;
          var b0 = a0 + 1, c0 = a0 + (seg + 1), d0 = c0 + 1;
          if (s > 0) idx.push(a0, b0, d0, a0, d0, c0);
          else idx.push(a0, d0, b0, a0, c0, d0);
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(idx);
    return geo;
  }

  /* ══════════════════════ 스파클 파티클 ══════════════════════ */
  function Sparks(max) {
    this.max = max;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: sparkTexture() }, uPx: { value: 600 } },
      vertexShader: [
        'attribute float aSize; attribute float aAlpha; attribute vec3 aColor;',
        'uniform float uPx;',
        'varying vec3 vColor; varying float vAlpha;',
        'void main(){',
        '  vColor = aColor; vAlpha = aAlpha;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize * uPx / max(0.1, -mv.z);',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'varying vec3 vColor; varying float vAlpha;',
        'void main(){',
        '  vec4 t = texture2D(uMap, gl_PointCoord);',
        '  if (t.a * vAlpha < 0.004) discard;',
        '  gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.items = [];
    for (var i = 0; i < max; i++) this.items.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, ttl: 1, size: 0.1, col: [1, 1, 1], g: 0.2 });
    this.cursor = 0;
    this.count = 0;
  }
  Sparks.prototype.spawn = function (o) {
    var it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    it.alive = true;
    it.x = o.x; it.y = o.y; it.z = o.z;
    it.vx = o.vx; it.vy = o.vy; it.vz = o.vz || 0;
    it.t = 0; it.ttl = o.ttl;
    it.size = o.size;
    it.col = o.col;
    it.g = o.g == null ? 0.16 : o.g;
    it.drag = o.drag == null ? 0.985 : o.drag;
    it.tw = o.twitch == null ? 0.5 : o.twitch;
  };
  Sparks.prototype.update = function (dt) {
    var n = 0;
    for (var i = 0; i < this.max; i++) {
      var it = this.items[i];
      if (!it.alive) { this.alpha[i] = 0; continue; }
      it.t += dt;
      if (it.t >= it.ttl) { it.alive = false; this.alpha[i] = 0; continue; }
      it.vy -= it.g * dt;
      var d = Math.pow(it.drag, dt * 60);
      it.vx *= d; it.vy *= d; it.vz *= d;
      /* 아주 느린 흔들림 — 떠오르는 티끌의 여유 */
      it.x += (it.vx + Math.sin(it.t * 0.9 + i) * 0.02 * it.tw) * dt;
      it.y += it.vy * dt;
      it.z += it.vz * dt;
      var k = it.t / it.ttl;
      var a = Math.min(1, k / 0.18) * Math.pow(1 - k, 1.7);
      this.pos[i * 3] = it.x; this.pos[i * 3 + 1] = it.y; this.pos[i * 3 + 2] = it.z;
      this.col[i * 3] = it.col[0]; this.col[i * 3 + 1] = it.col[1]; this.col[i * 3 + 2] = it.col[2];
      this.size[i] = it.size * (0.85 + 0.3 * Math.sin(it.t * 2.2 + i * 2.1));
      this.alpha[i] = a;
      n++;
    }
    this.count = n;
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
  };

  /* ══════════════════════ 무대 ══════════════════════ */
  function Stage(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.opts = opts;
    this.ok = false;
    this.blocks = [];
    this.state = 'empty';
    this.phaseT = 0;
    this.now = 0;
    this.sparks = null;
    this.glowOn = false;
    this.glowT = 0;
    this.burstPlan = [];
    this.nextAmbient = 0;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (e) { this.renderer = null; return; }
    if (!this.renderer || !this.renderer.getContext()) return;

    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070A11, 0.018);

    this.fov = 32;
    this.camZ = 17.4;
    this.cam = { lookY: 3.0, camY: 7.4, pitch: 0.26 };
    this.camTarget = { lookY: 3.0, camY: 7.4, pitch: 0.26 };
    this.camera = new THREE.PerspectiveCamera(this.fov, 0.65, 0.1, 120);
    this.camera.position.set(0, this.cam.camY, this.camZ);
    this.camera.lookAt(0, this.cam.lookY, 0);

    this.buildLights();
    this.buildFloor();
    this.sparks = new Sparks(300);
    this.scene.add(this.sparks.points);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.mirror = new THREE.Group();
    this.mirror.scale.y = -1;
    this.scene.add(this.mirror);

    this.glowGroup = new THREE.Group();
    this.scene.add(this.glowGroup);
    this.buildGlow();

    this.raycaster = new THREE.Raycaster();
    this.ok = true;
  }

  Stage.prototype.buildLights = function () {
    var s = this.scene;
    var hemi = new THREE.HemisphereLight(0xE9F1FF, 0x2C3648, 3.2);
    s.add(hemi);
    var amb = new THREE.AmbientLight(0xFFFFFF, 0.75);
    s.add(amb);

    var key = new THREE.DirectionalLight(0xFFF6EA, 2.9);
    key.position.set(2.6, 7.6, 9.0);
    s.add(key);

    var fill = new THREE.DirectionalLight(0xD7E4FF, 1.25);
    fill.position.set(-7.5, 3.2, 7.0);
    s.add(fill);
    this.fillLight = fill;

    var rim = new THREE.DirectionalLight(0xDCE8FF, 1.25);
    rim.position.set(-3.5, 5.0, -7.0);
    s.add(rim);

    var warm = new THREE.PointLight(0xFFB35E, 0, 14, 2);
    warm.position.set(0, 1.6, -1.8);
    this.warmLight = warm;
    s.add(warm);

    var under = new THREE.PointLight(0xFFC98A, 0, 8, 2);
    under.position.set(0, 0.15, 2.4);
    this.underLight = under;
    s.add(under);

    var pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    var rt = pmrem.fromEquirectangular(envTexture());
    s.environment = rt.texture;
    this.envRT = rt;
    pmrem.dispose();
  };

  Stage.prototype.buildFloor = function () {
    /* 바닥에 번지는 은은한 빛무리 */
    var poolTex = softTex('rgba(255,196,120,0.30)', 'rgba(255,170,90,0.10)');
    var poolMat = new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
    });
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.4), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.006, -0.2);
    pool.renderOrder = 5;
    this.scene.add(pool);
    this.pool = pool;
    this.poolMat = poolMat;
  };

  Stage.prototype.buildGlow = function () {
    var mat = new THREE.SpriteMaterial({
      map: glowTexture(), transparent: true, opacity: 0,
      depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, color: 0xFFFFFF
    });
    var sp = new THREE.Sprite(mat);
    sp.scale.set(16, 7.6, 1);
    sp.position.set(0, 1.0, -2.05);
    sp.renderOrder = 6;
    this.glowGroup.add(sp);
    this.glowSprite = sp;
    this.glowBase = { w: 16, h: 7.6 };

    var coreMat = new THREE.SpriteMaterial({
      map: softTex('rgba(255,232,182,0.80)', 'rgba(255,190,110,0.30)'),
      transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending
    });
    var core = new THREE.Sprite(coreMat);
    core.scale.set(6.8, 2.9, 1);
    core.position.set(0, 0.95, -1.35);
    core.renderOrder = 7;
    this.glowGroup.add(core);
    this.glowCore = core;
    this.glowCoreMat = coreMat;
    this.glowCoreBase = { w: 6.8, h: 2.9 };
    this.glowMat = mat;
  };

  Stage.prototype.resize = function () {
    if (!this.ok) return;
    var w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
    if (this.sparks) this.sparks.mat.uniforms.uPx.value = (h * Math.min(2, window.devicePixelRatio || 1)) / (2 * Math.tan(this.fov * Math.PI / 360));
    if (this.model && this.state !== 'empty') this.rebuild(true);
  };

  Stage.prototype.viewHeight = function () {
    var dist = Math.sqrt(this.camZ * this.camZ + Math.pow(this.cam.camY - this.cam.lookY, 2));
    return 2 * dist * Math.tan(this.fov * Math.PI / 360);
  };
  Stage.prototype.viewWidth = function () {
    return this.viewHeight() * (this.camera.aspect || 0.65);
  };

  function pickDecoyChar(chars) {
    var used = {};
    chars.forEach(function (c) { used[c.toUpperCase()] = 1; });
    var latin = /[A-Za-z]/.test(chars[0] || 'A');
    var pool = (latin ? LATIN_POOL : HANGUL_POOL).split('').filter(function (c) { return !used[c.toUpperCase()]; });
    return pool[(Math.random() * pool.length) | 0] || 'A';
  }

  /* ══════════════════════ 탑 만들기 ══════════════════════ */
  Stage.prototype.setModel = function (model) {
    this.model = model;
    this.build();
  };

  Stage.prototype.clearBlocks = function () {
    var self = this;
    this.blocks.forEach(function (b) {
      self.root.remove(b.mesh);
      self.mirror.remove(b.refl);
      self.scene.remove(b.shadow);
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
      if (b.label) { b.label.geometry.dispose(); b.label.material.map.dispose(); b.label.material.dispose(); }
      b.refl.material.dispose();
      b.shadow.material.dispose();
    });
    this.blocks = [];
  };

  Stage.prototype.makeDecoys = function (chars) {
    var latin = /[A-Za-z]/.test(chars[0] || 'A');
    var total = clamp(chars.length + 2, 8, 10);
    var need = Math.max(0, total - chars.length);
    if (!need) return [];
    var used = {};
    chars.forEach(function (c) { used[c.toUpperCase()] = 1; });
    var pool = (latin ? LATIN_POOL : HANGUL_POOL).split('').filter(function (c) {
      return !used[c.toUpperCase()];
    });
    shuffle(pool);
    return pool.slice(0, need);
  };

  Stage.prototype.build = function () {
    var self = this;
    this.clearBlocks();
    this.state = 'stack';
    this.phaseT = 0;
    this.glowOn = false;
    this.glowT = 0;
    this.glowMat.opacity = 0;
    this.glowCoreMat.opacity = 0;
    this.poolMat.opacity = 0;
    this.warmLight.intensity = 0;
    this.underLight.intensity = 0;
    this.burstPlan = [];

    var model = this.model || DEMO;
    var phrase = String(model.phrase || '').trim() || FALLBACK;
    var words = phrase.split(/\s+/).filter(Boolean);
    var chars = [], wordMark = [];
    words.forEach(function (w, wi) {
      for (var i = 0; i < w.length; i++) {
        chars.push(w[i]);
        wordMark.push(i === w.length - 1 && wi < words.length - 1);
      }
    });
    if (!chars.length) { chars = FALLBACK.replace(/\s+/g, '').split(''); wordMark = []; }
    if (chars.length > 12) { chars = chars.slice(0, 12); wordMark = wordMark.slice(0, 12); }
    this.chars = chars;
    this.wordMark = wordMark;

    /* 블록 목록 — 진짜 글자 + 위장 글자 섞기 (바닥 큰 블록은 항상 위장 글자) */
    var items = chars.map(function (ch, i) { return { ch: ch, ci: i, decoy: false }; });
    this.makeDecoys(chars).forEach(function (ch) { items.push({ ch: ch, ci: -1, decoy: true }); });
    var decoys = items.filter(function (it) { return it.decoy; });
    var baseItem = decoys.length ? decoys[0] : null;
    if (!baseItem) { baseItem = { ch: pickDecoyChar(chars), ci: -1, decoy: true }; items.push(baseItem); }
    var rest = shuffle(items.filter(function (it) { return it !== baseItem; }));
    items = rest;

    /* 무대 크기 → 카메라·블록 크기 */
    var vh = this.viewHeight(), vw = this.viewWidth();
    var PITCH = 1.00, BASE_H = 0.94, BLK = 1.12;
    this.PITCH = PITCH; this.BLK = BLK;
    var rowsAbove = this.rowsPlan(items.length).reverse();
    var towerH = BASE_H + rowsAbove.length * PITCH + BLK * 0.5;
    var kT = clamp((vh * 0.62) / towerH, 0.2, 3.0);
    this.kT = kT;

    /* 배치 */
    var cursor = 0;
    var base = baseItem;
    var pal = shuffle(PALETTE.slice());
    var ci = 0;

    var mk = function (item, dims, tone) {
      var color = pal[ci % pal.length]; ci++;
      return self.makeBlock(item, dims, color, kT);
    };

    /* 바닥 큰 블록 */
    var baseBlock = mk(base, { w: 1.86, h: 0.94, d: 1.32, r: 0.15 });
    baseBlock.mesh.position.set(0, 0.94 / 2 * kT, 0);
    baseBlock.mesh.quaternion.setFromEuler(new THREE.Euler(rand(-0.02, 0.02), rand(-0.12, 0.12), rand(-0.03, 0.03)));
    baseBlock.isBase = true;

    /* 위로 쌓기 — 층마다 살짝 겹치고 비틀린 탑 */
    var lean = rand(-1, 1);
    var drift = 0;
    for (var r = 0; r < rowsAbove.length; r++) {
      var cnt = rowsAbove[r];
      var y = BASE_H + r * PITCH + BLK * 0.5;
      drift += lean * rand(0.04, 0.11);
      for (var i = 0; i < cnt; i++) {
        if (cursor >= items.length) break;
        var item = items[cursor++];
        var b = mk(item, { w: BLK, h: BLK, d: BLK, r: 0.135 });
        var x = (cnt === 2 ? (i - 0.5) * 1.26 : (cnt === 3 ? (i - 1) * 1.26 : rand(-0.10, 0.10))) + drift * 1.15 + rand(-0.06, 0.06);
        b.mesh.position.set(x * kT, (y + rand(-0.02, 0.02)) * kT, rand(-0.05, 0.05) * kT);
        b.mesh.quaternion.setFromEuler(new THREE.Euler(
          rand(-0.05, 0.03),
          rand(-0.12, 0.12),
          rand(-0.06, 0.06)
        ));
      }
    }

    /* 남는 게 있으면 맨 위에 하나 더 */
    while (cursor < items.length) {
      var it = items[cursor++];
      var bb = mk(it, { w: BLK, h: BLK, d: BLK, r: 0.135 });
      bb.mesh.position.set(rand(-0.24, 0.24) * kT, (BASE_H + rowsAbove.length * PITCH + BLK * 0.5) * kT, rand(-0.06, 0.06) * kT);
      bb.mesh.quaternion.setFromEuler(new THREE.Euler(rand(-0.05, 0.03), rand(-0.14, 0.14), rand(-0.06, 0.06)));
    }

    /* 탑 중심 높이 · 카메라 */
    var topY = 0;
    this.blocks.forEach(function (b) { topY = Math.max(topY, b.mesh.position.y + BLK * 0.5 * kT); });
    this.towerTop = topY;
    this.towerCenter = topY * 0.5;
    this.camTarget.lookY = topY * 0.5 - vh * 0.035;
    this.camTarget.pitch = 0.255;
    this.camTarget.camY = this.camTarget.lookY + this.camZ * Math.tan(this.camTarget.pitch);

    this.rowLayout();
    this.fingerPoint = this.baseFrontPoint();
  };

  Stage.prototype.rowsPlan = function (n) {
    var rows = [1], left = n - 1;
    if (left < 0) return [];
    while (left > 0) {
      if (left >= 2) { rows.push(2); left -= 2; }
      else { rows.push(1); left -= 1; }
    }
    return rows;
  };

  Stage.prototype.makeBlock = function (item, dims, color, scale) {
    var geo = roundedBox(dims.w, dims.h, dims.d, dims.r, 6);
    var base = new THREE.Color(color);
    var mat = new THREE.MeshPhysicalMaterial({
      color: base,
      roughness: 0.44,
      metalness: 0.0,
      clearcoat: 0.20,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.32,
      emissive: base.clone().multiplyScalar(0.22),
      sheen: 0.3,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color(0xFFFFFF)
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.scale.setScalar(scale);

    var face = Math.min(dims.w, dims.h) * 0.735;
    var lmat = new THREE.MeshBasicMaterial({
      map: glyphTexture(item.ch), transparent: true, depthWrite: false, toneMapped: false
    });
    var label = new THREE.Mesh(new THREE.PlaneGeometry(face, face), lmat);
    label.position.set(0, dims.h * 0.045, dims.d / 2 + 0.003);
    label.renderOrder = 1;
    mesh.add(label);
    /* 반사용 */
    var rmat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color).multiplyScalar(0.75),
      roughness: 0.45, metalness: 0.0, clearcoat: 0.2,
      transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide
    });
    var refl = new THREE.Mesh(geo, rmat);
    refl.scale.copy(mesh.scale);

    /* 바닥 그림자 */
    var shMat = new THREE.MeshBasicMaterial({
      map: SOFT_SHADOW, transparent: true, opacity: 0.5, depthWrite: false
    });
    var shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 5;

    this.root.add(mesh);
    this.mirror.add(refl);
    this.scene.add(shadow);

    var b = {
      mesh: mesh, label: label, refl: refl, shadow: shadow,
      char: item.ch, ci: item.ci, decoy: item.decoy,
      base: item.decoy ? false : true,
      dims: dims, color: color,
      vel: new THREE.Vector3(), ang: new THREE.Vector3(),
      state: 'idle', anim: null, fallStart: 0, alpha: 1
    };
    this.blocks.push(b);
    this.syncBlock(b);
    return b;
  };

  Stage.prototype.syncBlock = function (b) {
    var m = b.mesh;
    b.refl.position.copy(m.position);
    b.refl.quaternion.copy(m.quaternion);
    b.refl.scale.set(m.scale.x, m.scale.y * 1.45, m.scale.z);
    b.refl.visible = m.visible && b.alpha > 0.02 && this.state === 'done';
    b.refl.material.opacity = 0.085 * b.alpha;
    b.shadow.position.set(m.position.x, -0.03, m.position.z);
    var sz = Math.max(b.dims.w, b.dims.d) * m.scale.x * 1.5;
    b.shadow.scale.set(sz, sz, 1);
    var hgt = Math.max(0, m.position.y);
    b.shadow.material.opacity = 0.46 * b.alpha * clamp(1 - hgt / (this.kT * 5.5), 0.12, 1);
  };

  Stage.prototype.baseFrontPoint = function () {
    var base = this.blocks.filter(function (b) { return b.isBase; })[0] || this.blocks[0];
    if (!base) return new THREE.Vector3(0, 0, 0);
    var v = new THREE.Vector3(0.18, 0, base.dims.d / 2 + 0.02);
    v.applyQuaternion(base.mesh.quaternion);
    v.multiplyScalar(base.mesh.scale.x);
    v.add(base.mesh.position);
    return v;
  };

  /* 완성 줄 배치 */
  Stage.prototype.rowLayout = function () {
    var vw = this.viewWidth();
    var n = this.chars.length;
    var BLK = this.BLK || 1.12;
    var gap = 0.16, space = 0.58;
    var spaces = 0;
    this.wordMark.forEach(function (m) { if (m) spaces++; });
    var unitW = n * BLK + Math.max(0, n - 1) * gap + spaces * space;
    var kR = clamp((vw * 0.90) / unitW, 0.10, 1.6);
    this.kR = kR;
    var x = -unitW / 2 + BLK / 2;
    var slots = [];
    for (var i = 0; i < n; i++) {
      slots.push({ x: x * kR, y: kR * BLK * 0.5 + 0.002, z: 0 });
      x += BLK + gap;
      if (this.wordMark[i]) x += space;
    }
    this.slots = slots;
    this.rowY = kR * BLK * 0.5;
  };

  /* ══════════════════════ 터치 → 무너짐 ══════════════════════ */
  Stage.prototype.tap = function () {
    if (this.state !== 'stack') return false;
    this.state = 'falling';
    this.phaseT = 0;
    var self = this;
    var t0 = performance.now() / 1000;

    var order = this.blocks.slice().sort(function (a, b) { return b.mesh.position.y - a.mesh.position.y; });
    order.forEach(function (b, i) {
      b.state = 'fall';
      b.fallStart = t0 + i * 0.014;
      var p = b.mesh.position;
      var dir = new THREE.Vector3(p.x, 0, p.z);
      if (dir.lengthSq() < 0.001) dir.set(rand(-1, 1), 0, rand(-1, 1));
      dir.normalize();
      var push = rand(1.6, 3.4) * self.kT;
      b.vel.set(dir.x * push + rand(-1.2, 1.2), rand(0.6, 2.6), dir.z * push + rand(-0.9, 0.9));
      b.ang.set(rand(-6, 6), rand(-5, 5), rand(-6, 6));
      b.restY = b.dims.h * 0.5 * b.mesh.scale.x * 0.86;
      b.sounded = false;
    });
    return true;
  };

  Stage.prototype.startGlow = function () {
    if (this.glowOn) return;
    this.glowOn = true;
    this.glowT = 0;
    var t = performance.now() / 1000;
    var y0 = this.rowY || 0.4;
    this.glowSprite.position.set(0, y0 + 0.62, -2.05);
    this.glowCore.position.set(0, y0 + 0.12, -1.4);
    this.pool.position.set(0, 0.006, -0.25);

    /* 우아한 폭죽 — 빠르게 튀지 않고, 느리게 떠올라 사르르 퍼진다 */
    var self = this;
    this.burstPlan = [
      { t: t + 0.05, kind: 'core', n: 34 },
      { t: t + 0.55, kind: 'wide', n: 30 },
      { t: t + 1.15, kind: 'soft', n: 24 }
    ];
    this.nextAmbient = t + 1.6;
    Sfx.chime(60);
  };

  Stage.prototype.burst = function (kind) {
    var y0 = this.rowY || 0.4;
    var w = this.rowWidth || 4;
    var n = kind === 'core' ? 30 : (kind === 'wide' ? 26 : 20);
    var unit = (this.kR || 0.52) / 0.52;
    for (var i = 0; i < n; i++) {
      var wide = kind === 'wide' ? 1 : (kind === 'soft' ? 0.85 : 0.72);
      var x = rand(-w * 0.55, w * 0.55) * wide;
      var col = SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];
      var c = new THREE.Color(col);
      this.sparks.spawn({
        x: x,
        y: y0 + rand(0.05, 0.85),
        z: rand(-2.1, -1.0),
        vx: x * 0.30 + rand(-0.10, 0.10),
        vy: rand(0.42, 1.15),
        vz: rand(0.04, 0.26),
        ttl: rand(3.6, 5.6),
        size: rand(0.060, 0.135) * unit,
        col: [c.r, c.g, c.b],
        g: 0.12,
        drag: 0.990,
        twitch: 1.6
      });
    }
  };

  /* ══════════════════════ 업데이트 ══════════════════════ */
  Stage.prototype.update = function (dt, now) {
    if (!this.ok) return;
    this.now = now;

    /* 카메라 스무스 이동 */
    var k = clamp(dt * 2.4, 0, 1);
    this.cam.lookY = lerp(this.cam.lookY, this.camTarget.lookY, k);
    this.cam.camY = lerp(this.cam.camY, this.camTarget.camY, k);
    this.camera.position.set(0, this.cam.camY, this.camZ);
    this.camera.lookAt(0, this.cam.lookY, 0);

    if (this.state === 'falling') {
      this.phaseT += dt;
      this.stepFall(dt, now);
      if (this.phaseT > 0.66) this.startArrange(now);
    } else if (this.state === 'arranging') {
      this.phaseT += dt;
      this.stepArrange(now);
    } else if (this.state === 'done') {
      this.stepIdle(dt, now);
    }

    this.blocks.forEach(function (b) { if (b.alpha < 1 || b.state === 'idle') { } });
    for (var i = 0; i < this.blocks.length; i++) this.syncBlock(this.blocks[i]);

    /* 후광 */
    if (this.glowOn) {
      this.glowT += dt;
      var g = easeOutCubic(clamp(this.glowT / 2.2, 0, 1));
      var breathe = 1 + Math.sin(this.glowT * 0.9) * 0.012;
      this.glowMat.opacity = 0.70 * g;
      this.glowSprite.scale.set(this.glowBase.w * (0.74 + 0.26 * g) * breathe, this.glowBase.h * (0.74 + 0.26 * g) * breathe, 1);
      this.glowCoreMat.opacity = 0.18 * easeOutCubic(clamp(this.glowT / 1.6, 0, 1));
      this.glowCore.scale.set(this.glowCoreBase.w * (0.62 + 0.38 * g), this.glowCoreBase.h * (0.62 + 0.38 * g), 1);
      this.poolMat.opacity = 0.42 * g;
      this.warmLight.intensity = 8 * g;
      this.underLight.intensity = 2.2 * g;
      if (this.fillLight) this.fillLight.intensity = 1.25 + 0.85 * g;
      this.glowSprite.material.rotation = Math.sin(this.glowT * 0.06) * 0.02;

      /* 예정된 폭죽 */
      for (var bi = 0; bi < this.burstPlan.length; bi++) {
        var bp = this.burstPlan[bi];
        if (bp && now >= bp.t) { this.burst(bp.kind); this.burstPlan[bi] = null; }
      }
      /* 잔잔한 티끌 */
      if (now > this.nextAmbient) {
        var y0 = this.rowY || 0.4, w = this.rowWidth || 4;
        for (var s = 0; s < 2; s++) {
          var c = new THREE.Color(SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0]);
          this.sparks.spawn({
            x: rand(-w * 0.72, w * 0.72),
            y: y0 + rand(0.0, 0.9),
            z: rand(-2.2, -0.8),
            vx: rand(-0.06, 0.06), vy: rand(0.18, 0.38), vz: 0.04,
            ttl: rand(4.2, 6.4), size: rand(0.028, 0.058) * (this.kR || 0.52) / 0.52,
            col: [c.r, c.g, c.b], g: 0.05, drag: 0.995, twitch: 1.8
          });
        }
        this.nextAmbient = now + rand(0.42, 0.78);
      }
    }

    this.sparks.update(dt);
  };

  Stage.prototype.stepFall = function (dt, now) {
    var g = 26;
    for (var i = 0; i < this.blocks.length; i++) {
      var b = this.blocks[i];
      if (b.state !== 'fall') continue;
      if (now < b.fallStart) continue;
      var m = b.mesh;
      b.vel.y -= g * dt;
      m.position.addScaledVector(b.vel, dt);
      var ang = b.ang.length();
      if (ang > 0.0001) {
        var q = new THREE.Quaternion().setFromAxisAngle(b.ang.clone().normalize(), ang * dt);
        m.quaternion.premultiply(q);
      }
      if (m.position.y <= b.restY) {
        m.position.y = b.restY;
        if (!b.sounded && b.vel.y < -1.2) {
          b.sounded = true;
          Sfx.clack(0, rand(520, 1150), 0.5);
        }
        b.vel.y = -b.vel.y * 0.34;
        b.vel.x *= 0.72; b.vel.z *= 0.72;
        b.ang.multiplyScalar(0.55);
        if (Math.abs(b.vel.y) < 0.55) { b.vel.y = 0; b.vel.x *= 0.9; b.vel.z *= 0.9; }
      }
      /* 무대 밖으로 너무 나가지 않게 */
      var lim = (this.viewWidth() || 6) * 0.5;
      if (m.position.x > lim) m.position.x = lim;
      if (m.position.x < -lim) m.position.x = -lim;
    }
  };

  Stage.prototype.startArrange = function (now) {
    this.state = 'arranging';
    this.phaseT = 0;
    var self = this;
    var reals = this.blocks.filter(function (b) { return !b.decoy; })
      .sort(function (a, b) { return a.ci - b.ci; });
    var i = 0;
    reals.forEach(function (b) {
      b.state = 'toSlot';
      b.slotIdx = i;
      b.anim = {
        t0: now + 0.02 + i * 0.045,
        dur: 0.78,
        from: { p: b.mesh.position.clone(), q: b.mesh.quaternion.clone(), s: b.mesh.scale.x },
        to: {
          p: new THREE.Vector3(self.slots[b.ci].x, self.slots[b.ci].y, self.slots[b.ci].z),
          q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.025, 0.025))),
          s: self.kR
        }
      };
      i++;
    });
    /* 위장 블록은 굴러 바깥으로 사라진다 */
    this.blocks.filter(function (b) { return b.decoy; }).forEach(function (b, j) {
      b.state = 'vanish';
      b.anim = {
        t0: now + j * 0.05,
        dur: 0.95,
        from: { p: b.mesh.position.clone(), q: b.mesh.quaternion.clone(), s: b.mesh.scale.x },
        to: {
          p: new THREE.Vector3(b.mesh.position.x * 2.2 + rand(-1, 1), -1.2, b.mesh.position.z - 1.4),
          q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand(-2, 2), rand(-2, 2), rand(-2, 2))),
          s: b.mesh.scale.x * 0.55
        }
      };
    });
    this.rowWidth = (this.slots && this.slots.length) ? (this.slots[this.slots.length - 1].x - this.slots[0].x + this.kR * (this.BLK || 1.12)) : 4;
    var self2 = this;
    this.arrangeDoneAt = now + 0.02 + reals.length * 0.045 + 0.78;
  };

  Stage.prototype.stepArrange = function (now) {
    var self = this;
    var allDone = true;
    this.blocks.forEach(function (b) {
      if (!b.anim) return;
      var t = (now - b.anim.t0) / b.anim.dur;
      if (t < 0) { allDone = false; return; }
      if (t >= 1) {
        b.mesh.position.copy(b.anim.to.p);
        b.mesh.quaternion.copy(b.anim.to.q);
        b.mesh.scale.setScalar(b.anim.to.s);
        if (b.state === 'vanish') { b.alpha = 0; b.mesh.visible = false; }
        b.anim = null;
        return;
      }
      allDone = false;
      var e = easeInOutCubic(t);
      var p = new THREE.Vector3().lerpVectors(b.anim.from.p, b.anim.to.p, e);
      if (b.state === 'toSlot') {
        /* 살짝 떠올랐다가 착 */
        p.y += Math.sin(Math.PI * t) * (0.55 * self.kT);
      }
      b.mesh.position.copy(p);
      b.mesh.quaternion.copy(b.anim.from.q).slerp(b.anim.to.q, e);
      b.mesh.scale.setScalar(lerp(b.anim.from.s, b.anim.to.s, e));
      if (b.state === 'toSlot' && t > 0.86 && !b.ticked) {
        b.ticked = true;
        Sfx.tick(0, 523.25 * Math.pow(1.0595, b.slotIdx * 3));
      }
      if (b.state === 'vanish' && t > 0.35) b.alpha = clamp(1 - (t - 0.35) / 0.5, 0, 1);
    });

    if (now > this.arrangeDoneAt && this.state === 'arranging') {
      this.finish(now);
    }
  };

  Stage.prototype.finish = function (now) {
    this.state = 'done';
    this.phaseT = 0;
    this.blocks.forEach(function (b) {
      if (b.decoy) { b.mesh.visible = false; b.alpha = 0; }
      else {
        b.mesh.scale.setScalar(this.kR);
      }
    }, this);
    this.camTarget.lookY = (this.rowY || 0.4) - 0.62;
    this.camTarget.pitch = 0.135;
    this.camTarget.camY = this.camTarget.lookY + this.camZ * Math.tan(this.camTarget.pitch);
    this.startGlow();
    if (this.onDone) this.onDone(this.model);
  };

  Stage.prototype.stepIdle = function (dt, now) {
    /* 완성 후 아주 미세한 숨쉬기 */
    for (var i = 0; i < this.blocks.length; i++) {
      var b = this.blocks[i];
      if (b.decoy) continue;
      var base = b.baseRot || (b.baseRot = b.mesh.quaternion.clone());
      var q = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        Math.sin(now * 0.6 + i) * 0.004,
        Math.sin(now * 0.5 + i * 1.7) * 0.006,
        0
      ));
      b.mesh.quaternion.copy(base).multiply(q);
    }
  };

  Stage.prototype.reset = function () {
    this.clearBlocks();
    this.sparks.items.forEach(function (it) { it.alive = false; });
    this.build();
  };

  Stage.prototype.rebuild = function (keepState) {
    var wasDone = keepState && this.state === 'done';
    this.clearBlocks();
    this.sparks.items.forEach(function (it) { it.alive = false; });
    this.build();
    if (wasDone) {
      this.blocks.forEach(function (b) {
        if (b.decoy) { b.mesh.visible = false; b.alpha = 0; return; }
        b.mesh.position.set(this.slots[b.ci].x, this.slots[b.ci].y, this.slots[b.ci].z);
        b.mesh.quaternion.setFromEuler(new THREE.Euler(0, rand(-0.14, 0.14), rand(-0.04, 0.04)));
        b.mesh.scale.setScalar(this.kR);
        b.baseRot = b.mesh.quaternion.clone();
      }, this);
      this.state = 'done';
      this.glowOn = true;
      this.glowT = 3;
      this.glowMat.opacity = 0.92;
      this.glowCoreMat.opacity = 0.85;
      this.poolMat.opacity = 0.75;
      this.warmLight.intensity = 14;
      this.underLight.intensity = 4.5;
      this.cam.lookY = this.camTarget.lookY = (this.rowY || 0.4) + 0.42;
      this.camTarget.pitch = 0.155;
      this.cam.camY = this.camTarget.camY = this.cam.lookY + this.camZ * Math.tan(0.155);
      this.camTarget.lookY = this.cam.lookY;
    }
  };

  var SOFT_SHADOW = null;

  /* ══════════════════════ 화면 · UI ══════════════════════ */
  var receiveView = $('#receiveView');
  var makeView = $('#makeView');
  var stageEl = $('#stage');
  var letterEl = $('#letter');
  var liveEl = $('#live');
  var soundBtn = $('#soundBtn');
  var fingerEl = $('#finger');

  var current = normModel(DEMO);
  var rcv = null, mkv = null;
  var rcvDoneAt = 0;

  SOFT_SHADOW = softTex('rgba(0,0,0,0.72)', 'rgba(0,0,0,0.26)');

  function initReceive() {
    if (rcv) return;
    if (!THREE) { noGL(); return; }
    rcv = new Stage($('#gl'), {});
    if (!rcv.ok) { rcv = null; noGL(); return; }
    rcv.onDone = function (model) {
      showLetter(model || current);
      $('#brandSub').textContent = '블록이 정리됐어요';
      $('#stageGlow').classList.add('on');
      liveEl.textContent = '블록이 정리되었습니다. 숨겨진 문구는 ' + ((model && model.phrase) || current.phrase) + ' 입니다.';
    };
    rcv.resize();
    rcv.setModel(current);
    placeFinger();
    if (/[?&]debug=1/.test(location.search)) window.__domino = rcv;
  }

  function noGL() {
    $('#brandSub').textContent = '지금 브라우저에서는 3D를 열 수 없어요';
    stageEl.addEventListener('click', function () {
      if (!letterEl.hidden) return;
      showLetter(current);
    });
  }

  function placeFinger() {
    if (!rcv || !rcv.fingerPoint) return;
    var v = rcv.fingerPoint.clone().project(rcv.camera);
    var x = (v.x * 0.5 + 0.5) * (rcv.W || 1);
    var y = (-v.y * 0.5 + 0.5) * (rcv.H || 1);
    fingerEl.style.left = clamp(x, 52, (rcv.W || 200) - 52) + 'px';
    fingerEl.style.top = clamp(y, 52, (rcv.H || 200) - 52) + 'px';
    fingerEl.classList.add('on');
  }

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

  function showLetter(m) {
    var to = $('#lTo'), bits = [];
    bits.push(m.to ? m.to + ' 님에게 도착한 한 줄' : '도착한 한 줄');
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
    $('#stackCta').classList.add('hide');
    letterEl.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { letterEl.classList.add('show'); });
    });
  }

  function hideLetter() {
    letterEl.classList.remove('show');
    receiveView.classList.remove('done');
    $('#stageGlow').classList.remove('on');
    setTimeout(function () {
      letterEl.hidden = true;
      $('#stackCta').classList.remove('hide');
    }, 500);
  }

  function openReceive(m, fromLink) {
    current = normModel({ t: m.to, f: m.from, p: m.phrase || FALLBACK, b: m.body });
    makeView.hidden = true;
    receiveView.hidden = false;
    hideLetter();
    letterEl.hidden = true;
    letterEl.classList.remove('show');
    $('#stackCta').classList.remove('hide');
    document.title = fromLink ? (current.phrase + ' — 오늘의 한 줄') : '오늘의 한 줄 — 3D 글자 블록 탑';
    $('#brandSub').textContent = '블록을 눌러 정리해보세요';
    setSoundBtn();
    requestAnimationFrame(function () {
      initReceive();
      if (rcv) { rcv.resize(); rcv.setModel(current); }
    });
  }

  function tapStage() {
    if (!rcv || rcv.state !== 'stack') return;
    Sfx.ensure();
    Sfx.thunk();
    fingerEl.classList.remove('on');
    rcv.tap();
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { } }
  }

  stageEl.addEventListener('click', function (e) {
    if (e.target.closest('.bottom')) return;
    tapStage();
  });
  stageEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapStage(); }
  });

  $('#againBtn').addEventListener('click', function () {
    Sfx.ensure(); Sfx.ui();
    hideLetter();
    $('#brandSub').textContent = '블록을 눌러 정리해보세요';
    if (rcv) rcv.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(placeFinger, 260);
  });

  $('#makeBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#ctaMake').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#toMakeBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openMake(); });
  $('#backBtn').addEventListener('click', function () { Sfx.ensure(); Sfx.ui(); openReceive(current, false); });

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

  /* ══════════════════════ 만들기 화면 ══════════════════════ */
  var phraseInput, bodyInput, toInput, fromInput, linkBox, linkOut;
  var draft = { to: '', from: '', phrase: 'HAPPY DAY', body: '' };

  function openMake() {
    receiveView.hidden = true;
    makeView.hidden = false;
    document.title = '3D 글자 블록 탑 — 만들기';
    window.scrollTo({ top: 0, behavior: 'auto' });
    /* 자동 focus 는 절대 하지 않는다 */
    requestAnimationFrame(function () {
      if (!mkv && THREE) {
        mkv = new Stage($('#mkGl'), { mini: true });
        if (!mkv.ok) { mkv = null; return; }
        mkv.onDone = function () {
          $('#mkNote').textContent = '이렇게 도착해요 ✓';
          $('#previewBtn').textContent = '↻ 다시 보기';
          $('#mkStageGlow').classList.add('on');
        };
      }
      if (mkv) {
        mkv.resize();
        mkv.setModel(normModel({ t: draft.to, f: draft.from, p: draft.phrase || FALLBACK, b: draft.body }));
        $('#mkStageGlow').classList.remove('on');
        $('#previewBtn').textContent = '👆 미리 눌러보기';
        $('#mkNote').textContent = '받는 사람 화면 그대로';
      }
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
    paintClears();

    var chips = $('#phraseChips');
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = p;
      b.addEventListener('click', function () {
        phraseInput.value = p;
        draft.phrase = p;
        paintCounts(); paintClears();
        Sfx.ensure(); Sfx.ui();
        syncPreview(true);
      });
      chips.appendChild(b);
    });

    function paintCounts() {
      $('#phraseCount').textContent = phraseInput.value.length + ' / 12';
      $('#bodyCount').textContent = bodyInput.value.length + ' / 200';
    }

    /* ✕ 지우기 버튼 */
    function addClear(input) {
      var wrap = document.createElement('span');
      wrap.className = 'inputWrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'clearBtn';
      btn.setAttribute('aria-label', (input.id === 'phraseInput' ? '숨길 문구' : input.id === 'bodyInput' ? '편지 내용' : input.id === 'toInput' ? '받는 사람' : '보내는 사람') + ' 지우기');
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
      wrap.appendChild(btn);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        input.value = '';
        paintCounts();
        paintClears();
        if (!linkBox.hidden) linkBox.hidden = true;
        syncPreview(true);
        input.focus({ preventScroll: true });
        Sfx.ensure(); Sfx.ui();
      });
      input.__clear = btn;
      return btn;
    }

    [phraseInput, bodyInput, toInput, fromInput].forEach(addClear);

    function paintClears() {
      [phraseInput, bodyInput, toInput, fromInput].forEach(function (el) {
        if (el && el.__clear) el.__clear.classList.toggle('show', el.value.length > 0);
      });
    }
    window.__paintCounts = paintCounts;
    window.__paintClears = paintClears;

    var timer = null;
    function syncPreview(now) {
      draft.to = toInput.value;
      draft.from = fromInput.value;
      draft.phrase = phraseInput.value;
      draft.body = bodyInput.value;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (mkv) {
          mkv.setModel(normModel({ t: draft.to, f: draft.from, p: draft.phrase || FALLBACK, b: draft.body }));
          $('#mkStageGlow').classList.remove('on');
        }
        $('#previewBtn').textContent = '👆 미리 눌러보기';
        $('#mkNote').textContent = '받는 사람 화면 그대로';
      }, now ? 0 : 200);
    }
    window.__syncPreview = function (now) { syncPreview(now); };

    [phraseInput, bodyInput, toInput, fromInput].forEach(function (el) {
      el.addEventListener('input', function () {
        if (el === phraseInput || el === bodyInput) paintCounts();
        paintClears();
        syncPreview(false);
        if (!linkBox.hidden) linkBox.hidden = true;
      });
    });
    phraseInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); phraseInput.blur(); }
    });

    function previewTap() {
      if (!mkv) return;
      Sfx.ensure();
      if (mkv.state === 'done') {
        mkv.reset();
        $('#mkStageGlow').classList.remove('on');
        $('#previewBtn').textContent = '👆 미리 눌러보기';
        $('#mkNote').textContent = '받는 사람 화면 그대로';
      } else if (mkv.state === 'stack') {
        Sfx.thunk();
        mkv.tap();
      }
    }
    $('#previewBtn').addEventListener('click', previewTap);
    $('#mkStage').addEventListener('click', previewTap);
    $('#mkStage').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); previewTap(); }
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
          title: '오늘의 한 줄 — 3D 글자 블록 탑',
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

  /* ── 루프 ── */
  var lastT = 0;
  function loop(t) {
    var now = t / 1000;
    var dt = lastT ? Math.min(0.05, now - lastT) : 0.016;
    lastT = now;
    if (!document.hidden) {
      if (rcv && rcv.ok && !receiveView.hidden) {
        rcv.update(dt, now);
        if (rcv.state === 'stack' && fingerEl.classList.contains('on')) placeFinger();
      }
      if (mkv && mkv.ok && !makeView.hidden) mkv.update(dt, now);
      if (rcv && rcv.ok && !receiveView.hidden) rcv.renderer.render(rcv.scene, rcv.camera);
      if (mkv && mkv.ok && !makeView.hidden) mkv.renderer.render(mkv.scene, mkv.camera);
    }
    requestAnimationFrame(loop);
  }

  /* ── 크기 변화 ── */
  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (rcv && rcv.ok) { rcv.resize(); placeFinger(); }
      if (mkv && mkv.ok) mkv.resize();
    }, 200);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 320);
  });

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
    if (got) openReceive(got, true);
    else {
      if (token) setTimeout(function () { toast('링크를 읽지 못했어요. 새로 만들어 보내주세요'); }, 500);
      openReceive(DEMO, false);
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
