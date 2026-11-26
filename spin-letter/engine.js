/* =========================================================================
   별빛 엔진 (starlight engine) — spin-letter / spin-flip 공용
   바닐라 JS + Canvas2D + Web Audio. 외부 의존성 없음.
   ========================================================================= */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var D2R = Math.PI / 180;

  /* ---------------- utils ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function wrapDeg(d) {
    d = ((d + 180) % 360 + 360) % 360 - 180;
    return d;
  }

  var PALETTE = [
    '#FF7FA8', '#FFC96B', '#6FE3FF', '#B78CFF', '#86F7A8',
    '#FF9E7A', '#8DA2FF', '#FFE9B0', '#63E0D6', '#FFA6C9'
  ];

  /* ---------------- sprites ---------------- */
  var spriteCache = {};

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function makeSprite(color, sharp) {
    var key = (sharp ? 'sharp:' : '') + color;
    if (spriteCache[key]) return spriteCache[key];
    var S = 64;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var rgb = hexToRgb(color);
    var grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    if (sharp) {
      grad.addColorStop(0.0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.42, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',1)');
      grad.addColorStop(0.66, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.92)');
      grad.addColorStop(0.80, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.26)');
      grad.addColorStop(1.0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    } else {
      grad.addColorStop(0.0, 'rgba(255,255,255,0.98)');
      grad.addColorStop(0.13, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.98)');
      grad.addColorStop(0.30, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.48)');
      grad.addColorStop(0.58, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.10)');
      grad.addColorStop(1.0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    }
    g.fillStyle = grad;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2, 0, TAU);
    g.fill();
    spriteCache[key] = c;
    return c;
  }

  /* ---------------- projection ---------------- */
  // world -> screen. focal = camera distance in world units (perspective strength)
  function project(x, y, z, view) {
    var cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
    var x1 = x * cy + z * sy;
    var z1 = -x * sy + z * cy;
    var cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
    var y1 = y * cp - z1 * sp;
    var z2 = y * sp + z1 * cp;
    var focal = view.focal || 5;
    var k = focal / (focal + z2 * view.depthScale);
    return { x: view.cx + x1 * view.scale * k, y: view.cy - y1 * view.scale * k, z: z2, k: k };
  }

  /* ---------------- particle field ---------------- */
  /**
   * points: [{x,y,z,color,size}]  (world coords, roughly inside [-1,1])
   */
  function Field(points, opt) {
    opt = opt || {};
    var n = points.length;
    var ps = new Array(n);
    var spread = opt.spread || 1.25;
    for (var i = 0; i < n; i++) {
      var p = points[i];
      // scattered position: ellipsoid volume, hollow-ish centre for airy look
      var u = rand(-1, 1), th = rand(0, TAU), r = Math.cbrt(Math.random());
      var rr = Math.sqrt(Math.max(0, 1 - u * u));
      var rad = 0.42 + 0.58 * r;
      ps[i] = {
        tx: p.x, ty: p.y, tz: p.z || 0,
        ox: rr * Math.cos(th) * spread * rad,
        oy: u * spread * 0.86 * rad,
        oz: rr * Math.sin(th) * spread * 0.78 * rad,
        color: p.color || PALETTE[(Math.random() * PALETTE.length) | 0],
        size: p.size || rand(1.5, 3.0),
        sharp: !!p.sharp,
        phase: rand(0, TAU),
        spd: rand(0.06, 0.22) * (Math.random() < 0.5 ? -1 : 1),
        bph: rand(0, TAU),
        bra: rand(0.02, 0.06),
        c: 0,
        x: 0, y: 0, z: 0, k: 1, a: 1
      };
    }
    var spriteKeys = {}, col, key;
    for (i = 0; i < n; i++) {
      col = ps[i].color; key = (ps[i].sharp ? 'sharp:' : '') + col;
      if (!spriteKeys[key]) spriteKeys[key] = makeSprite(col, ps[i].sharp);
    }

    return {
      list: ps,
      sprites: spriteKeys,
      set(points2) {
        // rebuild in place (keeps object identity for the loop)
        var m = points2.length;
        for (var j = 0; j < m && j < ps.length; j++) {
          ps[j].tx = points2[j].x;
          ps[j].ty = points2[j].y;
          ps[j].tz = points2[j].z || 0;
          ps[j].size = points2[j].size || ps[j].size;
          if (points2[j].color) { ps[j].color = points2[j].color; if (!spriteKeys[ps[j].color]) spriteKeys[ps[j].color] = makeSprite(ps[j].color); }
        }
        this.count = Math.min(m, ps.length);
      },
      count: n
    };
  }

  function updateField(field, time, dt, gather, shake) {
    var ps = field.list, n = field.count;
    var breathe = 1 + 0.035 * Math.sin(time * 0.55);
    for (var i = 0; i < n; i++) {
      var p = ps[i];
      var g = gather;
      // scattered cloud slowly turns and breathes
      var ang = time * p.spd * 0.28 + p.phase * 0.3;
      var ca = Math.cos(ang), sa = Math.sin(ang);
      var ox = p.ox * ca - p.oz * sa;
      var oz = p.ox * sa + p.oz * ca;
      var oy = p.oy + Math.sin(time * 0.7 + p.bph) * 0.06 * (1 - g);
      var loose = 1 - g;
      var wob = Math.sin(time * 1.4 + p.phase) * 0.02 * loose + Math.sin(time * 0.9 + p.phase * 2) * 0.012;
      p.x = p.tx + (ox * breathe - p.tx) * loose + wob * (1 + Math.abs(ox));
      p.y = p.ty + (oy * breathe - p.ty) * loose + wob * 0.8;
      p.z = p.tz + (oz * breathe - p.tz) * loose;
      // gentle twinkle (sharp particles stay steady so letters read cleanly)
      p.a = p.sharp ? 0.95 : (0.72 + 0.28 * Math.sin(time * (1.1 + (i % 7) * 0.12) + p.phase) * (0.4 + 0.6 * g) + (1 - g) * 0.1);
      if (shake) {
        p.x += Math.sin(time * 37 + p.phase * 9) * shake;
        p.y += Math.cos(time * 43 + p.phase * 7) * shake;
      }
    }
  }

  function drawField(ctx, field, view) {
    var ps = field.list, n = field.count, sprites = field.sprites;
    var depth = view.depthAlpha == null ? 0.55 : view.depthAlpha;
    var glow = view.glow == null ? 1 : view.glow;
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var p = ps[i];
      var s = project(p.x, p.y, p.z, view);
      p.sx = s.x; p.sy = s.y;
      var near = clamp(1 - (s.z + 2) / 4, 0, 1); // 0 far .. 1 near
      var al = p.a * lerp(1 - depth * 0.5, 1, near);
      if (al <= 0.012) continue;
      var rad = p.size * (0.55 + 0.45 * s.k) * glow;
      if (rad < 0.4) continue;
      var img = sprites[(p.sharp ? 'sharp:' : '') + p.color];
      if (!img) img = sprites[p.color];
      ctx.globalAlpha = clamp(al, 0, 1) * 0.88;
      ctx.drawImage(img, s.x - rad, s.y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- text sampling ---------------- */
  var FONT = '"Apple SD Gothic Neo","Malgun Gothic","NanumGothic","Nanum Gothic","Pretendard",system-ui,-apple-system,"Segoe UI",sans-serif';

  function wrapText(text, ctx, maxW) {
    var paragraphs = String(text).split('\n');
    var out = [];
    for (var pi = 0; pi < paragraphs.length; pi++) {
      var words = paragraphs[pi].split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); continue; }
      var line = '';
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var candidate = line ? line + ' ' + w : w;
        if (ctx.measureText(candidate).width <= maxW) { line = candidate; continue; }
        if (line) { out.push(line); line = ''; }
        // word alone too wide -> break by characters
        if (ctx.measureText(w).width > maxW) {
          var chunk = '';
          for (var ci = 0; ci < w.length; ci++) {
            if (ctx.measureText(chunk + w[ci]).width > maxW && chunk) { out.push(chunk); chunk = w[ci]; }
            else chunk += w[ci];
          }
          line = chunk;
        } else {
          line = w;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  var textCanvas = null, textCtx = null;

  /**
   * Renders text to particles.
   * returns { pts:[{x,y}], w:aspect, h:1 }
   * pts are normalised: y in [-0.5,0.5], x in [-w/2, w/2]
   */
  function sampleText(text, opt) {
    opt = opt || {};
    var target = opt.count || 900;
    var maxLines = opt.maxLines || 2;
    var weight = opt.weight || 800;
    var boxW = opt.boxW || 900;
    if (!textCanvas) { textCanvas = document.createElement('canvas'); textCtx = textCanvas.getContext('2d', { willReadFrequently: true }); }
    var g = textCtx;
    var t = String(text == null ? '' : text).replace(/[ \t]+/g, ' ').trim();
    if (!t) return { pts: [], w: 1, h: 1 };

    var fs = opt.fontSize || 140;
    var lines = [];
    var widest = 0;
    for (var guard = 0; guard < 44; guard++) {
      g.font = weight + ' ' + fs.toFixed(1) + 'px ' + FONT;
      lines = wrapText(t, g, boxW * 0.92);
      widest = 0;
      for (var i = 0; i < lines.length; i++) widest = Math.max(widest, g.measureText(lines[i]).width);
      if (lines.length <= maxLines && widest <= boxW * 0.92 && fs > 18) break;
      if (fs <= 18) break;
      fs *= 0.93;
    }

    var lh = fs * 1.22;
    var padX = 16, padY = 12;
    var W = Math.ceil(Math.min(boxW, widest + padX * 2));
    var H = Math.ceil(lines.length * lh + padY * 2);
    textCanvas.width = W; textCanvas.height = H;
    g.font = weight + ' ' + fs.toFixed(1) + 'px ' + FONT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    for (i = 0; i < lines.length; i++) {
      // letter-spacing feel: draw per word when very short
      g.fillText(lines[i], W / 2, padY + lh * (i + 0.5));
    }

    return inkToPoints(g, W, H, target, 0.12, { fontSize: fs, lines: lines.length });
  }

  // samples a canvas' white ink into evenly spread points (normalised y -> 1 unit)
  function inkToPoints(g, W, H, target, jitterK, extra) {
    var data = g.getImageData(0, 0, W, H).data;
    var ink = 0, x, y, idx;
    for (y = 0; y < H; y += 1) {
      for (x = 0; x < W; x += 1) {
        if (data[(y * W + x) * 4 + 3] > 128) ink++;
      }
    }
    if (!ink) return { pts: [], w: 1, h: 1 };
    var step = Math.max(1.6, Math.sqrt(ink / target));
    var pts = [];
    var jx = step * (jitterK == null ? 0.22 : jitterK);
    for (y = 0; y < H; y += step) {
      for (x = 0; x < W; x += step) {
        idx = ((y | 0) * W + (x | 0)) * 4 + 3;
        if (data[idx] > 96) pts.push({ x: x + rand(-jx, jx), y: y + rand(-jx, jx) });
      }
    }
    var scale = 1 / H;
    var wAspect = W * scale;
    var out = { pts: pts, w: wAspect, h: 1 };
    for (var i = 0; i < pts.length; i++) {
      pts[i].x = (pts[i].x - W / 2) * scale;
      pts[i].y = (pts[i].y - H / 2) * scale * -1;
    }
    if (extra) for (var k in extra) out[k] = extra[k];
    return out;
  }

  /* ---------------- shapes ---------------- */
  // all shapes: y in [-0.5, 0.5], x/z roughly in [-0.35, 0.35]

  function ring(y, r, n, jitter, out, squash) {
    var sq = squash == null ? 1 : squash;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU + rand(-0.02, 0.02);
      out.push({
        x: Math.cos(a) * r + rand(-jitter, jitter),
        y: y + rand(-jitter, jitter),
        z: Math.sin(a) * r * sq + rand(-jitter, jitter)
      });
    }
  }

  function wine(target) {
    var pts = [];
    var n = target || 1400;
    // bowl profile: [y, radius]
    var prof = [
      [0.44, 0.245], [0.40, 0.272], [0.34, 0.295], [0.26, 0.312], [0.18, 0.320],
      [0.10, 0.318], [0.02, 0.300], [-0.05, 0.265], [-0.11, 0.215], [-0.16, 0.155],
      [-0.19, 0.095], [-0.21, 0.055]
    ];
    function profAt(t) {
      var f = t * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), u = f - i;
      u = smooth(u);
      return [lerp(prof[i][0], prof[i + 1][0], u), lerp(prof[i][1], prof[i + 1][1], u)];
    }
    // rim: dense double ring
    ring(0.44, 0.245, 170, 0.004, pts, 1);
    ring(0.44, 0.232, 70, 0.004, pts, 1);
    // bowl wall
    var wall = Math.round(n * 0.42);
    for (var i = 0; i < wall; i++) {
      var t = Math.pow(Math.random(), 0.85);
      var pr = profAt(t);
      var a = rand(0, TAU);
      var r = pr[1] * rand(0.995, 1.005);
      pts.push({ x: Math.cos(a) * r, y: pr[0], z: Math.sin(a) * r });
    }
    // inner scattered dust (the "filled" look of the reference)
    var inner = Math.round(n * 0.12);
    for (i = 0; i < inner; i++) {
      var t2 = Math.pow(Math.random(), 1.2) * 0.8;
      var pr2 = profAt(t2);
      var a2 = rand(0, TAU);
      var rr = pr2[1] * Math.cbrt(Math.random()) * 0.92;
      pts.push({ x: Math.cos(a2) * rr, y: pr2[0] + rand(-0.01, 0.01), z: Math.sin(a2) * rr });
    }
    // stem
    var stem = Math.round(n * 0.06);
    for (i = 0; i < stem; i++) {
      var yy = rand(-0.42, -0.21);
      pts.push({ x: rand(-0.012, 0.012), y: yy, z: rand(-0.012, 0.012) });
    }
    // base
    ring(-0.445, 0.245, Math.round(n * 0.13), 0.005, pts, 1);
    ring(-0.448, 0.215, Math.round(n * 0.06), 0.005, pts, 1);
    var baseFill = Math.round(n * 0.06);
    for (i = 0; i < baseFill; i++) {
      var a3 = rand(0, TAU), r3 = 0.245 * Math.sqrt(Math.random());
      pts.push({ x: Math.cos(a3) * r3, y: -0.445 + rand(-0.006, 0.006), z: Math.sin(a3) * r3 });
    }
    // camera tilt baked in: shows the rim / base as ellipses like the reference
    var tilt = 0.20, ct = Math.cos(tilt), st = Math.sin(tilt);
    for (i = 0; i < pts.length; i++) {
      var yy = pts[i].y * ct - pts[i].z * st;
      var zz = pts[i].y * st + pts[i].z * ct;
      pts[i].y = yy; pts[i].z = zz;
    }
    return pts;
  }

  function heart(target) {
    var n = target || 1300;
    var W = 460, H = 440;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.beginPath();
    var N = 360;
    for (var k = 0; k <= N; k++) {
      var t = (k / N) * TAU;
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      var px = W / 2 + x * (W / 40);
      var py = H * 0.46 - y * (H / 40);
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();

    var res = inkToPoints(g, W, H, n, 0.18);
    var pts = [];
    var maxR = 0.5;
    for (var i = 0; i < res.pts.length; i++) {
      var p = res.pts[i];
      // puffy 3D pillow: depth falls off from the centre
      var d = Math.sqrt(p.x * p.x + p.y * p.y) / maxR;
      var bulge = Math.sqrt(Math.max(0, 1 - d * d)) * 0.16;
      pts.push({ x: p.x, y: p.y, z: (Math.random() < 0.5 ? -1 : 1) * bulge * (0.55 + 0.45 * Math.random()) });
    }
    return pts;
  }

  function tree(target) {
    var n = target || 1400;
    var pts = [];
    // cone silhouette
    var topY = 0.36, botY = -0.32;
    var coneN = Math.round(n * 0.62);
    for (var i = 0; i < coneN; i++) {
      var t = Math.pow(Math.random(), 0.7);            // 0 top .. 1 bottom
      var y = lerp(topY, botY, t);
      var r = lerp(0.025, 0.34, t);
      var a = rand(0, TAU);
      var shell = Math.random() < 0.86;
      var rr = shell ? r : r * Math.sqrt(Math.random());
      pts.push({ x: Math.cos(a) * rr, y: y + rand(-0.008, 0.008), z: Math.sin(a) * rr });
    }
    // garland spirals
    var gar = Math.round(n * 0.16);
    for (i = 0; i < gar; i++) {
      var tt = i / gar;
      var gy = lerp(topY - 0.02, botY, Math.pow(tt, 0.8));
      var gr = lerp(0.035, 0.35, Math.pow(tt, 0.8)) * 1.01;
      var ga = tt * TAU * 4.2;
      pts.push({ x: Math.cos(ga) * gr, y: gy, z: Math.sin(ga) * gr });
    }
    // trunk
    var tr = Math.round(n * 0.035);
    for (i = 0; i < tr; i++) {
      var ta = rand(0, TAU), trr = rand(0, 0.028);
      pts.push({ x: Math.cos(ta) * trr, y: rand(-0.47, -0.31), z: Math.sin(ta) * trr });
    }
    // five-point star on top (outline, evenly walked)
    var verts = [];
    for (i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * TAU / 10;
      var rad = (i % 2 === 0) ? 0.072 : 0.031;
      verts.push({ x: Math.cos(ang) * rad * 0.92, y: Math.sin(ang) * rad });
    }
    var segs = [], per = 0;
    for (i = 0; i < 10; i++) {
      var A = verts[i], B = verts[(i + 1) % 10];
      var len = Math.hypot(B.x - A.x, B.y - A.y);
      segs.push({ A: A, B: B, len: len, s: per });
      per += len;
    }
    var starN = Math.round(n * 0.11);
    for (i = 0; i < starN; i++) {
      var d = (i / starN) * per;
      for (var s2 = 0; s2 < segs.length; s2++) {
        if (d <= segs[s2].s + segs[s2].len) {
          var u2 = (d - segs[s2].s) / segs[s2].len;
          pts.push({
            x: lerp(segs[s2].A.x, segs[s2].B.x, u2),
            y: lerp(segs[s2].A.y, segs[s2].B.y, u2) + 0.428,
            z: rand(-0.012, 0.012)
          });
          break;
        }
      }
    }
    // a few bright points inside the star
    for (i = 0; i < 14; i++) {
      var aa = rand(0, TAU), rd = rand(0, 0.045);
      pts.push({ x: Math.cos(aa) * rd, y: 0.428 + Math.sin(aa) * rd, z: rand(-0.01, 0.01) });
    }
    return pts;
  }

  /* ---------------- v2 shapes: cake / coffee / gift / clover / moon ---------------- */
  // 곡선·원통이 정면(정확 각도)에서도 입체로 보이도록 살짝 기울여 굽는다
  function tiltX(pts, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    for (var i = 0; i < pts.length; i++) {
      var y = pts[i].y * c - (pts[i].z || 0) * s;
      var z = pts[i].y * s + (pts[i].z || 0) * c;
      pts[i].y = y; pts[i].z = z;
    }
    return pts;
  }

  // 별 테두리를 같은 간격으로 걷는다 (작은 반짝이용)
  function starOutline(cx, cy, r, count) {
    var verts = [], i;
    for (i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * TAU / 10;
      var rad = (i % 2 === 0) ? r : r * 0.44;
      verts.push({ x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad });
    }
    var segs = [], per = 0;
    for (i = 0; i < 10; i++) {
      var A = verts[i], B = verts[(i + 1) % 10];
      var len = Math.hypot(B.x - A.x, B.y - A.y);
      segs.push({ A: A, B: B, len: len, s: per });
      per += len;
    }
    var out = [];
    for (i = 0; i < count; i++) {
      var d = (i / count) * per;
      for (var k = 0; k < segs.length; k++) {
        if (d <= segs[k].s + segs[k].len) {
          var u = (d - segs[k].s) / segs[k].len;
          out.push({
            x: lerp(segs[k].A.x, segs[k].B.x, u),
            y: lerp(segs[k].A.y, segs[k].B.y, u)
          });
          break;
        }
      }
    }
    return out;
  }

  /* 🎂 2단 케이크 — 원통 두 층 + 크림 물결 + 촛불 3개 */
  function cake(target) {
    var n = target || 1500;
    var pts = [];
    var yBot = -0.36, yMid = -0.08, yTop = 0.14;
    var R1 = 0.32, R2 = 0.21;
    var i, a, r;

    // 아래층 원통
    var w1 = Math.round(n * 0.18);
    for (i = 0; i < w1; i++) {
      a = rand(0, TAU);
      r = R1 * rand(0.975, 1);
      pts.push({ x: Math.cos(a) * r, y: rand(yBot + 0.02, yMid), z: Math.sin(a) * r });
    }
    // 위층 원통
    var w2 = Math.round(n * 0.12);
    for (i = 0; i < w2; i++) {
      a = rand(0, TAU);
      r = R2 * rand(0.97, 1);
      pts.push({ x: Math.cos(a) * r, y: rand(yMid + 0.01, yTop), z: Math.sin(a) * r });
    }
    // 받침 접시
    ring(yBot, R1, Math.round(n * 0.07), 0.005, pts, 1);
    ring(yBot + 0.014, R1 * 0.86, Math.round(n * 0.03), 0.006, pts, 1);

    // 크림 물결 + 흘러내리는 크림 (아이싱 색으로 층 경계를 뚜렷하게)
    var CREAM = '#FFF1DC';
    function cream(yy, R, cnt, dripCnt) {
      for (var j = 0; j < cnt; j++) {
        var ca = (j / cnt) * TAU;
        var rr = R + Math.sin(ca * 7) * 0.013;
        pts.push({
          x: Math.cos(ca) * rr,
          y: yy + Math.cos(ca * 7) * 0.010,
          z: Math.sin(ca) * rr,
          color: CREAM, size: rand(1.5, 2.1)
        });
      }
      for (j = 0; j < dripCnt; j++) {
        var da = rand(0, TAU);
        var crest = (Math.sin(da * 7) + 1) * 0.5;
        var L = 0.018 + 0.055 * crest;
        var u = Math.random();
        var dr = R - 0.003;
        pts.push({
          x: Math.cos(da) * dr,
          y: yy - 0.008 - L * u,
          z: Math.sin(da) * dr,
          color: CREAM, size: rand(1.4, 2.0)
        });
        if (u > 0.86) pts.push({ x: Math.cos(da) * dr * 0.98, y: yy - 0.010 - L, z: Math.sin(da) * dr * 0.98, color: CREAM, size: rand(1.4, 2.0) });
      }
    }
    cream(yMid, R1, Math.round(n * 0.10), Math.round(n * 0.035));
    cream(yTop, R2, Math.round(n * 0.07), Math.round(n * 0.022));

    // 위층 윗면
    var tf = Math.round(n * 0.055);
    for (i = 0; i < tf; i++) {
      a = rand(0, TAU);
      r = R2 * 0.97 * Math.sqrt(Math.random());
      pts.push({ x: Math.cos(a) * r, y: yTop + rand(-0.003, 0.003), z: Math.sin(a) * r });
    }
    // 아래층 노출된 윗면(링 모양)
    var an = Math.round(n * 0.05);
    for (i = 0; i < an; i++) {
      a = rand(0, TAU);
      r = Math.sqrt(lerp(R2 * R2, R1 * R1, Math.random()));
      pts.push({ x: Math.cos(a) * r, y: yMid + rand(-0.008, 0.004), z: Math.sin(a) * r });
    }

    // 촛불 3개
    var candX = [-0.115, 0, 0.115];
    for (var ci = 0; ci < candX.length; ci++) {
      var cx = candX[ci];
      var cTop = yTop + 0.135;
      var body = Math.round(n * 0.022);
      for (i = 0; i < body; i++) {
        a = rand(0, TAU);
        pts.push({ x: cx + Math.cos(a) * 0.011, y: rand(yTop + 0.006, cTop), z: Math.sin(a) * 0.011 });
      }
      // 불꽃(밝은 물방울)
      var fl = Math.round(n * 0.017);
      for (i = 0; i < fl; i++) {
        var fu = Math.random();
        var fw = 0.013 * Math.sin(Math.PI * (0.18 + 0.82 * fu)) * (1 - fu * 0.45);
        a = rand(0, TAU);
        var fr = fw * Math.sqrt(Math.random());
        pts.push({
          x: cx + Math.cos(a) * fr,
          y: cTop + 0.008 + fu * 0.05,
          z: Math.sin(a) * fr,
          color: i % 4 === 0 ? '#FFFFFF' : '#FFD98A',
          size: rand(1.7, 2.5)
        });
      }
    }

    tiltX(pts, 0.16);
    return pts;
  }

  /* ☕ 커피잔 — 머그 본체 + D자 손잡이 + 김 3줄기 */
  function coffee(target) {
    var n = target || 1500;
    var pts = [];
    var topY = 0.16, botY = -0.22;
    var rTop = 0.225, rBot = 0.172;
    var i, a, r;

    // 본체 벽(위가 살짝 넓은 원통)
    var w = Math.round(n * 0.33);
    for (i = 0; i < w; i++) {
      var t = Math.random();
      a = rand(0, TAU);
      r = lerp(rTop, rBot, t) * rand(0.985, 1);
      pts.push({ x: Math.cos(a) * r, y: lerp(topY, botY, t), z: Math.sin(a) * r });
    }
    // 컵 아가리(두 겹 링으로 두께)
    ring(topY, rTop, Math.round(n * 0.13), 0.003, pts, 1);
    ring(topY - 0.013, rTop * 0.89, Math.round(n * 0.07), 0.003, pts, 1);
    // 컵 안 커피 표면
    var sN = Math.round(n * 0.05);
    for (i = 0; i < sN; i++) {
      a = rand(0, TAU);
      r = rTop * 0.86 * Math.sqrt(Math.random());
      pts.push({ x: Math.cos(a) * r, y: topY - 0.020, z: Math.sin(a) * r });
    }
    // 바닥
    ring(botY, rBot, Math.round(n * 0.08), 0.004, pts, 1);

    // 오른쪽 D자 손잡이
    var hcx = 0.155, hcy = -0.02, hR = 0.158;
    var hN = Math.round(n * 0.15);
    for (i = 0; i < hN; i++) {
      var ang = -1.22 + (i / hN) * 2.44;
      var bx = hcx + Math.cos(ang) * hR;
      var by = hcy + Math.sin(ang) * hR;
      // 손잡이 두께
      var th = rand(0, TAU), tr = 0.017;
      pts.push({
        x: bx + Math.cos(th) * tr * Math.cos(ang),
        y: by + Math.cos(th) * tr * Math.sin(ang),
        z: Math.sin(th) * tr
      });
    }

    // 피어오르는 김 3줄기 (위로 갈수록 잔잔하게 흔들리는 기둥)
    var stN = Math.round(n * 0.17);
    for (var s2 = 0; s2 < 3; s2++) {
      var cnt = Math.round(stN / 3);
      var baseX = (s2 - 1) * 0.105;
      for (i = 0; i < cnt; i++) {
        var u = i / cnt;
        var yy = 0.20 + u * 0.34;
        var xx = baseX + Math.sin(u * Math.PI * 2.2 + s2 * 1.2) * (0.012 + 0.022 * u);
        pts.push({
          x: xx + rand(-0.007, 0.007),
          y: yy + rand(-0.005, 0.005),
          z: rand(-0.02, 0.02) * (0.4 + u)
        });
      }
    }

    tiltX(pts, 0.14);
    return pts;
  }

  /* 🎁 선물상자 — 각진 정육면체 + 십자 리본 + 매듭 고리 */
  function gift(target) {
    var n = target || 1500;
    var pts = [];
    var hw = 0.265, hh = 0.225, hd = 0.205;
    var cy = -0.12;
    var bottom = cy - hh, top = cy + hh;
    var i, j;

    // 앞·뒤 면
    var fN = Math.round(n * 0.09);
    for (i = 0; i < fN; i++) pts.push({ x: rand(-hw, hw), y: rand(bottom, top), z: hd + rand(-0.005, 0.005) });
    var bN = Math.round(n * 0.04);
    for (i = 0; i < bN; i++) pts.push({ x: rand(-hw, hw), y: rand(bottom, top), z: -hd + rand(-0.005, 0.005) });
    // 옆면
    var sN = Math.round(n * 0.05);
    for (i = 0; i < sN; i++) pts.push({ x: hw + rand(-0.005, 0.005), y: rand(bottom, top), z: rand(-hd, hd) });
    for (i = 0; i < Math.round(n * 0.03); i++) pts.push({ x: -hw + rand(-0.005, 0.005), y: rand(bottom, top), z: rand(-hd, hd) });
    // 윗면
    var tN = Math.round(n * 0.08);
    for (i = 0; i < tN; i++) pts.push({ x: rand(-hw, hw), y: top + rand(-0.005, 0.005), z: rand(-hd, hd) });

    // 모서리 12개 (각진 상자로 또렷하게)
    var edge = Math.round(n * 0.016);
    for (var sx = 0; sx < 2; sx++) for (var sz = 0; sz < 2; sz++) {
      var ex = sx ? hw : -hw, ez = sz ? hd : -hd;
      for (i = 0; i < edge; i++) pts.push({ x: ex + rand(-0.003, 0.003), y: lerp(bottom, top, i / (edge - 1)), z: ez + rand(-0.003, 0.003) });
    }
    for (sz = 0; sz < 2; sz++) for (var sy = 0; sy < 2; sy++) {
      var ez2 = sz ? hd : -hd, ey = sy ? top : bottom;
      for (i = 0; i < edge; i++) pts.push({ x: lerp(-hw, hw, i / (edge - 1)), y: ey + rand(-0.003, 0.003), z: ez2 + rand(-0.003, 0.003) });
    }
    for (sx = 0; sx < 2; sx++) for (sy = 0; sy < 2; sy++) {
      var ex2 = sx ? hw : -hw, ey2 = sy ? top : bottom;
      for (i = 0; i < edge; i++) pts.push({ x: ex2 + rand(-0.003, 0.003), y: ey2 + rand(-0.003, 0.003), z: lerp(-hd, hd, i / (edge - 1)) });
    }

    // 리본(세로·가로 십자) — 띠의 두 가장자리를 선으로 그어 상자를 감아 돈다
    var RIB = '#FFB3CB';
    var ribW = 0.055;
    function bandLine(count, x0, y0, z0, x1, y1, z1) {
      for (var j = 0; j < count; j++) {
        var u = count > 1 ? j / (count - 1) : 0;
        pts.push({
          x: lerp(x0, x1, u) + rand(-0.003, 0.003),
          y: lerp(y0, y1, u) + rand(-0.003, 0.003),
          z: lerp(z0, z1, u) + rand(-0.003, 0.003),
          color: RIB, size: rand(1.5, 2.1)
        });
      }
    }
    var bandN = Math.max(12, Math.round(n * 0.014));
    var zF = hd + 0.006, zB = -hd - 0.006;
    // 세로 띠: 앞·뒤 가장자리 + 윗면을 건너는 선
    bandLine(bandN, -ribW, bottom, zF, -ribW, top, zF);
    bandLine(bandN, ribW, bottom, zF, ribW, top, zF);
    bandLine(bandN, -ribW, bottom, zB, -ribW, top, zB);
    bandLine(bandN, ribW, bottom, zB, ribW, top, zB);
    bandLine(bandN, -ribW, top + 0.006, zF, -ribW, top + 0.006, zB);
    bandLine(bandN, ribW, top + 0.006, zF, ribW, top + 0.006, zB);
    // 가로 띠: 앞·뒤·옆면을 한 바퀴
    var hy = cy - 0.01;
    var rb = 0.034;
    bandLine(bandN, -hw, hy + rb, zF, hw, hy + rb, zF);
    bandLine(bandN, -hw, hy - rb, zF, hw, hy - rb, zF);
    bandLine(bandN, -hw, hy + rb, zB, hw, hy + rb, zB);
    bandLine(bandN, -hw, hy - rb, zB, hw, hy - rb, zB);
    bandLine(Math.round(bandN * 0.5), hw + 0.006, hy + rb, zF, hw + 0.006, hy + rb, zB);
    bandLine(Math.round(bandN * 0.5), hw + 0.006, hy - rb, zF, hw + 0.006, hy - rb, zB);
    bandLine(Math.round(bandN * 0.5), -hw - 0.006, hy + rb, zF, -hw - 0.006, hy + rb, zB);
    bandLine(Math.round(bandN * 0.5), -hw - 0.006, hy - rb, zF, -hw - 0.006, hy - rb, zB);
    // 앞면 띠는 살짝 채워 리본이 면으로 보이게
    for (i = 0; i < Math.round(n * 0.022); i++) {
      pts.push({ x: rand(-ribW, ribW), y: rand(bottom, top), z: zF, color: RIB, size: rand(1.3, 1.9) });
    }
    for (i = 0; i < Math.round(n * 0.012); i++) {
      pts.push({ x: rand(-hw, hw), y: hy + rand(-rb, rb), z: zF, color: RIB, size: rand(1.3, 1.9) });
    }

    // 상단 리본 매듭 고리 두 개 + 가운데 매듭
    var BOW = '#FFE0EC';
    var bowY = top + 0.082;
    for (var bs = -1; bs <= 1; bs += 2) {
      var loopN = Math.round(n * 0.045);
      for (i = 0; i < loopN; i++) {
        var u2 = (i / loopN) * TAU;
        pts.push({
          x: bs * (0.072 + Math.cos(u2) * 0.072),
          y: bowY + Math.sin(u2) * 0.052 + 0.010,
          z: rand(-0.028, 0.028),
          color: BOW, size: rand(1.5, 2.2)
        });
      }
      for (i = 0; i < Math.round(n * 0.012); i++) {
        var lu = rand(0, TAU), lr = Math.sqrt(Math.random()) * 0.062;
        pts.push({
          x: bs * (0.072 + Math.cos(lu) * lr * 0.9),
          y: bowY + 0.010 + Math.sin(lu) * lr * 0.7,
          z: rand(-0.02, 0.02),
          color: BOW, size: rand(1.4, 2.0)
        });
      }
    }
    for (i = 0; i < Math.round(n * 0.022); i++) {
      var ka = rand(0, TAU), kr = rand(0, 0.026);
      pts.push({
        x: Math.cos(ka) * kr,
        y: bowY + 0.008 + Math.sin(ka) * kr,
        z: rand(-0.024, 0.024),
        color: '#FFF2F7', size: rand(1.6, 2.3)
      });
    }
    return pts;
  }

  /* 🍀 네잎클로버 — 하트잎 4장 대칭 + 아래로 휜 줄기 */
  function clover(target) {
    var n = target || 1500;
    var pts = [];
    var i, k, j;
    var R = 0.30;              // 잎 반지름 (잎 길이 = 2R)
    var nDepth = 0.20, wTop = 0.072;   // 끝의 V자 홈(깊고 좁게)

    // 잎 내부: 끝이 원점, +Y로 자란 둥근 잎 − 끝의 V홈
    function leafFill(count) {
      var out = [], guard = count * 30;
      while (out.length < count && guard-- > 0) {
        var lx = rand(-R, R), ly = rand(0, 2 * R);
        var dx = lx, dy = ly - R;
        if (dx * dx + dy * dy > R * R) continue;
        if (ly > 2 * R - nDepth) {
          var w = ((ly - (2 * R - nDepth)) / nDepth) * wTop;
          if (Math.abs(lx) < w) continue;
        }
        out.push({ x: lx, y: ly });
      }
      return out;
    }

    // 잎 테두리: 원호 + V홈 두 변
    function leafEdge(count) {
      var out = [];
      var phi0 = Math.asin(Math.min(1, wTop / R));
      var arcN = Math.round(count * 0.72);
      for (var m = 0; m < arcN; m++) {
        var phi = phi0 + (TAU - 2 * phi0) * (m / Math.max(1, arcN - 1));
        out.push({ x: R * Math.sin(phi), y: R + R * Math.cos(phi) });
      }
      var yEdge = R + R * Math.cos(phi0);
      var vn = Math.max(2, Math.round((count - arcN) / 2));
      for (m = 0; m < vn; m++) {
        var u = m / (vn - 1);
        out.push({ x: lerp(wTop, 0, u), y: lerp(yEdge, 2 * R - nDepth, u) });
        out.push({ x: lerp(0, -wTop, u), y: lerp(2 * R - nDepth, yEdge, u) });
      }
      return out;
    }

    for (k = 0; k < 4; k++) {
      var phi = Math.PI / 4 + k * Math.PI / 2;
      var cf = Math.cos(phi), sf = Math.sin(phi);
      var ax = 0.012 * cf, ay = 0.012 * sf;
      var leaf = leafFill(Math.round(n * 0.155)).concat(leafEdge(Math.round(n * 0.045)));
      for (i = 0; i < leaf.length; i++) {
        var lx = leaf[i].x, ly = leaf[i].y;
        // 잎맥 쪽이 도톰하게 솟는 3D 결
        var ridge = (1 - Math.min(1, Math.abs(lx) / R)) * 0.08 * (0.30 + 0.70 * (ly / (2 * R)));
        pts.push({
          x: lx * sf + ly * cf + ax,
          y: -lx * cf + ly * sf + ay,
          z: ridge
        });
      }
    }
    // 중심 매듭
    for (i = 0; i < Math.round(n * 0.02); i++) {
      var ca2 = rand(0, TAU), cr2 = rand(0, 0.05);
      pts.push({ x: Math.cos(ca2) * cr2, y: Math.sin(ca2) * cr2, z: rand(-0.02, 0.02) });
    }
    // 줄기 — 잎 아래로 뚜렷하게 내려간다
    var stemN = Math.round(n * 0.07);
    for (i = 0; i < stemN; i++) {
      var u = i / stemN;
      var sx = -0.01 - 0.11 * u * u - 0.022 * Math.sin(u * 2.4);
      var sy = -0.02 - u * 0.56;
      pts.push({
        x: sx + rand(-0.012, 0.012),
        y: sy + rand(-0.007, 0.007),
        z: rand(-0.012, 0.012)
      });
    }
    return pts;
  }

  /* 🌙 초승달 — 도톰한 달 본체 + 곁의 작은 별 3개 */
  function moon(target) {
    var n = target || 1500;
    var pts = [];
    var R = 0.42, icx = 0.185, icy = 0.10, IR = 0.345;
    var want = Math.round(n * 0.76);
    var guard = want * 60 + 400;
    while (pts.length < want && guard-- > 0) {
      var x = rand(-R, R), y = rand(-R, R);
      var dOut = Math.hypot(x, y);
      if (dOut > R) continue;
      var dIn = Math.hypot(x - icx, y - icy);
      if (dIn < IR) continue;
      var edge = Math.min(R - dOut, dIn - IR);
      var bulge = Math.sqrt(clamp(edge / 0.17, 0, 1)) * 0.075;
      pts.push({ x: x, y: y, z: (Math.random() < 0.5 ? -1 : 1) * bulge * rand(0.5, 1) });
    }
    // 곁의 반짝이는 별
    var stars = [
      { x: 0.255, y: 0.275, r: 0.058 },
      { x: 0.395, y: 0.005, r: 0.045 },
      { x: 0.145, y: 0.425, r: 0.038 }
    ];
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var line = starOutline(st.x, st.y, st.r, Math.round(n * 0.014));
      for (var i = 0; i < line.length; i++) {
        pts.push({ x: line[i].x, y: line[i].y, z: 0, color: '#FFF4D2', size: rand(1.4, 2.0) });
      }
      // 별 중심 반짝임
      pts.push({ x: st.x, y: st.y, z: 0, color: '#FFFFFF', size: 2.6 });
      for (i = 0; i < 4; i++) {
        var ga = rand(0, TAU), gr = rand(0, st.r * 0.5);
        pts.push({ x: st.x + Math.cos(ga) * gr, y: st.y + Math.sin(ga) * gr, z: 0, color: '#FFF4D2', size: rand(1.2, 1.8) });
      }
    }
    return pts;
  }

  /* ---------------- colourise ---------------- */
  function colourise(pts, opt) {
    opt = opt || {};
    var base = opt.colors || PALETTE;
    var white = opt.white == null ? 0.16 : opt.white;
    var sizeMin = opt.sizeMin == null ? 1.5 : opt.sizeMin;
    var sizeMax = opt.sizeMax == null ? 2.9 : opt.sizeMax;
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) {
      var c = pts[i].color || base[(Math.random() * base.length) | 0];
      if (!pts[i].color && Math.random() < white) c = '#FFF6E2';
      out[i] = {
        x: pts[i].x, y: pts[i].y, z: pts[i].z || 0,
        color: c,
        sharp: !!opt.sharp,
        size: (pts[i].size != null ? pts[i].size : rand(sizeMin, sizeMax)) * (opt.sizeScale || 1)
      };
    }
    return out;
  }

  /* ---------------- two-sided pairing (spin-flip) ---------------- */
  // A: front points (x,y) normalised (y in [-0.5,0.5]); B: back points
  // returns [{x: frontX, y: shared, z: backX}]
  function pairSides(A, B) {
    var n = Math.min(A.length, B.length);
    if (!n) return [];
    function order(arr) {
      // band by y then sort by x — keeps letterforms coherent while pairing
      var bands = 64;
      var idx = arr.map(function (p, i) {
        return { p: p, b: Math.round((p.y + 0.5) * bands), i: i };
      });
      idx.sort(function (m, q) { return (m.b - q.b) || (m.p.x - q.p.x) || (m.i - q.i); });
      return idx.map(function (m) { return m.p; });
    }
    var a = order(A), b = order(B);
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var ia = Math.round(i * (a.length - 1) / Math.max(1, n - 1));
      var ib = Math.round(i * (b.length - 1) / Math.max(1, n - 1));
      var pa = a[ia], pb = b[ib];
      out[i] = { x: pa.x, y: (pa.y + pb.y) * 0.5, z: pb.x };
    }
    return out;
  }

  /* ---------------- audio ---------------- */
  var Audio = (function () {
    var ctxA = null, master = null, reverb = null, muted = false, lastBlip = 0;
    try { muted = localStorage.getItem('sl-muted') === '1'; } catch (e) { }

    function ac() {
      if (ctxA) return ctxA;
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { ctxA = new AC(); } catch (e) { ctxA = null; return null; }
      master = ctxA.createGain();
      master.gain.value = 0.9;
      master.connect(ctxA.destination);
      // simple generated reverb for warmth
      try {
        var len = Math.floor(ctxA.sampleRate * 2.2);
        var ir = ctxA.createBuffer(2, len, ctxA.sampleRate);
        for (var ch = 0; ch < 2; ch++) {
          var d = ir.getChannelData(ch);
          for (var i = 0; i < len; i++) {
            var t = i / len;
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * 0.6;
          }
        }
        reverb = ctxA.createConvolver();
        reverb.buffer = ir;
        var wet = ctxA.createGain();
        wet.gain.value = 0.34;
        reverb.connect(wet);
        wet.connect(master);
      } catch (e) { reverb = null; }
      return ctxA;
    }

    function unlock() {
      var c = ac();
      if (!c) return;
      try { if (global.navigator && 'audioSession' in global.navigator) global.navigator.audioSession.type = 'playback'; } catch (e) { }
      if (c.state !== 'running') { try { c.resume(); } catch (e) { } }
      try {
        var b = c.createBuffer(1, 1, c.sampleRate);
        var s = c.createBufferSource();
        s.buffer = b;
        s.connect(c.destination);
        s.start(0);
      } catch (e) { }
    }

    function tone(freq, when, dur, gain, type, detune) {
      var c = ac();
      if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
      var t0 = c.currentTime + when;
      var peak = gain || 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.09, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      if (reverb) g.connect(reverb);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }

    function isMuted() { return muted; }
    function setMuted(m) {
      muted = m;
      try { localStorage.setItem('sl-muted', m ? '1' : '0'); } catch (e) { }
      if (master) master.gain.value = m ? 0 : 0.9;
    }
    function applyMute() { if (master) master.gain.value = muted ? 0 : 0.9; }

    // warm, wide "letter opened" chord
    function reveal() {
      if (muted) return;
      var c = ac(); if (!c) return; applyMute();
      var notes = [146.83, 220.0, 293.66, 369.99, 440.0, 587.33, 739.99];
      for (var i = 0; i < notes.length; i++) {
        tone(notes[i], 0.02 * i, 2.8 + i * 0.12, 0.085 - i * 0.006, 'sine', -4);
        tone(notes[i] * 2, 0.02 * i + 0.02, 1.6, 0.022, 'triangle', 5);
      }
      // shimmer
      tone(1174.66, 0.10, 1.3, 0.035, 'sine');
      tone(1567.98, 0.18, 1.1, 0.026, 'sine');
      tone(2093.0, 0.26, 0.9, 0.016, 'sine');
    }

    // flip: warm low = front face, bright = hidden side
    function face(kind) {
      if (muted) return;
      var c = ac(); if (!c) return; applyMute();
      if (kind === 'front') {
        var f = [196.0, 293.66, 392.0, 587.33];
        for (var i = 0; i < f.length; i++) tone(f[i], 0.015 * i, 1.5, 0.07, 'triangle', -3);
      } else {
        var s = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        for (var j = 0; j < s.length; j++) {
          tone(s[j], 0.025 * j, 1.4, 0.055 - j * 0.006, 'sine', 4);
        }
        tone(1760, 0.16, 0.8, 0.02, 'sine');
      }
    }

    function blip(strength) {
      if (muted) return;
      var now = performance.now();
      if (now - lastBlip < 220) return;
      lastBlip = now;
      var c = ac(); if (!c) return; applyMute();
      tone(880 + 120 * (strength || 0), 0, 0.22, 0.02, 'sine');
    }

    function ui() {
      if (muted) return;
      var c = ac(); if (!c) return; applyMute();
      tone(660, 0, 0.12, 0.03, 'sine');
      tone(990, 0.04, 0.14, 0.02, 'sine');
    }

    return { ac: ac, unlock: unlock, reveal: reveal, face: face, blip: blip, ui: ui, isMuted: isMuted, setMuted: setMuted };
  })();

  /* ---------------- viewport / DPR ---------------- */
  function fitCanvas(canvas) {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || global.innerWidth;
    var h = canvas.clientHeight || global.innerHeight;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    return { w: w, h: h, dpr: dpr };
  }

  global.SL = {
    TAU: TAU, D2R: D2R,
    clamp: clamp, lerp: lerp, smooth: smooth, rand: rand, gauss: gauss, wrapDeg: wrapDeg,
    PALETTE: PALETTE, Field: Field, updateField: updateField, drawField: drawField,
    project: project, sampleText: sampleText,
    shapes: {
      wine: wine, heart: heart, tree: tree,
      cake: cake, coffee: coffee, gift: gift, clover: clover, moon: moon
    },
    colourise: colourise, pairSides: pairSides, Audio: Audio, fitCanvas: fitCanvas, FONT: FONT
  };
})(window);
