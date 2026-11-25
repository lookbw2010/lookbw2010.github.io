/* TypoPop — scene.js
   Builds the live motion-type stage. No dependencies.
   render(svg, {word, caption, motion}) -> { frame(t, ms), info }              */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DISPLAY = '"Archivo Black","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Helvetica Neue",Arial,sans-serif';
  var TEXTF = '"Archivo","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","Helvetica Neue",Arial,sans-serif';

  /* stage geometry (viewBox 400x500) */
  var BASE_Y = 312;
  var TOP_SAFE = 96;      /* nothing above this (caption lives 40..~130) */
  var BOTTOM_SAFE = 488;
  var SIDE = 188;         /* |x| limit for props */

  /* ---------------- math ---------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function c01(v) { return clamp(v, 0, 1); }
  function seg(t, a, b) { return c01((t - a) / Math.max(1e-6, b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sin(x) { return Math.sin(x); }

  var E = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    outQuart: function (t) { return 1 - Math.pow(1 - t, 4); },
    outQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
    inQuad: function (t) { return t * t; },
    inCubic: function (t) { return t * t * t; },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outBack: function (t, s) { s = (s === undefined) ? 1.7 : s; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    outElastic: function (t) {
      if (t <= 0) return 0; if (t >= 1) return 1;
      var c = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * sin((t * 10 - 0.75) * c) + 1;
    }
  };

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------------- dom ---------------- */
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(n);
    return n;
  }
  function tx(str, attrs, parent) {
    var n = el('text', attrs, parent);
    n.textContent = str;
    return n;
  }
  function hide(node) { node.setAttribute('opacity', '0'); }

  function setT(node, base, o) {
    o = o || {};
    var dx = o.dx || 0, dy = o.dy || 0, r = o.r || 0;
    var sx = (o.sx === undefined) ? 1 : o.sx, sy = (o.sy === undefined) ? 1 : o.sy;
    var ox = (o.ox === undefined) ? (base.ox || 0) : o.ox;
    var oy = (o.oy === undefined) ? (base.oy || 0) : o.oy;
    node.setAttribute('transform',
      'translate(' + (base.x + dx) + ' ' + (base.y + dy) + ') ' +
      'translate(' + ox + ' ' + oy + ') rotate(' + r + ') scale(' + sx + ' ' + sy + ') translate(' + (-ox) + ' ' + (-oy) + ')');
  }

  /* ---------------- measuring ---------------- */
  var mc = document.createElement('canvas');
  var mctx = mc.getContext('2d');
  function mw(str, size, weight, family) {
    mctx.font = (weight || 400) + ' ' + size + 'px ' + (family || DISPLAY);
    return mctx.measureText(str).width;
  }
  function masc(str, size, weight, family) {
    mctx.font = (weight || 400) + ' ' + size + 'px ' + (family || DISPLAY);
    var m = mctx.measureText(str);
    return (m.actualBoundingBoxAscent || size * 0.72);
  }

  var UID = 0;

  /* ============================================================
     render
     ============================================================ */
  function render(svg, opts) {
    var word = (opts.word || 'TypoPop').trim() || 'TypoPop';
    var caption = opts.caption || [];
    var motion = opts.motion || 'pop';
    var isKo = /[\uAC00-\uD7A3]/.test(word);

    svg.innerHTML = '';
    var uid = 'tp' + (++UID);
    var defs = el('defs', {}, svg);

    var root = el('g', {}, svg);
    var capG = el('g', {}, root);
    var heroG = el('g', {}, root);
    var chromeG = el('g', { class: 'chrome' }, root);

    var capBottom = buildCaption(capG, caption);

    var meta = MOTION_CAP[motion] || {};
    var maxW = meta.maxW || 344;
    var maxFont = (isKo && meta.maxFontKo) ? meta.maxFontKo : (meta.maxFont || 150);
    var baseY = meta.baseY || BASE_Y;
    var info = buildWord(heroG, word, maxW, maxFont, baseY, isKo);
    info.capBottom = capBottom;

    var back = el('g', {}, heroG);
    var lettersG = info.lettersG;
    var front = el('g', {}, heroG);
    heroG.appendChild(back);
    heroG.appendChild(lettersG);
    heroG.appendChild(front);

    var parts = [];
    function part(node, fn) { parts.push({ node: node, fn: fn }); return node; }

    /* chrome (studio only) */
    var barW = 350, barX = 25, barY = 474;
    el('rect', { x: barX, y: barY, width: barW, height: 1.5, rx: .75, fill: 'currentColor', opacity: .14 }, chromeG);
    var barFill = el('rect', { x: barX, y: barY, width: barW, height: 1.5, rx: .75, class: 's-acc' }, chromeG);
    el('circle', { cx: 26, cy: 27, r: 2.4, class: 'chrome-dot' }, chromeG);
    tx('LIVE 1.0s', { x: 33, y: 30, 'font-size': 6.4, 'letter-spacing': 1.5, fill: 'currentColor', 'font-family': TEXTF, 'font-weight': 600 }, chromeG);
    tx('TYPOPOP', { x: 374, y: 30, 'text-anchor': 'end', 'font-size': 6.4, 'letter-spacing': 1.8, fill: 'currentColor', 'font-family': TEXTF, 'font-weight': 600, opacity: .8 }, chromeG);
    [[25, 25, 1, 1], [375, 25, -1, 1], [25, 478, 1, -1], [375, 478, -1, -1]].forEach(function (c) {
      el('path', {
        d: 'M' + c[0] + ' ' + (c[1] + 8 * c[3]) + ' L' + c[0] + ' ' + c[1] + ' L' + (c[0] + 8 * c[2]) + ' ' + c[1],
        fill: 'none', stroke: 'currentColor', 'stroke-width': 1, opacity: .45
      }, chromeG);
    });

    var ctx = {
      back: back, front: front, letters: info.letters, lettersG: info.lettersG,
      info: info, word: word, isKo: isKo, defs: defs, uid: uid, part: part,
      el: el, tx: tx, hide: hide, setT: setT, E: E, seg: seg, c01: c01, lerp: lerp, sin: sin,
      BASE_Y: baseY, TOP: TOP_SAFE, SIDE: SIDE, heroG: heroG
    };
    var builder = SCENES[motion] || SCENES.pop;
    try { builder(ctx); } catch (err) { if (window.console) console.error('[typopop]', motion, err && err.message); }
    if (!parts.length) { try { SCENES.pop(ctx); } catch (e2) { } }

    return {
      info: info,
      frame: function (t, ms) {
        for (var i = 0; i < parts.length; i++) {
          try { parts[i].fn(parts[i].node, t, ms); } catch (e) { }
        }
        barFill.setAttribute('width', (barW * c01(t)).toFixed(2));
        barFill.setAttribute('opacity', t >= 1 ? '0' : '1');
      }
    };
  }

  /* ============================================================
     caption
     ============================================================ */
  function buildCaption(g, segs) {
    if (!segs || !segs.length) return 0;
    var toks = [], pendingSpace = false, started = false;
    segs.forEach(function (sg) {
      var bits = String(sg.t).split(/(\s+)/);
      bits.forEach(function (b) {
        if (b === '') return;
        if (/^\s+$/.test(b)) { if (started) pendingSpace = true; return; }
        toks.push({ t: b, a: !!sg.a, sp: pendingSpace && started });
        pendingSpace = false; started = true;
      });
    });
    if (!toks.length) return 0;

    var maxW = 338, maxLines = 3;
    var sizes = [18, 16.5, 15];
    var chosen = null;
    for (var i = 0; i < sizes.length; i++) {
      var lines = wrap(toks, sizes[i], maxW);
      if (lines.length <= maxLines) { chosen = { fs: sizes[i], lines: lines }; break; }
    }
    if (!chosen) {
      var fs = sizes[sizes.length - 1];
      chosen = { fs: fs, lines: wrap(toks, fs, maxW).slice(0, maxLines) };
      chosen.lines[chosen.lines.length - 1].push({ t: '…', a: false });
    }

    var fs2 = chosen.fs, lh = fs2 * 1.38, y0 = 62;
    chosen.lines.forEach(function (line, li) {
      var node = tx('', {
        x: 200, y: (y0 + li * lh).toFixed(1), 'text-anchor': 'middle',
        class: 'cap-txt', 'font-size': fs2, 'letter-spacing': '.004em'
      }, g);
      var first = true;
      line.forEach(function (tk) {
        var tspan = document.createElementNS(NS, 'tspan');
        tspan.textContent = (first ? '' : (tk.sp ? ' ' : '')) + tk.t;
        if (tk.a) tspan.setAttribute('class', 'accent');
        node.appendChild(tspan);
        first = false;
      });
    });
    return y0 + (chosen.lines.length - 1) * lh;
  }

  function wrap(toks, fs, maxW) {
    var lines = [], cur = [], w = 0;
    toks.forEach(function (tk) { tk._w = mw(tk.t, fs, tk.a ? 650 : 500, TEXTF); });
    var spaceW = mw(' ', fs, 500, TEXTF);
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      var add = (cur.length && tk.sp ? spaceW : 0) + tk._w;
      if (cur.length && w + add > maxW) { lines.push(cur); cur = []; w = tk._w; }
      else w += add;
      cur.push(tk);
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  /* ============================================================
     hero word
     ============================================================ */
  function buildWord(heroG, word, maxW, maxFont, baseY, isKo) {
    var chars = Array.from(word);
    var n = chars.length;
    var TRACK = -0.016;

    var ws = chars.map(function (ch) { return mw(ch, 100, 400, DISPLAY) / 100; });
    var sum = ws.reduce(function (a, b) { return a + b; }, 0);
    var w1 = sum + TRACK * (n - 1);
    var size = Math.min(maxFont, maxW / Math.max(0.18, w1));
    size = Math.max(24, Math.round(size * 10) / 10);

    var capR = (isKo ? masc('한', 100, 900, DISPLAY) : masc('H', 100, 400, DISPLAY)) / 100;
    var CH = capR * size;

    var total = 0;
    var widths = ws.map(function (w) { return w * size; });
    widths.forEach(function (w) { total += w; });
    total += TRACK * size * (n - 1);

    heroG.setAttribute('transform', 'translate(200 ' + baseY + ')');

    var lettersG = el('g', {}, heroG);
    var letters = [];
    var x = -total / 2;
    chars.forEach(function (ch, i) {
      var w = widths[i];
      var lx = x + w / 2;
      var g = el('g', {}, lettersG);
      g.setAttribute('transform', 'translate(' + lx.toFixed(2) + ' 0)');
      var t = tx(ch, {
        x: 0, y: 0, 'text-anchor': 'middle', 'font-size': size,
        class: 'hero-txt' + (isKo ? ' ko' : '')
      }, g);
      var bb;
      try { bb = t.getBBox(); } catch (e) { bb = { x: -w / 2, y: -CH, width: w, height: CH }; }
      letters.push({
        ch: ch, g: g, t: t, x: lx, w: w, left: x, right: x + w,
        bb: { x: bb.x, y: bb.y, w: bb.width, h: bb.height },
        base: { x: lx, y: 0, ox: 0, oy: -CH * 0.5 }
      });
      x += w + TRACK * size;
    });

    return {
      size: size, CH: CH, W: total, letters: letters, lettersG: lettersG,
      word: word, isKo: isKo, baseY: baseY, track: TRACK,
      capTop: -CH, top: -CH
    };
  }

  function firstIdx(letters, chars) {
    for (var i = 0; i < letters.length; i++) if (chars.indexOf(letters[i].ch) >= 0) return i;
    return -1;
  }
  function bump(x, at, width) {
    var d = Math.abs(x - at) / width;
    return d >= 1 ? 0 : Math.cos(d * Math.PI / 2);
  }
  function starPath(r, w) {
    var d = '';
    for (var i = 0; i < 8; i++) {
      var a = (i * Math.PI) / 4;
      var rr = (i % 2 === 0) ? r : w;
      d += (i === 0 ? 'M' : 'L') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1) + ' ';
    }
    return d + 'Z';
  }

  /* ============================================================
     motion capacity
     ============================================================ */
  var MOTION_CAP = {
    umbrella: { maxFont: 120, maxFontKo: 100, maxW: 330, baseY: 344 },
    steps: { maxFont: 128, maxFontKo: 112, maxW: 322, baseY: 340 },
    kick: { maxFont: 132, maxFontKo: 118, maxW: 300, baseY: 336 },
    help: { maxFont: 128, maxFontKo: 114, maxW: 300, baseY: 302 },
    foot: { maxFont: 128, maxFontKo: 112, maxW: 300, baseY: 318 },
    coffee: { maxFont: 132, maxFontKo: 118, maxW: 300, baseY: 340 },
    love: { maxFont: 138, maxFontKo: 118, maxW: 316, baseY: 334 },
    cheers: { maxFont: 128, maxFontKo: 116, maxW: 310, baseY: 330 },
    sleep: { maxFont: 124, maxFontKo: 112, maxW: 300, baseY: 342 },
    rocket: { maxFont: 134, maxFontKo: 116, maxW: 306, baseY: 336 },
    christmas: { maxFont: 116, maxFontKo: 102, maxW: 312, baseY: 352 },
    newyear: { maxFont: 124, maxFontKo: 106, maxW: 304, baseY: 330 },
    pop: { maxFont: 150, maxFontKo: 132, maxW: 340, baseY: 326 }
  };

  var SCENES = {};

  /* ---------- 1. umbrella ---------- */
  SCENES.umbrella = function (c) {
    var info = c.info, CH = info.CH, W = info.W;
    var spaceAbove = (c.BASE_Y - c.TOP) - CH;           /* px available above the word */
    var gap = 40;                                        /* room for the handle under the canopy */
    var maxCanopyH = Math.max(58, spaceAbove - gap - 6);
    var CW = Math.min(118, maxCanopyH / 0.94, Math.max(76, W * 0.52));
    var chH = CW * 0.94;
    var canopyY = -CH - gap;

    /* canopy + short handle, floating above the word */
    var um = el('g', {}, c.front);
    var body = el('g', {}, um);
    el('path', {
      d: 'M' + (-CW) + ' 0 A' + CW + ' ' + chH + ' 0 0 1 ' + CW + ' 0 ' +
        'Q' + (CW * .66) + ' 15 ' + (CW * .34) + ' 0 Q0 15 ' + (-CW * .34) + ' 0 ' +
        'Q' + (-CW * .66) + ' 15 ' + (-CW) + ' 0 Z',
      class: 's-ink'
    }, body);
    el('circle', { cx: 0, cy: -chH - 1.5, r: 4.6, class: 's-acc' }, body);
    el('rect', { x: -4.5, y: 0, width: 9, height: 16, class: 's-ink' }, body);
    el('path', { d: 'M0,12 L0,18 A13 13 0 0 1 -26,18 L-26,3', 'stroke-width': 9, class: 'k-ink rnd' }, body);

    hide(um);
    c.part(um, function (n, t, ms) {
      var p = c.E.outBack(c.seg(t, 0.02, 0.42), 2.0);
      n.setAttribute('opacity', t > 0.02 ? 1 : 0);
      var sway = (t > 0.5 ? 1 : 0) * 1.6 * c.sin(ms / 900);
      c.setT(n, { x: 0, y: canopyY, ox: 0, oy: 0 }, { sy: Math.max(0.02, p), sx: .92 + .08 * p, r: (1 - p) * -4 + sway });
    });

    /* rain */
    var drops = [];
    var N = 8;
    for (var i = 0; i < N; i++) {
      var g = el('g', {}, c.front);
      el('path', { d: 'M0,-8.4 C4.2,-2.6 6.6,1.6 6.6,5.6 A6.6 6.6 0 0 1 -6.6,5.6 C-6.6,1.6 -4.2,-2.6 0,-8.4 Z', class: 's-acc' }, g);
      drops.push({
        g: g,
        x: -CW * 0.86 + (i / (N - 1)) * CW * 1.72 + (i % 2 ? 5 : -6),
        ph: i * 0.137, spd: 0.82 + (i % 3) * 0.16,
        s: 0.62 + (i % 4) * 0.13
      });
      hide(g);
    }
    c.part(c.front, function (n, t, ms) {
      var on = c.seg(t, 0.3, 0.5);
      for (var k = 0; k < drops.length; k++) {
        var d = drops[k];
        var p = ((ms / 1600) * d.spd + d.ph) % 1;
        var y = canopyY + 24 + p * (CH + 150);
        var op = on * Math.min(1, p < 0.06 ? p / 0.06 : (p > 0.8 ? (1 - p) / 0.2 : 1));
        d.g.setAttribute('opacity', (op * 0.95).toFixed(3));
        c.setT(d.g, { x: d.x, y: 0, ox: 0, oy: 0 }, { dy: y, sx: d.s, sy: d.s });
      }
    });

    /* the word sways under the umbrella */
    c.part(info.lettersG, function (n, t, ms) {
      var a = (t > 0.4 ? 1 : 0) * 1.0 * c.sin(ms / 860);
      n.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ---------- 2. steps ---------- */
  SCENES.steps = function (c) {
    var info = c.info, CH = info.CH;
    var ei = firstIdx(info.letters, ['E']);
    var stairHost, sw, sh, x0, topsBase = 0;

    if (ei >= 0) {
      var L = info.letters[ei];
      stairHost = L.g;
      sw = L.w * 1.02; sh = CH / 3; x0 = -sw / 2;
      c.hide(L.t);
    } else {
      /* no letter to morph: put the staircase beside the word and centre the pair */
      var maxTotal = 2 * c.SIDE;
      sw = 68; sh = CH / 3;
      var need = info.W + 12 + sw;
      if (need > maxTotal) {
        var sc = maxTotal / need;
        c.heroG.setAttribute('transform', 'translate(200 ' + info.baseY + ') scale(' + sc.toFixed(4) + ')');
      }
      var shift = -(sw + 12) / 2;
      info.letters.forEach(function (L) {
        L.base.x += shift;
        L.g.setAttribute('transform', 'translate(' + L.base.x.toFixed(2) + ' 0)');
      });
      x0 = info.W / 2 + 12 + shift;
      stairHost = c.back;
    }

    var step = sw / 3;
    var sg = el('g', {}, stairHost);
    el('path', {
      d: 'M' + x0 + ' 0 L' + x0 + ' ' + (-sh) + ' L' + (x0 + step) + ' ' + (-sh) +
        ' L' + (x0 + step) + ' ' + (-2 * sh) + ' L' + (x0 + 2 * step) + ' ' + (-2 * sh) +
        ' L' + (x0 + 2 * step) + ' ' + (-3 * sh) + ' L' + (x0 + sw) + ' ' + (-3 * sh) +
        ' L' + (x0 + sw) + ' 0 Z',
      class: 's-ink'
    }, sg);
    hide(sg);

    var dot = el('circle', { r: Math.max(7, CH * 0.085), class: 's-acc' }, stairHost);
    hide(dot);

    var tops = [
      { x: x0 + step * 0.5, y: -sh },
      { x: x0 + step * 1.5, y: -2 * sh },
      { x: x0 + step * 2.5, y: -3 * sh }
    ];
    var r0 = Math.max(7, CH * 0.085);

    c.part(sg, function (n, t) {
      var p = c.E.outBack(c.seg(t, 0.05, 0.38), 1.9);
      n.setAttribute('opacity', t > 0.05 ? 1 : 0);
      n.setAttribute('transform', 'translate(0 0) scale(1 ' + Math.max(0.02, p) + ') translate(0 0)');
    });

    c.part(dot, function (n, t, ms) {
      var on = c.seg(t, 0.12, 0.22);
      n.setAttribute('opacity', on);
      var p = c.seg(t, 0.12, 0.9);
      var hopIdx = Math.min(2, Math.floor(p * 3));
      var lp = c.c01(p * 3 - hopIdx);
      var from = hopIdx === 0 ? { x: x0 + step * 0.5, y: 0 } : tops[hopIdx - 1];
      var to = tops[hopIdx];
      var x = c.lerp(from.x, to.x, lp);
      var y = c.lerp(from.y, to.y, lp) - Math.sin(lp * Math.PI) * (CH * 0.30);
      if (p >= 1) y = to.y - 5 - 2 * Math.sin(ms / 420);
      n.setAttribute('cx', x.toFixed(2));
      n.setAttribute('cy', (y - r0).toFixed(2));
      var sq = lp > 0.84 ? 1 + 0.2 * Math.sin(Math.PI * c.c01((lp - 0.84) / 0.16)) : 1;
      n.setAttribute('r', (r0 * sq).toFixed(2));
    });
  };

  /* ---------- 3. kick ---------- */
  SCENES.kick = function (c) {
    var info = c.info, CH = info.CH, size = info.size;
    var ki = firstIdx(info.letters, ['K']);
    var ball = el('circle', { r: 10, class: 's-acc' }, c.front);
    var lines = el('g', {}, c.front);
    var lk = 0;
    for (var s = 0; s < 3; s++) {
      el('path', { d: 'M0 0 L-24 0', 'stroke-width': 3.2, class: 'k-acc rnd', transform: 'translate(0 ' + ((s - 1) * 12) + ')' }, lines);
    }
    hide(lines);

    var endX, endY, startX, startY;

    if (ki >= 0) {
      var L = info.letters[ki];
      var kb = L.bb;
      var stem = Math.max(11, kb.w * 0.255);
      var jx = kb.x + stem * 0.92, jy = kb.y + kb.h * 0.5;
      var armW = stem * 1.04;

      var kg = el('g', {}, L.g);
      el('rect', { x: kb.x, y: kb.y, width: stem, height: kb.h, class: 's-ink' }, kg);
      el('path', { d: 'M' + jx + ' ' + jy + ' L' + (kb.x + kb.w - armW * 0.5) + ' ' + (kb.y + armW * 0.45), 'stroke-width': armW, class: 'k-ink' }, kg);
      var legG = el('g', {}, kg);
      el('path', { d: 'M' + jx + ' ' + jy + ' L' + (kb.x + kb.w - armW * 0.5) + ' ' + (kb.y + kb.h - armW * 0.45), 'stroke-width': armW, class: 'k-ink' }, legG);
      c.hide(L.t);
      hide(kg);

      startX = kb.x + kb.w + stem * 0.5; startY = kb.y + kb.h - stem * 0.4;
      endX = Math.min(c.SIDE - 12, kb.x + kb.w + 78); endY = kb.y - 26;

      c.part(kg, function (n, t) {
        var p = c.seg(t, 0.04, 0.22);
        n.setAttribute('opacity', p);
        var e = c.E.outCubic(p);
        c.setT(n, { x: 0, y: 0, ox: 0, oy: -CH * 0.5 }, { sx: .88 + .12 * e, sy: .88 + .12 * e });
      });

      c.part(legG, function (n, t) {
        var wind = c.E.outCubic(c.seg(t, 0.1, 0.3));
        var kick = c.E.outQuart(c.seg(t, 0.28, 0.5));
        var back = c.E.outCubic(c.seg(t, 0.64, 0.95));
        var ang = 14 * wind - 40 * kick + 26 * back;
        ang = Math.max(-42, Math.min(20, ang));
        n.setAttribute('transform', 'translate(' + jx + ' ' + jy + ') rotate(' + ang.toFixed(2) + ') translate(' + (-jx) + ' ' + (-jy) + ')');
      });
    } else {
      startX = info.W / 2 - 6; startY = -CH * 0.28;
      endX = Math.min(c.SIDE - 34, info.W / 2 + 46); endY = -CH - 30;
    }

    var br = Math.max(9, size * 0.135);
    ball.setAttribute('r', br);

    c.part(ball, function (n, t) {
      var hit = c.seg(t, 0.34, 0.4);
      var p = c.E.outQuart(c.seg(t, 0.38, 0.92));
      var x = c.lerp(startX, endX, p);
      var y = c.lerp(startY, endY, p) - Math.sin(p * Math.PI) * (CH * 0.22);
      if (t >= 0.92) y = endY - 3 - 2.4 * Math.sin((t - 0.92) * 22);
      n.setAttribute('opacity', hit > 0 ? 1 : 0.001);
      n.setAttribute('cx', x.toFixed(2));
      n.setAttribute('cy', y.toFixed(2));
      n.setAttribute('opacity', hit > 0 ? 1 : 0.001);
      n.setAttribute('r', (br * (1 + 0.22 * bump(t, 0.42, 0.09))).toFixed(2));
    });

    c.part(lines, function (n, t) {
      var p = c.seg(t, 0.4, 0.62);
      var fade = c.seg(t, 0.62, 0.85);
      n.setAttribute('opacity', (p * (1 - fade) * 0.9).toFixed(3));
      n.setAttribute('transform', 'translate(' + (startX - 16 + p * 30) + ' ' + (startY - 4 - p * 22) + ') rotate(-28) scale(' + (0.7 + p * 0.7) + ')');
    });

    c.part(info.lettersG, function (n, t) {
      var j = bump(t, 0.4, 0.15);
      var settle = c.E.outCubic(c.seg(t, 0.45, 0.85));
      n.setAttribute('transform', 'translate(' + (j * 5).toFixed(2) + ' ' + (-Math.max(0, j) * 3).toFixed(2) +
        ') rotate(' + (-1.4 * j - 1.6 * settle).toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ---------- 4. help ---------- */
  SCENES.help = function (c) {
    var info = c.info, CH = info.CH;
    var pi = firstIdx(info.letters, ['P']);
    var gx;

    if (pi >= 0) {
      var L = info.letters[pi];
      c.hide(L.t);
      gx = L.left - 2;
    } else {
      var last = info.letters[info.letters.length - 1];
      gx = clamp(last.x, -c.SIDE + 30, c.SIDE - 30);
    }

    var k = Math.max(0.82, Math.min(1.5, CH / 96));
    var fig = el('g', {}, c.front);
    var inner = el('g', {}, fig);
    el('path', { d: 'M-16 2 L-8 31 M16 2 L8 31', 'stroke-width': 9.6, class: 'k-ink rnd' }, inner);
    el('circle', { cx: 0, cy: 20, r: 10.6, class: 's-ink' }, inner);
    el('path', { d: 'M0 31 L0 60', 'stroke-width': 9.6, class: 'k-ink rnd' }, inner);
    el('path', { d: 'M0 60 L-14 80 L-8 96', 'stroke-width': 9.6, class: 'k-ink rnd' }, inner);
    el('path', { d: 'M0 60 L15 78 L9 96', 'stroke-width': 9.6, class: 'k-ink rnd' }, inner);
    el('circle', { cx: -8, cy: 97, r: 4.8, class: 's-acc' }, inner);
    el('circle', { cx: 9, cy: 97, r: 4.8, class: 's-acc' }, inner);

    hide(fig);
    c.part(fig, function (n, t, ms) {
      var p = c.E.outBack(c.seg(t, 0.14, 0.5), 2.2);
      n.setAttribute('opacity', p > 0 ? 1 : 0);
      var swing = (t > 0.45 ? 1 : 0) * (12 * c.sin(ms / 640) * Math.exp(-((ms / 2800) % 1) * 1.1));
      var r = (1 - c.c01(p)) * 12 + swing;
      c.setT(n, { x: gx, y: 1, ox: 0, oy: 2 }, { r: r, sx: k * (.45 + .55 * c.c01(p)), sy: k * (.45 + .55 * c.c01(p)) });
    });

    c.part(info.lettersG, function (n, t) {
      var up = c.E.outCubic(c.seg(t, 0.1, 0.45));
      var r = 1.2 * up;
      n.setAttribute('transform', 'translate(0 ' + (-5 * up).toFixed(2) + ') rotate(' + r.toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ---------- 5. foot ---------- */
  function footprint(host, w, h, cls) {
    var g = el('g', {}, host);
    var inner = el('g', { transform: 'scale(' + (w / 100) + ' ' + (h / 140) + ') translate(0 -140)' }, g);
    el('path', {
      d: 'M50 6 C64 6 74 16 74 32 C74 48 66 58 64 72 C62 86 66 98 64 112 C62 128 54 138 44 138 C32 138 24 128 24 112 C24 98 30 88 32 74 C34 60 26 48 26 34 C26 16 36 6 50 6 Z',
      class: cls || 's-ink'
    }, inner);
    el('circle', { cx: 76, cy: 12, r: 8.6, class: cls || 's-ink' }, inner);
    el('circle', { cx: 62, cy: 3, r: 7.2, class: cls || 's-ink' }, inner);
    el('circle', { cx: 48, cy: 0, r: 6.6, class: cls || 's-ink' }, inner);
    el('circle', { cx: 34, cy: 3, r: 5.6, class: cls || 's-ink' }, inner);
    el('circle', { cx: 21, cy: 11, r: 4.6, class: cls || 's-ink' }, inner);
    return g;
  }

  SCENES.foot = function (c) {
    var info = c.info, CH = info.CH;
    var fi = -1;
    for (var i = 0; i < info.letters.length; i++) { if (info.letters[i].ch === 'f') { fi = i; break; } }

    if (fi >= 0) {
      var L = info.letters[fi];
      c.hide(L.t);
      var fpW = Math.min(L.w * 1.12, CH * 0.72), fpH = CH * 1.02;
      var fp = footprint(L.g, fpW, fpH, 's-ink');
      hide(fp);
      c.part(fp, function (n, t) {
        var p = c.E.outBack(c.seg(t, 0.04, 0.3), 2.4);
        n.setAttribute('opacity', t > 0.04 ? 1 : 0);
        c.setT(n, { x: L.bb.x + L.w * 0.18, y: 0, ox: 0, oy: 0 }, {
          dy: -fpH * 0.35 * (1 - c.c01(p)),
          sy: Math.max(0.02, p), sx: .9 + .1 * c.c01(p), r: (1 - c.c01(p)) * -8
        });
      });

      /* walking ghosts behind */
      var ghosts = [];
      [[-2.25, 0.16], [-3.15, 0.1]].forEach(function (gdef) {
        var gg = footprint(c.front, fpW * 0.66, fpH * 0.66, 's-ink');
        hide(gg);
        ghosts.push({ g: gg, dx: L.bb.x + fpW * gdef[0], op: gdef[1] });
      });
      c.part(c.front, function (n, t) {
        ghosts.forEach(function (gh, gi) {
          var p = c.seg(t, 0.42 + gi * 0.14, 0.72 + gi * 0.14);
          gh.g.setAttribute('opacity', (p * gh.op).toFixed(3));
          c.setT(gh.g, { x: gh.dx + 26 * p, y: 0, ox: 0, oy: 0 }, { sx: 1, sy: 1 });
        });
      });
    } else {
      /* a trail of prints under the word */
      var trail = [];
      var spots = [
        { x: -info.W * 0.34, y: 54, s: 0.78, r: -9, op: 0.26 },
        { x: -info.W * 0.06, y: 74, s: 0.9, r: 7, op: 0.5 },
        { x: info.W * 0.22, y: 52, s: 1.0, r: -6, op: 1 }
      ];
      spots.forEach(function (sp, i) {
        var pw = CH * 0.23, ph = CH * 0.33;
        var g = footprint(c.front, pw * sp.s, ph * sp.s, 's-ink');
        g.setAttribute('opacity', '0');
        trail.push({ g: g, sp: sp, i: i });
      });
      c.part(c.front, function (n, t) {
        trail.forEach(function (tr) {
          var p = c.E.outBack(c.seg(t, 0.18 + tr.i * 0.16, 0.5 + tr.i * 0.16), 2.2);
          tr.g.setAttribute('opacity', (Math.min(1, p * 2) * tr.sp.op).toFixed(3));
          c.setT(tr.g, { x: tr.sp.x, y: tr.sp.y, ox: 0, oy: 0 }, { r: tr.sp.r, sx: .7 + .3 * c.c01(p), sy: .7 + .3 * c.c01(p) });
        });
      });
    }

    /* the word takes a step */
    c.part(info.lettersG, function (n, t) {
      var step1 = c.seg(t, 0.28, 0.6);
      var step2 = c.seg(t, 0.66, 0.96);
      var lift = Math.sin(c.c01(step1) * Math.PI) * 9 + Math.sin(c.c01(step2) * Math.PI) * 5;
      var dx = 10 * c.E.outCubic(step1) + 3 * c.E.outCubic(step2);
      var r = -1.6 * Math.sin(c.c01(step1) * Math.PI) - 1.0 * Math.sin(c.c01(step2) * Math.PI);
      n.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' ' + (-lift).toFixed(2) + ') rotate(' + r.toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ---------- 6. coffee ---------- */
  SCENES.coffee = function (c) {
    var info = c.info, CH = info.CH, W = info.W;

    var grad = el('radialGradient', { id: c.uid + 'g' }, c.defs);
    el('stop', { offset: '0', style: 'stop-color:var(--acc);stop-opacity:.22' }, grad);
    el('stop', { offset: '1', style: 'stop-color:var(--acc);stop-opacity:0' }, grad);
    var glow = el('ellipse', { cx: 0, cy: -CH * 0.45, rx: Math.max(W * 0.62, 150), ry: CH * 1.35, fill: 'url(#' + c.uid + 'g)' }, c.back);
    c.part(glow, function (n, t, ms) {
      n.setAttribute('opacity', (c.seg(t, 0.1, 0.6) * (0.72 + 0.28 * c.sin(ms / 1400))).toFixed(3));
    });

    var anchors = [];
    info.letters.forEach(function (l) { if (l.ch === 'O' || l.ch === 'o' || l.ch === '0') anchors.push(l.x); });
    if (!anchors.length) {
      anchors = info.isKo || W < 200 ? [0] : [-W * 0.16, W * 0.16];
    }

    var wisps = [];
    anchors.forEach(function (ax, ai) {
      for (var k = 0; k < 4; k++) {
        var g = el('g', {}, c.front);
        el('path', { d: 'M0 0 C-9 -15 9 -26 0 -40', 'stroke-width': 5, class: 'k-acc rnd' }, g);
        wisps.push({ g: g, x: ax + (k - 1.5) * 13, ph: ai * 0.29 + k * 0.21, s: 0.78 + k * 0.11 });
        hide(g);
      }
    });
    c.part(c.front, function (n, t, ms) {
      var on = c.seg(t, 0.22, 0.5);
      wisps.forEach(function (w) {
        var p = ((ms / 2100) + w.ph) % 1;
        var op = on * Math.min(1, p < 0.2 ? p / 0.2 : (p > 0.7 ? (1 - p) / 0.3 : 1)) * 0.82;
        w.g.setAttribute('opacity', op.toFixed(3));
        var y = -CH - 3 - p * 50;
        c.setT(w.g, { x: w.x + c.sin(p * 7 + w.ph * 9) * 5, y: 0, ox: 0, oy: 0 }, { dy: y, sy: 0.68 + p * 0.7, sx: w.s });
      });
    });

    c.part(info.lettersG, function (n, t, ms) {
      var a = c.seg(t, 0, 0.5);
      n.setAttribute('transform', 'translate(0 ' + (a * 2.2 * c.sin(ms / 1150)).toFixed(2) + ')');
    });
  };

  /* ---------- 7. love ---------- */
  var HEART_D = 'M0 40 C-10 28 -48 4 -48 -22 C-48 -44 -28 -52 -13 -44 C-5 -40 -1 -33 0 -26 C1 -33 5 -40 13 -44 C28 -52 48 -44 48 -22 C48 4 10 28 0 40 Z';

  SCENES.love = function (c) {
    var info = c.info, CH = info.CH, W = info.W;
    var oi = firstIdx(info.letters, ['O', 'o', '0']);

    function beat(t) {
      return 0.2 * bump(t, 0.26, 0.1) + 0.13 * bump(t, 0.46, 0.11);
    }

    if (oi >= 0) {
      var L = info.letters[oi];
      var gb = L.bb;
      var cx = gb.x + gb.w / 2, cy = gb.y + gb.h / 2;
      var hs = Math.max(gb.w / 96, gb.h / 92) * 1.18;
      c.hide(L.t);
      var hg = el('g', {}, L.g);
      el('path', {
        d: HEART_D, class: 's-acc',
        transform: 'translate(' + cx + ' ' + cy + ') scale(' + hs.toFixed(4) + ') translate(0 6)'
      }, hg);
      hide(hg);

      var ring = el('circle', { cx: cx, cy: cy, r: Math.max(gb.w, gb.h) * 0.62, fill: 'none', 'stroke-width': 2.2, class: 'k-acc' }, c.front);
      hide(ring);

      c.part(hg, function (n, t, ms) {
        var p = c.E.outElastic(c.seg(t, 0.12, 0.55));
        n.setAttribute('opacity', p > 0.02 ? 1 : 0);
        var pulse = t > 0.55 ? 0.05 * c.sin(ms / 300) : 0;
        var k = (0.55 + 0.45 * c.c01(p)) * (1 + beat(t) + pulse);
        c.setT(n, { x: 0, y: 0, ox: 0, oy: -CH * 0.5 }, { sy: k, sx: k });
      });

      c.part(ring, function (n, t, ms) {
        var loop = ((ms / 1600) % 1);
        var on = c.seg(t, 0.5, 0.7);
        n.setAttribute('opacity', (on * (1 - loop) * 0.38).toFixed(3));
        n.setAttribute('r', (Math.max(gb.w, gb.h) * 0.62 + loop * 40).toFixed(2));
      });
    } else {
      /* hearts rise out of the word */
      var hearts = [];
      var xs = [-0.3, 0.02, 0.3];
      xs.forEach(function (fx, i) {
        var h2 = el('g', {}, c.front);
        var sz = Math.min(CH * 0.42, 46) * (0.75 + 0.25 * (i % 2));
        var s2 = sz / 100;
        el('path', { d: HEART_D, class: 's-acc', transform: 'scale(' + s2 + ')' }, h2);
        hearts.push({ g: h2, x: clamp(fx * W, -160, 160), ph: i * 0.29, s: s2 });
        hide(h2);
      });
      c.part(c.front, function (n, t, ms) {
        var on = c.seg(t, 0.18, 0.4);
        hearts.forEach(function (h) {
          var p = ((ms / 2400) + h.ph) % 1;
          var op = on * Math.min(1, p < 0.15 ? p / 0.15 : (p > 0.62 ? (1 - p) / 0.38 : 1)) * 0.95;
          h.g.setAttribute('opacity', op.toFixed(3));
          var x = h.x + c.sin(p * 7 + h.ph * 8) * 5;
          var y = -CH - 18 - p * 74;
          var sc = (0.85 + 0.35 * p) * (1 + beat(t) * 0.5);
          c.setT(h.g, { x: x, y: y, ox: 0, oy: 0 }, { sx: sc, sy: sc, r: -5 * c.sin(p * 5) });
        });
      });
    }

    /* the word thumps */
    c.part(info.lettersG, function (n, t) {
      var k = 1 + beat(t) * 0.5;
      n.setAttribute('transform', 'translate(0 0) translate(0 ' + (-CH * 0.5) + ') scale(1 ' + k.toFixed(3) + ') translate(0 ' + (CH * 0.5) + ')');
    });
  };

  /* ---------- 8. cheers ---------- */
  SCENES.cheers = function (c) {
    var info = c.info, CH = info.CH, W = info.W;
    var rand = rng(7);

    var star = el('path', { d: starPath(64, 11), class: 's-acc' }, c.back);
    hide(star);

    /* confetti: burst, then a soft rain during the hold */
    var bits = [];
    for (var i = 0; i < 18; i++) {
      var kind = i % 3;
      var g = el('g', {}, c.back);
      var cls = (i % 2) ? 's-acc' : 's-ink';
      if (kind === 0) el('rect', { x: -4, y: -6, width: 8, height: 13, class: cls, rx: 1.5 }, g);
      else if (kind === 1) el('circle', { cx: 0, cy: 0, r: 4.8, class: cls }, g);
      else el('path', { d: 'M0 -6.5 L6 5.5 L-6 5.5 Z', class: cls }, g);
      bits.push({
        g: g, x: (rand() - 0.5) * W * 0.7, y: -CH * (0.2 + rand() * 0.7),
        vx: (rand() - 0.5) * 200, vy: -110 - rand() * 190,
        spin: (rand() - 0.5) * 900, ph: rand() * 0.12, s: 0.85 + rand() * 0.4
      });
      hide(g);
    }

    /* slow sparkles that stay after the burst */
    var sparks = [
      { x: -Math.min(W / 2 + 18, 168), y: -CH - 24, r: 11, ph: 0 },
      { x: Math.min(W / 2 + 16, 166), y: -CH * 0.85, r: 8, ph: 0.33 },
      { x: Math.min(W / 2 - 6, 150), y: 34, r: 7, ph: 0.66 }
    ].map(function (sp) {
      var g = el('path', { d: starPath(sp.r, sp.r * 0.24), class: 's-acc' }, c.front);
      hide(g);
      return { g: g, sp: sp };
    });

    c.part(star, function (n, t) {
      var p = c.seg(t, 0.02, 0.28);
      var op = p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;
      n.setAttribute('opacity', (op * 0.85).toFixed(3));
      var s = 0.4 + p * 1.3;
      c.setT(n, { x: 0, y: -CH * 0.5, ox: 0, oy: 0 }, { sy: s, sx: s, r: p * 22 });
    });

    c.part(c.back, function (n, t, ms) {
      for (var k = 0; k < bits.length; k++) {
        var b = bits[k];
        var p = c.c01((t - 0.06 - b.ph) / 0.94);
        var op;
        if (p <= 0 || p >= 1) {
          /* ambient: a few pieces keep drifting down */
          if (t >= 1 && k % 3 === 0) {
            var ap = ((ms / 2600) + b.ph * 3) % 1;
            b.g.setAttribute('opacity', (Math.sin(ap * Math.PI) * 0.9).toFixed(3));
            c.setT(b.g, { x: b.x * 0.9 + c.sin(ap * 6 + k) * 8, y: -CH - 10 + ap * (CH + 120), ox: 0, oy: 0 },
              { r: b.spin * ap * 0.3, sx: b.s, sy: b.s });
          } else {
            b.g.setAttribute('opacity', '0');
          }
          continue;
        }
        var tt = p * 1.05;
        var x = b.x + b.vx * tt;
        var y = b.y + b.vy * tt + 0.5 * 250 * tt * tt;
        op = p > 0.7 ? (1 - p) / 0.3 : Math.min(1, p * 7);
        b.g.setAttribute('opacity', op.toFixed(3));
        c.setT(b.g, { x: x, y: y, ox: 0, oy: 0 }, { r: b.spin * tt, sx: b.s, sy: b.s });
      }
      sparks.forEach(function (s) {
        var tp = ((ms / 1800) + s.sp.ph) % 1;
        var on = c.seg(t, 0.3, 0.5);
        var tw = Math.sin(tp * Math.PI);
        s.g.setAttribute('opacity', (on * tw * 0.95).toFixed(3));
        var sc = 0.6 + tw * 0.6;
        c.setT(s.g, { x: s.sp.x, y: s.sp.y, ox: 0, oy: 0 }, { sx: sc, sy: sc, r: tp * 30 });
      });
    });

    info.letters.forEach(function (L, i) {
      c.part(L.g, function (n, t) {
        var at = 0.06 + i * 0.042;
        var p = c.seg(t, at, at + 0.42);
        var h = Math.sin(p * Math.PI) * (13 + (i % 3) * 5);
        var r = (i % 2 ? 1 : -1) * Math.sin(p * Math.PI) * 5;
        c.setT(n, L.base, { dy: -h, r: r });
      });
    });
  };

  /* ---------- 9. sleep ---------- */
  SCENES.sleep = function (c) {
    var info = c.info, CH = info.CH;

    var zs = [];
    var startX = Math.min(info.W / 2 - 6, 150);
    [0, 1, 2].forEach(function (i) {
      var g = el('g', {}, c.front);
      var t = tx('Z', {
        x: 0, y: 0, 'text-anchor': 'middle', 'font-size': (20 + i * 9),
        'font-family': DISPLAY, 'font-weight': 400,
        style: 'fill:' + (i === 1 ? 'var(--acc)' : 'var(--ink)')
      }, g);
      zs.push({ g: g, i: i });
      hide(g);
    });

    c.part(c.front, function (n, t, ms) {
      var on = c.seg(t, 0.16, 0.42);
      zs.forEach(function (z, i) {
        var p = ((ms / 2600) + i * 0.3) % 1;
        var op = on * Math.min(1, p < 0.14 ? p / 0.14 : (p > 0.72 ? (1 - p) / 0.28 : 1));
        z.g.setAttribute('opacity', (op * 0.95).toFixed(3));
        var x = startX + 6 + p * 30 + c.sin(p * 5 + i) * 6;
        var y = -CH - 14 - p * 76 - i * 10;
        var s = 0.72 + p * 0.5;
        c.setT(z.g, { x: 0, y: 0, ox: 0, oy: 0 }, { dx: x, dy: y, sy: s, sx: s, r: -6 * c.sin(p * 4 + i) });
      });
    });

    c.part(info.lettersG, function (n, t, ms) {
      var p = c.E.outCubic(c.seg(t, 0.05, 0.5));
      var r = -4.2 * p;
      var dy = 9 * p + p * 1.6 * c.sin(ms / 1500);
      n.setAttribute('transform', 'translate(0 ' + dy.toFixed(2) + ') rotate(' + r.toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ---------- 10. rocket ---------- */
  SCENES.rocket = function (c) {
    var info = c.info, CH = info.CH, W = info.W;

    var body = el('g', {}, c.back);
    var inner = el('g', {}, body);
    el('rect', { x: -13, y: -30, width: 26, height: 62, rx: 5, class: 's-ink' }, inner);
    el('path', { d: 'M-13 -28 Q0 -64 13 -28 Z', class: 's-ink' }, inner);
    el('path', { d: 'M-13 8 L-27 40 L-13 33 Z', class: 's-ink' }, inner);
    el('path', { d: 'M13 8 L27 40 L13 33 Z', class: 's-ink' }, inner);
    el('circle', { cx: 0, cy: -10, r: 6.4, class: 's-bg' }, inner);
    var flame = el('path', { d: 'M-8 34 Q0 74 8 34 Q0 46 -8 34 Z', class: 's-acc' }, inner);

    hide(body);
    var trail = [];
    for (var i = 0; i < 5; i++) {
      var tg = el('circle', { cx: 0, cy: 0, r: 9 + i * 2, class: 's-mute' }, c.back);
      trail.push(tg); hide(tg);
    }

    var x0 = -Math.min(W * 0.3, 86);
    var x1 = x0 + 40;

    c.part(body, function (n, t, ms) {
      var p = c.E.inQuad(c.seg(t, 0.1, 0.9));
      n.setAttribute('opacity', (t > 0.1 && p < 1) ? 1 : 0);
      c.setT(n, { x: c.lerp(x0, x1, p), y: 200 - p * 460, ox: 0, oy: 0 }, { r: -9 });
      var f = 0.72 + 0.4 * Math.abs(c.sin(ms / 80));
      flame.setAttribute('transform', 'translate(0 34) scale(' + (0.8 + 0.25 * Math.abs(c.sin(ms / 110))) + ' ' + f + ') translate(0 -34)');
    });

    c.part(c.back, function (n, t, ms) {
      trail.forEach(function (tg, i) {
        var p = c.seg(t, 0.12 + i * 0.05, 0.95);
        var on = p > 0 && p < 1;
        tg.setAttribute('opacity', on ? (1 - p) * 0.2 : 0);
        c.setT(tg, { x: c.lerp(x0, x1, p) - 4, y: 200 - p * 460 + 30 + i * 8, ox: 0, oy: 0 }, { sx: 1, sy: 1 });
        tg.setAttribute('r', (7 + p * 13 + i * 2).toFixed(2));
      });
    });

    c.part(info.lettersG, function (n, t, ms) {
      var shake = c.seg(t, 0.1, 0.5) * (1 - c.seg(t, 0.5, 0.75));
      var dx = Math.sin(ms / 40) * 2.2 * shake;
      var lift = c.E.outCubic(c.seg(t, 0.25, 0.8)) * 9;
      var r = -2 * c.seg(t, 0.25, 0.85);
      n.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' ' + (-lift).toFixed(2) + ') rotate(' + r.toFixed(2) + ' 0 ' + (-CH * 0.5) + ')');
    });
  };

  /* ============================================================
     11. christmas — the letters themselves stack into a tree
     ============================================================ */
  function star5(r, inner) {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 5;
      var rr = (i % 2 === 0) ? r : inner;
      d += (i === 0 ? 'M' : 'L') + (Math.cos(a) * rr).toFixed(2) + ' ' + (Math.sin(a) * rr).toFixed(2) + ' ';
    }
    return d + 'Z';
  }

  SCENES.christmas = function (c) {
    var info = c.info, CH = info.CH, letters = info.letters, S = info.size;
    var chars = Array.from(info.word);
    var n = chars.length;
    var capRatio = CH / Math.max(1, S);

    /* the word repeats on tapering lines: a tree built out of the word itself */
    var rows = [{ size: S, y: 0, text: null }];                       /* bottom = the live letters */
    if (n >= 2) {
      var c1 = Math.max(1, Math.min(n - 1, Math.floor(n * 0.68)));
      rows.push({ size: S * 0.91, y: -(S * 1.03), text: chars.slice(0, c1).join('') });
    }
    if (n >= 4) {
      var c2 = Math.max(1, Math.floor(n * 0.38));
      rows.push({ size: S * 0.82, y: rows[1].y - S * 0.91 * 1.03, text: chars.slice(0, c2).join('') });
    }
    var topRow = rows[rows.length - 1];
    var topY = topRow.y - topRow.size * capRatio;

    /* ---- upper lines drop in ---- */
    var treeG = el('g', {}, c.front);
    rows.forEach(function (rd, ri) {
      if (!rd.text) return;
      var node = c.tx(rd.text, {
        x: 0, y: rd.y, 'text-anchor': 'middle', 'font-size': rd.size,
        'letter-spacing': (info.track || 0).toFixed(4) + 'em',
        class: 'hero-txt' + (info.isKo ? ' ko' : '')
      }, treeG);
      var at = 0.1 + (ri - 1) * 0.13;
      c.part(node, function (nd, t) {
        var p = c.E.outBack(c.seg(t, at, at + 0.44), 1.45);
        nd.setAttribute('opacity', c.c01(p * 1.7).toFixed(3));
        nd.setAttribute('y', (rd.y + (1 - c.c01(p)) * 36).toFixed(2));
      });
    });

    /* ---- the whole tree sways ---- */
    function sway(node, t, ms) {
      var on = c.seg(t, 0.62, 0.88);
      var a = on * 0.85 * c.sin(ms / 1250);
      node.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' 0 ' + (topY * 0.42).toFixed(1) + ')');
    }
    c.part(info.lettersG, sway);
    c.part(treeG, sway);

    /* ---- star on the apex ---- */
    var starR = Math.max(10, S * 0.2);
    var starY = topY - starR * 0.92;
    var starG = el('g', {}, c.front);
    el('path', { d: star5(starR, starR * 0.44), class: 's-acc' }, starG);
    c.part(starG, function (node, t, ms) {
      var p = c.E.outElastic(c.seg(t, 0.44, 0.74));
      var tw = 1 + 0.06 * c.sin(ms / 250);
      var sc = (0.16 + 0.84 * c.c01(p)) * tw;
      node.setAttribute('opacity', p > 0.02 ? '1' : '0');
      node.setAttribute('transform', 'translate(0 ' + starY.toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
    });

    /* sparkle glints around the star */
    [[-1.6, -0.3, 6.4, 0], [1.5, 0.55, 4.8, 0.4], [-0.75, 1.0, 3.4, 0.7]].forEach(function (g) {
      var node = el('path', { d: starPath(g[2], g[2] * 0.24), class: 's-acc' }, c.front);
      var gx = g[0] * starR, gy = starY + g[1] * starR;
      c.part(node, function (nn, t, ms) {
        var on = c.seg(t, 0.54, 0.7);
        var tw = 0.55 + 0.45 * c.sin(ms / 420 + g[3] * 9);
        nn.setAttribute('opacity', (on * tw * 0.9).toFixed(3));
        nn.setAttribute('transform', 'translate(' + gx.toFixed(1) + ' ' + gy.toFixed(1) + ') scale(' + (0.55 + 0.45 * tw).toFixed(2) + ')' +
          ' rotate(' + ((ms / 26) % 360).toFixed(0) + ')');
      });
    });

    /* ---- baubles hung under the bottom line ---- */
    var gaps = [];
    for (var i = 0; i < letters.length - 1; i++) {
      gaps.push((letters[i].base.x + letters[i].w / 2 + letters[i + 1].base.x - letters[i + 1].w / 2) / 2);
    }
    if (!gaps.length) gaps = [0];
    function nearest(target) {
      var bb = gaps[0];
      gaps.forEach(function (gx) { if (Math.abs(gx - target) < Math.abs(bb - target)) bb = gx; });
      return bb;
    }
    var hang = gaps.length > 1 ? [nearest(-info.W * 0.28), nearest(info.W * 0.28)] : gaps.slice(0, 1);
    hang.forEach(function (bx, bi) {
      var len = 14 + bi * 9, rr = 4.3 + (bi % 2) * 1.1;
      var g = el('g', {}, c.front);
      el('path', { d: 'M0 0 L0 ' + (len - 1), 'stroke-width': 1.4, class: 'k-ink rnd' }, g);
      el('circle', { cx: 0, cy: len + rr - 1, r: rr, class: 's-acc' }, g);
      el('circle', { cx: -rr * 0.34, cy: len + rr * 0.45, r: rr * 0.26, class: 's-bg' }, g);
      c.part(g, function (node, t, ms) {
        var p = c.E.outBack(c.seg(t, 0.46 + bi * 0.07, 0.7 + bi * 0.07), 2.1);
        var swing = (t > 0.72 ? 1 : 0) * 3.1 * c.sin(ms / 760 + bi * 1.7);
        node.setAttribute('opacity', p > 0.02 ? '1' : '0');
        node.setAttribute('transform', 'translate(' + bx.toFixed(1) + ' ' + ((1 - c.c01(p)) * -26).toFixed(1) + ')' +
          ' rotate(' + (swing + (1 - c.c01(p)) * 12).toFixed(2) + ' 0 0)');
      });
    });

    /* ---- snow ---- */
    var yTop = -info.baseY + 108, ySpan = 356;
    var flakes = [];
    for (var f = 0; f < 9; f++) {
      var fr = 3 + (f % 3) * 1.15;
      var g2 = el('g', {}, c.front);
      el('path', {
        d: 'M0 ' + (-fr) + ' L0 ' + fr + ' M' + (-fr) + ' 0 L' + fr + ' 0 ' +
          'M' + (-fr * 0.7) + ' ' + (-fr * 0.7) + ' L' + (fr * 0.7) + ' ' + (fr * 0.7) + ' ' +
          'M' + (fr * 0.7) + ' ' + (-fr * 0.7) + ' L' + (-fr * 0.7) + ' ' + (fr * 0.7),
        'stroke-width': 1.15, class: (f % 4 === 0 ? 'k-acc' : 'k-ink'), 'stroke-linecap': 'round'
      }, g2);
      flakes.push({ n: g2, x: -166 + ((f * 53) % 332), ph: (f * 0.137) % 1, spd: 0.8 + (f % 4) * 0.13, op: 0.3 + (f % 3) * 0.14 });
      hide(g2);
    }
    c.part(c.front, function (n2, t, ms) {
      var on = c.seg(t, 0.34, 0.6);
      for (var i = 0; i < flakes.length; i++) {
        var fl = flakes[i];
        var p = ((ms / 3000) * fl.spd + fl.ph) % 1;
        var edge = Math.min(1, p < 0.08 ? p / 0.08 : (p > 0.86 ? (1 - p) / 0.14 : 1));
        fl.n.setAttribute('opacity', (on * edge * fl.op).toFixed(3));
        var fx = fl.x + c.sin(p * 6.2 + fl.ph * 11) * 13;
        var fy = yTop + p * ySpan;
        fl.n.setAttribute('transform', 'translate(' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ') rotate(' + ((p * 190 + fl.ph * 360) % 360).toFixed(0) + ')');
      }
    });
  };
  /* ============================================================
     12. newyear — first sunrise behind the word, fireworks, luck pouch
     ============================================================ */
  SCENES.newyear = function (c) {
    var info = c.info, CH = info.CH, W = info.W;
    var hy = 76;                                        /* horizon (local y) */
    var LIFT = -(30 + Math.max(0, 96 - CH) * 0.62);      /* the type sits above the sunrise */
    var R = clamp(CH * 0.58, 46, 66);
    var sunY0 = hy + R * 1.2, sunY1 = hy - R * 0.98;

    /* ---- glow ---- */
    var grad = el('radialGradient', { id: c.uid + 'ny' }, c.defs);
    el('stop', { offset: '0', style: 'stop-color:var(--acc);stop-opacity:.4' }, grad);
    el('stop', { offset: '.48', style: 'stop-color:var(--acc);stop-opacity:.16' }, grad);
    el('stop', { offset: '1', style: 'stop-color:var(--acc);stop-opacity:0' }, grad);
    var glow = el('ellipse', { cx: 0, cy: sunY0, rx: R * 2.6, ry: R * 2.2, fill: 'url(#' + c.uid + 'ny)' }, c.back);

    /* ---- light rays (behind the type) ---- */
    var rayD = '';
    for (var i = 0; i < 9; i++) {
      var a = -Math.PI + 0.34 + i * ((Math.PI - 0.68) / 8);
      var r1 = R * 1.12, r2 = R * (1.55 + (i % 3) * 0.16);
      rayD += 'M' + (Math.cos(a) * r1).toFixed(1) + ' ' + (Math.sin(a) * r1).toFixed(1) +
        ' L' + (Math.cos(a) * r2).toFixed(1) + ' ' + (Math.sin(a) * r2).toFixed(1) + ' ';
    }
    var rays = el('path', { d: rayD, 'stroke-width': 2.6, class: 'k-acc rnd' }, c.back);

    var sun = el('circle', { cx: 0, cy: sunY0, r: R, class: 's-acc' }, c.back);
    var ring = el('circle', { cx: 0, cy: sunY0, r: R * 1.02, fill: 'none', 'stroke-width': 1.6, class: 'k-acc' }, c.back);

    function sunFrame(n, t, ms) {
      var p = c.E.outCubic(c.seg(t, 0.03, 0.64));
      var cy = c.lerp(sunY0, sunY1, p) + ((t >= 1) ? 1.6 * c.sin(ms / 1500) : 0);
      return { cy: cy, p: p };
    }
    c.part(sun, function (n, t, ms) {
      var f = sunFrame(n, t, ms);
      n.setAttribute('cy', f.cy.toFixed(2));
      n.setAttribute('r', (R * (0.9 + 0.1 * f.p)).toFixed(2));
      n.setAttribute('opacity', c.seg(t, 0.02, 0.16).toFixed(3));
    });
    c.part(glow, function (n, t, ms) {
      var f = sunFrame(n, t, ms);
      n.setAttribute('cy', f.cy.toFixed(2));
      n.setAttribute('opacity', (c.seg(t, 0.05, 0.5) * (0.8 + 0.2 * c.sin(ms / 1700))).toFixed(3));
    });
    c.part(rays, function (n, t, ms) {
      var f = sunFrame(n, t, ms);
      n.setAttribute('transform', 'translate(0 ' + f.cy.toFixed(2) + ') rotate(' + (4 * c.sin(ms / 2600)).toFixed(2) + ')');
      n.setAttribute('opacity', (c.seg(t, 0.2, 0.6) * 0.34).toFixed(3));
    });
    c.part(ring, function (n, t, ms) {
      var f = sunFrame(n, t, ms);
      n.setAttribute('cy', f.cy.toFixed(2));
      n.setAttribute('r', (R * (1.04 + 0.02 * c.sin(ms / 2100))).toFixed(2));
      n.setAttribute('opacity', (c.seg(t, 0.16, 0.55) * 0.16).toFixed(3));
    });

    /* ---- ground swallows the lower half of the sun, then the horizon ---- */
    el('rect', { x: -200, y: hy, width: 400, height: 240, class: 's-bg' }, c.back);
    el('rect', { x: -196, y: hy - 0.9, width: 392, height: 1.8, class: 's-ink', opacity: '.6' }, c.back);
    el('rect', { x: -52, y: hy + 9, width: 104, height: 1.6, class: 's-acc', opacity: '.4', rx: .8 }, c.back);
    el('rect', { x: -26, y: hy + 17, width: 52, height: 1.4, class: 's-acc', opacity: '.26', rx: .7 }, c.back);

    /* ---- letters rise out of the horizon ---- */
    info.letters.forEach(function (L, i) {
      var at = 0.08 + i * 0.042;
      c.part(L.g, function (n, t, ms) {
        var p = c.E.outCubic(c.seg(t, at, at + 0.5));
        var float = (t >= 0.85 ? 1 : 0) * 1.3 * c.sin(ms / 1150 + i * 0.55);
        var sc = 0.94 + 0.06 * p;
        c.setT(n, L.base, { dy: LIFT + (1 - p) * 62 + float, sx: sc, sy: sc });
        n.setAttribute('opacity', c.c01(p * 1.7).toFixed(3));
      });
    });

    /* ---- firework trails in the open sky ---- */
    var bursts = [
      { x: -134, y: -CH - 54, s: 1.0, at: 0.46 },
      { x: 138, y: -CH - 48, s: 0.82, at: 0.62 }
    ];
    bursts.forEach(function (b, bi) {
      var host = el('g', {}, c.front);
      var startX = b.x * 0.3, startY = hy - 6;
      var streak = el('path', { 'stroke-width': 2.2, class: 'k-acc rnd' }, host);
      var head = el('circle', { r: 3, class: 's-acc' }, host);
      var sparks = [];
      for (var j = 0; j < 10; j++) {
        var ang = -Math.PI / 2 + (j / 10) * Math.PI * 2 + bi * 0.4;
        sparks.push({ n: el('circle', { r: 2.6, class: 's-acc' }, host), a: ang, d: (34 + (j % 3) * 10) * b.s });
      }
      var twinkle = el('path', { d: starPath(11 * b.s, 2.6 * b.s), class: 's-acc' }, host);
      c.part(host, function (n, t, ms) {
        var up = c.seg(t, b.at - 0.3, b.at);
        var up2 = c.E.outCubic(up);
        var hx = c.lerp(startX, b.x, up2);
        var hyy = c.lerp(startY, b.y, c.E.inQuad(up)) + c.sin(up * Math.PI) * 5;
        head.setAttribute('cx', hx.toFixed(1));
        head.setAttribute('cy', hyy.toFixed(1));
        head.setAttribute('opacity', (up > 0 && up < 1) ? '1' : '0');
        streak.setAttribute('d', 'M' + startX + ' ' + startY + ' L' + hx.toFixed(1) + ' ' + hyy.toFixed(1));
        streak.setAttribute('opacity', (up > 0 && up < 1 ? 0.5 : 0).toFixed(2));
        var bp = c.E.outQuart(c.seg(t, b.at, b.at + 0.24));
        var fade = 1 - c.seg(t, b.at + 0.28, b.at + 0.52);
        sparks.forEach(function (sp) {
          sp.n.setAttribute('cx', (b.x + Math.cos(sp.a) * sp.d * bp).toFixed(1));
          sp.n.setAttribute('cy', (b.y + Math.sin(sp.a) * sp.d * bp + bp * bp * 12).toFixed(1));
          sp.n.setAttribute('opacity', (bp > 0 ? fade * 0.95 : 0).toFixed(3));
          sp.n.setAttribute('r', (3 * (1 - 0.35 * bp)).toFixed(2));
        });
        var tg = c.c01((t - b.at - 0.18) / 0.12);
        var tw = 0.5 + 0.5 * c.sin(ms / 500 + bi * 2);
        twinkle.setAttribute('opacity', (tg * tw * 0.95).toFixed(3));
        twinkle.setAttribute('transform', 'translate(' + b.x + ' ' + b.y + ') scale(' + (0.6 + 0.5 * tw).toFixed(2) + ') rotate(' + ((ms / 40) % 360).toFixed(0) + ')');
      });
    });

    /* ---- luck pouch on the ground, right of the word ---- */
    var px = clamp(W / 2 - 2, 44, 146);
    var pouch = el('g', {}, c.front);
    el('path', {
      d: 'M0 0 C-15 2 -25 15 -25 29 C-25 43 -13 51 0 51 C13 51 25 43 25 29 C25 15 15 2 0 0 Z',
      class: 's-acc', stroke: 'currentColor', 'stroke-opacity': '.5', 'stroke-width': 1.6
    }, pouch);
    el('rect', { x: -10, y: -12, width: 20, height: 15, rx: 5, class: 's-acc' }, pouch);
    el('rect', { x: -13, y: -3.5, width: 26, height: 5.4, rx: 2.7, class: 's-ink' }, pouch);
    el('path', { d: 'M-13 -1 C-21 -9 -26 1 -15 3 Z', class: 's-ink' }, pouch);
    el('path', { d: 'M13 -1 C21 -9 26 1 15 3 Z', class: 's-ink' }, pouch);
    el('path', { d: 'M-13 21 C-17 27 -15 35 -8 39', 'stroke-width': 2.6, style: 'stroke:var(--stage-bg);opacity:.75', fill: 'none', 'stroke-linecap': 'round' }, pouch);
    c.part(pouch, function (n, t, ms) {
      var p = c.E.outBack(c.seg(t, 0.48, 0.76), 1.9);
      var bob = (t > 0.8 ? 1 : 0) * 1.3 * c.sin(ms / 900);
      n.setAttribute('opacity', p > 0.02 ? '1' : '0');
      n.setAttribute('transform', 'translate(' + px.toFixed(1) + ' ' + (hy - 2 + (1 - c.c01(p)) * 30 + bob).toFixed(1) + ')' +
        ' scale(' + (0.7 + 0.3 * c.c01(p)).toFixed(2) + ') rotate(' + ((1 - c.c01(p)) * -10).toFixed(1) + ')');
    });

    /* sparkles drifting up out of the pouch mouth */
    var sh = [];
    for (var i2 = 0; i2 < 5; i2++) {
      var node = el('path', { d: starPath(3.4 + (i2 % 2), 1.1), class: 's-acc' }, c.front);
      sh.push({ n: node, ph: i2 * 0.21, x: px + (i2 - 2) * 5 });
      hide(node);
    }
    c.part(c.front, function (n, t, ms) {
      var on = c.seg(t, 0.64, 0.84);
      sh.forEach(function (s2, i) {
        var p = ((ms / 2400) + s2.ph) % 1;
        var edge = Math.min(1, p < 0.15 ? p / 0.15 : (p > 0.7 ? (1 - p) / 0.3 : 1));
        s2.n.setAttribute('opacity', (on * edge * 0.95).toFixed(3));
        s2.n.setAttribute('transform', 'translate(' + (s2.x + c.sin(p * 6 + i) * 6).toFixed(1) + ' ' +
          (hy + 4 - p * 86).toFixed(1) + ') scale(' + (0.7 + 0.5 * p).toFixed(2) + ')');
      });
    });
  };

  /* ---------- fallback: letters rise ---------- */
  SCENES.pop = function (c) {
    var info = c.info;
    info.letters.forEach(function (L, i) {
      c.part(L.g, function (n, t, ms) {
        var at = 0.04 + i * 0.055;
        var p = c.seg(t, at, at + 0.55);
        var e = c.E.outBack(p, 2.2);
        var float = (t >= 1 ? 1 : 0) * Math.sin(ms / 900 + i * 0.6) * 1.6;
        c.setT(n, L.base, {
          dy: (1 - e) * 46 + float,
          r: (1 - e) * 7,
          sx: .82 + .18 * c.c01(e), sy: .82 + .18 * c.c01(e)
        });
        n.setAttribute('opacity', c.c01(p * 2));
      });
    });
  };

  window.TypoPop = window.TypoPop || {};
  window.TypoPop.render = render;
})();
