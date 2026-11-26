/* 겉과 속 — app */
(function () {
  'use strict';
  var SL = window.SL;
  var R2D = 180 / Math.PI, D2R = Math.PI / 180;

  var $ = function (s) { return document.querySelector(s); };
  var canvas = $('#scene');
  var ctx = canvas.getContext('2d', { alpha: false });

  var PRESETS = [
    { id: 'wine', shape: 'wine', front: '', back: '오늘 한잔 콜?', emo: '🍷', label: '와인잔' },
    { id: 'ok', shape: 'text', front: '겉: 괜찮아', back: '속: 사실 보고 싶어', emo: '😌', label: '괜찮아' },
    { id: 'work', shape: 'text', front: '겉: 열일 중', back: '속: 퇴근 마렵다', emo: '💼', label: '열일 중' }
  ];
  var BACK_CHIPS = ['오늘 한잔 콜?', '속: 사실 보고 싶어', '속: 퇴근 마렵다', '미리 메리 크리스마스'];
  var FRONT_CHIPS = ['겉: 괜찮아', '겉: 열일 중', '겉: 잘 지내', '겉: 관심 없어'];

  var params = new URLSearchParams(location.search);
  var pShape = (params.get('s') || '').toLowerCase();
  var pFront = params.get('f');
  var pBack = params.get('b');
  var fromLink = params.has('f') || params.has('b');

  var state = {
    shape: (pShape === 'wine' || pShape === 'heart' || pShape === 'text') ? pShape : 'wine',
    front: pFront || '',
    back: pBack || '오늘 한잔 콜?',
    ang: 0,             // degrees, 0 = front, 90 = hidden side
    pitch: 0,
    vAng: 0, vPitch: 0,
    dragging: false,
    snapTo: null,       // animating target
    snapT: 0,
    snapFrom: 0,
    revealed: false,
    face: 'front',
    touched: false
  };
  if (!pFront && !pBack && pShape !== 'wine' && pShape !== 'heart') state.shape = 'wine';
  if (fromLink && state.shape === 'text' && !state.front) state.front = '겉: 괜찮아';

  var field = null;
  var view = { yaw: 0, pitch: 0, scale: 400, cx: 200, cy: 380, focal: 13, depthScale: 1, depthAlpha: 0.4, glow: 1 };
  var size = { w: 390, h: 844, dpr: 1 };
  var density = 1;

  /* ---------- scene ---------- */
  function fitPoints(pts, maxW, maxH, cxShift) {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].x < minX) minX = pts[i].x;
      if (pts[i].x > maxX) maxX = pts[i].x;
      if (pts[i].y < minY) minY = pts[i].y;
      if (pts[i].y > maxY) maxY = pts[i].y;
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var s = Math.min(maxW / Math.max(0.01, maxX - minX), maxH / Math.max(0.01, maxY - minY));
    var out = new Array(pts.length);
    for (i = 0; i < pts.length; i++) {
      out[i] = { x: (pts[i].x - cx) * s + (cxShift || 0), y: (pts[i].y - cy) * s, z: (pts[i].z || 0) * s };
    }
    return out;
  }

  function buildScene() {
    var dn = density;
    var nA = Math.round(2200 * Math.pow(dn, 1.15));
    var nB = Math.round(1900 * Math.pow(dn, 1.15));
    var A, B, i;

    if (state.shape === 'text') {
      // both faces share one frame, so the rows line up and neither gets squashed
      var ra = SL.sampleText(state.front || '겉: ?', { count: nA, maxLines: 2, boxW: 820, weight: 600, lineHeight: 1.14, forceLines: 2 });
      var rb = SL.sampleText(state.back || '속: ?', { count: nB, maxLines: 2, boxW: 820, weight: 600, lineHeight: 1.14, forceLines: 2 });
      var sc = Math.min(0.82 / Math.max(ra.w, rb.w, 0.01), 0.90);
      A = ra.pts.map(function (p) { return { x: p.x * sc, y: p.y * sc }; });
      B = rb.pts.map(function (p) { return { x: p.x * sc, y: p.y * sc }; });
    } else {
      A = fitPoints(SL.shapes[state.shape](Math.round(nA * 0.9)), 0.84, 0.88);
      var r2 = SL.sampleText(state.back || '속: ?', { count: nB, maxLines: 2, boxW: 820, weight: 600, lineHeight: 1.14, forceLines: 2 });
      B = fitPoints(r2.pts, 0.84, 0.90);
    }

    var paired = SL.pairSides(A, B, 96);
    var pts = new Array(paired.length);
    for (i = 0; i < paired.length; i++) pts[i] = { x: paired[i].x, y: paired[i].y, z: paired[i].z };

    var dz = Math.pow(dn, 0.5);
    field = new SL.Field(SL.colourise(pts, {
      colors: ['#FFF3E0', '#FFE6EE', '#E9F3FF', '#E4FFF2', '#F3E9FF', '#FFD9A8', '#BFF3FF'],
      white: 0.34,
      sizeMin: 0.95 * dz,
      sizeMax: 1.45 * dz,
      sharp: true
    }), { spread: 0.5 });
  }

  /* ---------- layout ---------- */
  function layout() {
    var f = SL.fitCanvas(canvas);
    size = f;
    var w = f.w, h = f.h;
    var S = Math.min(w * 1.16, h * 0.64);
    view.scale = S;
    view.cx = w / 2;
    view.cy = h * 0.445;
    ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
    var next = SL.clamp(S / 430, 1, 1.85);
    if (Math.abs(next - density) > 0.12) { density = next; if (field) buildScene(); }
  }

  /* ---------- interaction ---------- */
  var lastP = null;

  function onDown(e) {
    SL.Audio.unlock();
    if (state.snapTo !== null) { state.snapTo = null; }
    state.dragging = true;
    state.vAng = 0; state.vPitch = 0;
    lastP = { x: e.clientX, y: e.clientY };
    state.lastMoveT = performance.now();
    canvas.classList.add('dragging');
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  }

  function onMove(e) {
    if (!state.dragging) return;
    var dx = e.clientX - lastP.x;
    var dy = e.clientY - lastP.y;
    lastP = { x: e.clientX, y: e.clientY };
    state.ang = SL.clamp(state.ang + dx * 0.55, -25, 112);
    state.pitch = SL.clamp(state.pitch + dy * 0.0035, -0.24, 0.24);
    state.vAng = dx * 0.55 * 0.5;
    state.vPitch = dy * 0.0035 * 0.5;
  }

  function onUp() {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.classList.remove('dragging');
    if (performance.now() - state.lastMoveT > 90) { state.vAng = 0; state.vPitch = 0; }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('wheel', function (e) {
    if (document.body.dataset.sheet === '1') return;
    state.ang = SL.clamp(state.ang + (e.deltaY + e.deltaX) * 0.09, -25, 112);
    state.vAng = 0;
  }, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { state.ang = SL.clamp(state.ang - 6, -25, 112); state.vAng = 0; SL.Audio.unlock(); }
    else if (e.key === 'ArrowRight') { state.ang = SL.clamp(state.ang + 6, -25, 112); state.vAng = 0; SL.Audio.unlock(); }
    else if (e.key === 'Escape') closeSheet();
  });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

  /* ---------- ui refs ---------- */
  var trackFill = $('#trackFill'), trackKnob = $('#trackKnob'), track = document.querySelector('.track');
  var dialText = $('#dialText'), dialAngle = $('#dialAngle');
  var badge = $('#faceBadge'), fbText = $('#fbText');
  var dockActions = $('#dockActions');
  var lastPct = -1, lastFace = 'front';

  function snapSound(kind) {
    try { SL.Audio.face(kind); } catch (e) { }
    try {
      var ua = navigator.userActivation;
      if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(kind === 'side' ? [0, 24, 40, 30] : 18);
    } catch (e) { }
  }

  function setFace(face) {
    if (face === lastFace) return;
    lastFace = face;
    state.face = face;
    if (face === 'side') {
      badge.classList.add('side');
      fbText.textContent = '속마음';
      if (!state.revealed) {
        state.revealed = true;
        dockActions.classList.add('show');
        $('#hintLine').style.display = 'none';
      }
    } else {
      badge.classList.remove('side');
      fbText.textContent = '겉모습';
    }
  }

  function animateTo(target) {
    state.snapFrom = state.ang;
    state.snapTo = target;
    state.snapT = 0;
    state.vAng = 0;
    state.vPitch = 0;
  }

  /* ---------- loop ---------- */
  var last = performance.now();

  function update(dt) {
    if (state.snapTo !== null) {
      state.snapT += dt / 0.55;
      var t = SL.clamp(state.snapT, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      state.ang = SL.lerp(state.snapFrom, state.snapTo, e);
      state.pitch *= (1 - Math.min(1, dt * 6));
      if (t >= 1) {
        state.ang = state.snapTo;
        state.pitch = 0;
        var landed = state.snapTo;
        state.snapTo = null;
        if (landed >= 45) setFace('side'); else setFace('front');
        snapSound(landed >= 45 ? 'side' : 'front');
      }
    } else if (!state.dragging) {
      state.ang += state.vAng;
      state.pitch += state.vPitch;
      state.vAng *= 0.9;
      state.vPitch *= 0.9;
      if (Math.abs(state.vAng) < 0.002) state.vAng = 0;
      if (Math.abs(state.vPitch) < 0.0005) state.vPitch = 0;
      // magnet towards 0 or 90
      var targets = [0, 90], best = null, bestD = 1e9;
      for (var i = 0; i < 2; i++) {
        var d = Math.abs(state.ang - targets[i]);
        if (d < bestD) { bestD = d; best = targets[i]; }
      }
      if (bestD < 14) {
        var pull = (1 - bestD / 14) * 3.6 * dt;
        state.ang += (best - state.ang) * Math.min(1, pull);
        if (bestD < 6) {
          animateTo(best);
        }
      }
      state.pitch -= state.pitch * Math.min(1, dt * 2.2);
      state.ang = SL.clamp(state.ang, -25, 112);
    }

    // face follows the angle
    if (state.snapTo === null) {
      setFace(state.ang >= 45 ? 'side' : 'front');
    }

    var pct = Math.round(SL.clamp(state.ang / 90, 0, 1) * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      trackFill.style.width = pct + '%';
      trackKnob.style.left = pct + '%';
      dialAngle.textContent = Math.round(state.ang) + '°';
      track.classList.toggle('near', pct > 88 || pct < 6);
      dialText.textContent = pct < 15 ? '정면을 보고 있어요' :
        pct < 45 ? '점들이 흩어지는 중…' :
          pct < 85 ? '거의 다 돌았어요…' : '속마음이 나왔어요';
      if (pct > 30 && pct < 88) SL.Audio.blip(pct / 100);
    }
  }

  function render() {
    var w = size.w, h = size.h;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    var side = SL.clamp((state.ang - 20) / 60, 0, 1);
    var cx = view.cx, cy = view.cy, R = Math.max(w, h) * 0.72;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, 'rgba(' + Math.round(90 + 40 * side) + ',' + Math.round(60 + 120 * side) + ',' + Math.round(130 + 40 * side) + ',0.10)');
    grad.addColorStop(0.5, 'rgba(40, 60, 80, 0.035)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    var t = performance.now() / 1000;
    // tremor when the flip point is close but not snapped
    var near = 0;
    if (state.snapTo === null && !state.dragging) {
      var d0 = Math.abs(state.ang - 0), d1 = Math.abs(state.ang - 90);
      var d = Math.min(d0, d1);
      if (d < 14) near = (1 - d / 14) * 0.006;
    }
    view.yaw = state.ang * D2R + Math.sin(t * 31) * near;
    view.pitch = state.pitch + Math.cos(t * 37) * near * 0.5;
    view.glow = 0.95 + 0.15 * side;
    SL.updateField(field, t, 0.016, 1, near * 0.3);
    SL.drawField(ctx, field, view);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- presets ---------- */
  var presetWrap = $('#presets');
  function paintPresets() {
    Array.prototype.forEach.call(presetWrap.children, function (b) {
      var p = PRESETS[+b.dataset.i];
      var active = p.shape === state.shape && p.front === state.front && p.back === state.back;
      b.classList.toggle('active', active);
    });
  }
  PRESETS.forEach(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = String(i);
    b.innerHTML = '<span aria-hidden="true">' + p.emo + '</span>' + p.label;
    b.addEventListener('click', function () {
      SL.Audio.unlock();
      state.shape = p.shape;
      state.front = p.front;
      state.back = p.back;
      buildScene();
      paintPresets();
      animateTo(0);
      SL.Audio.ui();
    });
    presetWrap.appendChild(b);
  });

  /* ---------- sheet ---------- */
  var sheet = $('#sheet'), backdrop = $('#backdrop');
  var frontInput = $('#frontInput'), backInput = $('#backInput');
  var draft = { shape: state.shape, front: state.front, back: state.back };

  function paintSheet() {
    Array.prototype.forEach.call(document.querySelectorAll('.shape'), function (b) {
      b.classList.toggle('active', b.dataset.shape === draft.shape);
    });
    $('#frontWrap').classList.toggle('off', draft.shape !== 'text');
    if (frontInput.value !== draft.front) frontInput.value = draft.front;
    if (backInput.value !== draft.back) backInput.value = draft.back;
  }

  function buildChips() {
    var wrap = $('#chips');
    var all = BACK_CHIPS.slice(0, 2).concat(FRONT_CHIPS.slice(0, 2));
    all.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', function () {
        if (/^겉/.test(t)) { draft.front = t; frontInput.value = t; if (draft.shape !== 'text') draft.shape = 'text'; }
        else { draft.back = t; backInput.value = t; }
        paintSheet();
        SL.Audio.ui();
      });
      wrap.appendChild(b);
    });
  }

  function openSheet() {
    draft.shape = state.shape;
    draft.front = state.front;
    draft.back = state.back;
    paintSheet();
    sheet.hidden = false;
    backdrop.hidden = false;
    document.body.dataset.sheet = '1';
    requestAnimationFrame(function () { sheet.classList.add('show'); backdrop.classList.add('show'); });
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    document.body.dataset.sheet = '0';
    setTimeout(function () { sheet.hidden = true; backdrop.hidden = true; }, 320);
  }

  document.querySelectorAll('.shape').forEach(function (b) {
    b.addEventListener('click', function () {
      draft.shape = b.dataset.shape;
      paintSheet();
      SL.Audio.ui();
    });
  });
  frontInput.addEventListener('input', function () { draft.front = frontInput.value.slice(0, 40); });
  backInput.addEventListener('input', function () { draft.back = backInput.value.slice(0, 40); });
  $('#frontClear').addEventListener('click', function () { frontInput.value = ''; draft.front = ''; frontInput.focus(); SL.Audio.ui(); });
  $('#backClear').addEventListener('click', function () { backInput.value = ''; draft.back = ''; backInput.focus(); SL.Audio.ui(); });

  function applyDraft() {
    state.shape = draft.shape;
    state.front = draft.front;
    state.back = draft.back;
    buildScene();
    paintPresets();
    animateTo(0);
  }

  $('#previewBtn').addEventListener('click', function () { applyDraft(); closeSheet(); toast('90° 돌려서 확인해 보세요'); });
  $('#createBtn').addEventListener('click', function () { SL.Audio.unlock(); openSheet(); });
  $('#makeBtn2').addEventListener('click', openSheet);
  $('#sheetClose').addEventListener('click', function () { closeSheet(); SL.Audio.ui(); });
  backdrop.addEventListener('click', closeSheet);

  /* ---------- share ---------- */
  function shareUrl() {
    var u = new URL(location.href);
    u.search = '';
    var q = '?s=' + encodeURIComponent(state.shape) +
      (state.front ? '&f=' + encodeURIComponent(state.front) : '') +
      '&b=' + encodeURIComponent(state.back);
    return u.origin + u.pathname + q;
  }
  function legacyCopy(txt) {
    return new Promise(function (res, rej) {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.top = '-1000px';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? res() : rej(new Error('copy failed'));
      } catch (e) { rej(e); }
    });
  }
  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(function () { return legacyCopy(txt); });
    return legacyCopy(txt);
  }

  $('#shareBtn').addEventListener('click', function () {
    if (!draft.back.trim()) { toast('속마음을 먼저 적어주세요'); backInput.focus(); return; }
    applyDraft();
    var url = shareUrl();
    copyText(url).catch(function () { });
    if (navigator.share) {
      navigator.share({ title: '겉과 속', text: '90도 돌리면 속마음이 나옵니다', url: url })
        .then(function () { toast('링크를 보냈어요'); })
        .catch(function () { toast('링크를 복사했어요'); });
    } else toast('링크를 복사했어요');
    closeSheet();
    SL.Audio.ui();
  });

  /* ---------- toast / mute ---------- */
  var toastEl = $('#toast'), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  var muteBtn = $('#muteBtn');
  function paintMute() {
    muteBtn.setAttribute('aria-pressed', SL.Audio.isMuted() ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', SL.Audio.isMuted() ? '소리 켜기' : '소리 끄기');
  }
  muteBtn.addEventListener('click', function () {
    SL.Audio.unlock();
    SL.Audio.setMuted(!SL.Audio.isMuted());
    paintMute();
    if (!SL.Audio.isMuted()) SL.Audio.ui();
  });

  $('#flipBtn').addEventListener('click', function () {
    SL.Audio.unlock();
    animateTo(state.ang > 45 ? 0 : 90);
    if (!state.revealed) { state.revealed = true; dockActions.classList.add('show'); $('#hintLine').style.display = 'none'; }
  });

  /* ---------- boot ---------- */
  layout();
  density = SL.clamp(view.scale / 430, 1, 1.85);
  buildScene();
  paintPresets();
  buildChips();
  paintMute();
  if (fromLink) document.title = '겉과 속 — 90도 돌려보세요';
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
