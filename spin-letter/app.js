/* 별빛 편지 — app */
(function () {
  'use strict';
  var SL = window.SL;
  var R2D = 180 / Math.PI, D2R = Math.PI / 180;

  var $ = function (s) { return document.querySelector(s); };
  var canvas = $('#scene');
  var ctx = canvas.getContext('2d', { alpha: false });

  var DEFAULT_MSG = '오늘 밤, 한잔 어때요?';
  var EXAMPLES = ['오늘 밤, 한잔 어때요?', '사실 네가 좋아', '올해도 고마웠어', '미리 메리 크리스마스'];
  var SHAPES = ['wine', 'heart', 'tree', 'cake', 'coffee', 'gift', 'clover', 'moon', 'text'];

  var params = new URLSearchParams(location.search);
  var fromLink = params.has('m') || params.has('s');
  var pShape = (params.get('s') || '').toLowerCase();
  var pMsg = params.get('m');

  var state = {
    shape: SHAPES.indexOf(pShape) >= 0 ? pShape : 'wine',
    message: pMsg ? pMsg.slice(0, 60) : DEFAULT_MSG,
    yaw: 26 * D2R,
    pitch: -10 * D2R,
    vyaw: 0,
    vpitch: 0,
    dragging: false,
    unlocked: false,
    gather: 0,
    err: 90,
    time: 0,
    snap: null,
    touched: false,
    shift: 0
  };

  var field = null;
  var view = { yaw: 0, pitch: 0, scale: 400, cx: 200, cy: 360, focal: 5.2, depthScale: 1, depthAlpha: 0.5, glow: 1 };
  var size = { w: 390, h: 844, dpr: 1 };
  var density = 1;

  /* ---------------- scene build ---------------- */
  function buildScene() {
    var pts = [];
    var raw, i;
    var dn = density;
    var nShape = Math.round(1900 * Math.pow(dn, 1.2));
    var nText = Math.round(3200 * Math.pow(dn, 1.2));
    var dz = Math.pow(dn, 0.5);

    if (state.shape === 'text') {
      var r = SL.sampleText(state.message || '별빛 편지', { count: nText, maxLines: 3, boxW: 880, weight: 600 });
      var k = Math.min(0.88 / Math.max(r.w, 0.01), 0.90 / r.h);
      for (i = 0; i < r.pts.length; i++) {
        pts.push({ x: r.pts[i].x * k, y: r.pts[i].y * k, z: SL.rand(-0.02, 0.02) });
      }
      field = new SL.Field(SL.colourise(pts, {
        colors: ['#FFF7E8', '#FFE9F2', '#EFE6FF', '#E6F7FF', '#FFF1CF'],
        white: 0.3, sizeMin: 0.85 * dz, sizeMax: 1.2 * dz, sharp: true
      }), { spread: 0.54 });
      return;
    }

    // 3D shape — fitted to the frame so nothing is cropped
    raw = SL.shapes[state.shape](nShape);
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (i = 0; i < raw.length; i++) {
      if (raw[i].x < minX) minX = raw[i].x;
      if (raw[i].x > maxX) maxX = raw[i].x;
      if (raw[i].y < minY) minY = raw[i].y;
      if (raw[i].y > maxY) maxY = raw[i].y;
    }
    var cxx = (minX + maxX) / 2, cyy = (minY + maxY) / 2;
    var sc = Math.min(0.86 / Math.max(0.01, maxX - minX), 0.94 / Math.max(0.01, maxY - minY));
    for (i = 0; i < raw.length; i++) {
      pts.push({
        x: (raw[i].x - cxx) * sc,
        y: (raw[i].y - cyy) * sc,
        z: (raw[i].z || 0) * sc,
        color: raw[i].color,
        size: raw[i].size ? raw[i].size * dz : undefined
      });
    }
    var shapePts = SL.colourise(pts, { white: 0.12, sizeMin: 0.95 * dz, sizeMax: 1.65 * dz });
    field = new SL.Field(shapePts, { spread: 0.54 });
  }

  /* ---------------- layout ---------------- */
  function layout() {
    var f = SL.fitCanvas(canvas);
    size = f;
    var w = f.w, h = f.h;
    var S = Math.min(w * 1.12, h * 0.68);
    view.scale = S;
    view.cx = w / 2;
    view.cy = h * 0.44;
    state.baseCy = view.cy;
    var next = SL.clamp(S / 430, 1, 1.85);
    if (Math.abs(next - density) > 0.12) { density = next; if (field) buildScene(); }
    ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
  }

  /* ---------------- interaction ---------------- */
  var lastPointer = null;

  function pointPos(e) { return { x: e.clientX, y: e.clientY }; }

  function onDown(e) {
    if (state.snap) return;
    // iOS: warm the audio graph inside the very first user gesture
    SL.Audio.unlock();
    state.dragging = true;
    state.vyaw = 0; state.vpitch = 0;
    lastPointer = pointPos(e);
    state.lastMoveT = performance.now();
    canvas.classList.add('dragging');
    if (!state.touched) {
      state.touched = true;
      var hl = $('#hintLine');
      hl.style.transition = 'opacity .6s';
      hl.style.opacity = '0.35';
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  }

  function onMove(e) {
    if (!state.dragging) return;
    var p = pointPos(e);
    var dx = p.x - lastPointer.x;
    var dy = p.y - lastPointer.y;
    lastPointer = p;
    state.yaw += dx * 0.0072;
    state.pitch += dy * 0.0042;
    state.pitch = SL.clamp(state.pitch, -0.62, 0.62);
    state.vyaw = dx * 0.0072 * 0.55;
    state.vpitch = dy * 0.0042 * 0.5;
  }

  function onUp() {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.classList.remove('dragging');
    if (performance.now() - state.lastMoveT > 90) { state.vyaw = 0; state.vpitch = 0; }
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('pointerup', onUp);

  canvas.addEventListener('mousedown', function (e) { if (e.button !== 0) return; });
  window.addEventListener('wheel', function (e) {
    if (document.body.dataset.sheet === '1') return;
    state.yaw += (e.deltaX * 0.006 + e.deltaY * 0.0018);
    state.vyaw = 0;
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { state.yaw -= 0.09; state.vyaw = -0.01; }
    else if (e.key === 'ArrowRight') { state.yaw += 0.09; state.vyaw = 0.01; }
    else if (e.key === 'ArrowUp') { state.pitch = SL.clamp(state.pitch - 0.05, -0.62, 0.62); }
    else if (e.key === 'ArrowDown') { state.pitch = SL.clamp(state.pitch + 0.05, -0.62, 0.62); }
    else if (e.key === 'Escape') closeSheet();
    else return;
    if (e.key.indexOf('Arrow') === 0) { SL.Audio.unlock(); }
  });

  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  window.addEventListener('resize', function () { layout(); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });

  /* ---------------- reveal ---------------- */
  var gaugeEl = $('#gaugeFill'), gaugePct = $('#gaugePct'), gaugeText = $('#gaugeText');
  var gaugeWrap = document.querySelector('.gauge-wrap');
  var lastPct = -1;

  function unlockNow() {
    state.unlocked = true;
    state.snap = null;
    state.vyaw = 0; state.vpitch = 0;
    try { SL.Audio.reveal(); } catch (e) { }
    try { if (navigator.vibrate) navigator.vibrate([0, 26, 46, 40]); } catch (e) { }
    $('#letterBody').textContent = state.message || '';
    $('#dock').classList.add('hide');
    $('#startNote').hidden = true;
    state.shift = 26;
    setTimeout(function () { $('#letter').classList.add('show'); }, 260);
    document.body.classList.add('opened');
    gaugeEl.style.width = '100%';
    gaugePct.textContent = '100%';
    gaugeText.textContent = '찰칵, 편지가 열렸어요';
    gaugeWrap.classList.add('near');
  }

  function relock() {
    state.unlocked = false;
    state.yaw = 24 * D2R;
    state.pitch = -9 * D2R;
    state.vyaw = 0; state.vpitch = 0;
    state.snap = null;
    state.shift = 0;
    $('#letter').classList.remove('show');
    $('#dock').classList.remove('hide');
    document.body.classList.remove('opened');
  }

  /* ---------------- loop ---------------- */
  var last = performance.now();

  function update(dt) {
    state.time += dt;

    if (state.snap) {
      state.snap.t += dt / 0.52;
      var t = SL.clamp(state.snap.t, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      state.yaw = SL.lerp(state.snap.fy, 0, e);
      state.pitch = SL.lerp(state.snap.fp, 0, e);
      if (t >= 1) { state.yaw = 0; state.pitch = 0; state.snap = null; }
    } else if (!state.dragging) {
      state.yaw += state.vyaw;
      state.pitch += state.vpitch;
      state.vyaw *= 0.935;
      state.vpitch *= 0.93;
      if (Math.abs(state.vyaw) < 0.00012) state.vyaw = 0;
      if (Math.abs(state.vpitch) < 0.00012) state.vpitch = 0;
      // magnet toward the true angle (nearest full turn)
      var yd = state.yaw * R2D;
      var near = SL.wrapDeg(yd);
      if (Math.abs(near) < 22) {
        var pull = (1 - Math.abs(near) / 22) * 3.2 * dt;
        state.yaw -= near * D2R * Math.min(1, pull);
        state.pitch -= state.pitch * Math.min(1, pull * 0.86);
      }
    }
    state.pitch = SL.clamp(state.pitch, -0.62, 0.62);

    var yawDeg = SL.wrapDeg(state.yaw * R2D);
    var pitchDeg = state.pitch * R2D;
    var err = Math.sqrt(yawDeg * yawDeg + pitchDeg * pitchDeg * 1.35);
    state.err = err;

    var g = SL.smooth(1 - err / 34);
    if (state.unlocked) g = Math.max(g, 0.93);
    state.gather = g;

    if (!state.unlocked && err < 11 && !state.snap) {
      unlockNow();
    }

    // gauge (throttled)
    if (!state.unlocked) {
      var pct = Math.round(g * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        gaugeEl.style.width = pct + '%';
        gaugePct.textContent = pct + '%';
        gaugeText.textContent =
          pct < 30 ? '별빛이 흩어져 있어요' :
            pct < 60 ? '뭔가 모이고 있어요' :
              pct < 88 ? '거의 다 왔어요…' : '지금이에요, 찰칵!';
        gaugeWrap.classList.toggle('near', pct >= 78);
        if (pct >= 70) SL.Audio.blip(pct / 100);
      }
    }

    view.cy += ((size.h * 0.44) - view.cy) * Math.min(1, dt * 4);
  }

  function render() {
    var w = size.w, h = size.h;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // soft aurora behind the constellation
    var g = state.gather;
    var cx = view.cx, cy = view.cy, R = Math.max(w, h) * 0.75;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    var a1 = 0.035 + 0.10 * g;
    grad.addColorStop(0, 'rgba(124, 74, 190, ' + a1.toFixed(3) + ')');
    grad.addColorStop(0.45, 'rgba(66, 40, 120, ' + (a1 * 0.45).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // micro tremor when the right angle is close
    var shake = 0;
    if (!state.unlocked && state.err < 18 && !state.snap) {
      shake = (1 - state.err / 18) * 0.011;
    }
    var t = state.time;
    view.yaw = state.yaw + Math.sin(t * 31) * shake;
    view.pitch = state.pitch + Math.cos(t * 37) * shake * 0.6;
    view.glow = 0.95 + 0.3 * g;

    SL.updateField(field, t, 0.016, g, shake * 0.35);
    SL.drawField(ctx, field, view);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------------- sheet / create ---------------- */
  var sheet = $('#sheet'), backdrop = $('#backdrop'), input = $('#msgInput');
  var draft = { shape: state.shape, message: state.message };

  function paintSheet() {
    Array.prototype.forEach.call(document.querySelectorAll('.shape'), function (b) {
      var on = b.dataset.shape === draft.shape;
      b.classList.toggle('active', on);
    });
    if (input.value !== draft.message) input.value = draft.message;
  }

  // 선택된 모양 버튼이 가로 스크롤 밖에 있으면 보이게 당겨온다
  function revealActiveShape() {
    var on = document.querySelector('.shape.active');
    var row = document.getElementById('shapeRow');
    if (!on || !row) return;
    var target = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
    target = Math.max(0, Math.min(target, row.scrollWidth - row.clientWidth));
    if (Math.abs(row.scrollLeft - target) > 4) {
      if (row.scrollTo) row.scrollTo({ left: target, behavior: 'smooth' });
      else row.scrollLeft = target;
    }
  }

  function buildChips() {
    var wrap = $('#chips');
    EXAMPLES.forEach(function (ex) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = ex;
      b.addEventListener('click', function () {
        draft.message = ex;
        input.value = ex;
        SL.Audio.ui();
      });
      wrap.appendChild(b);
    });
  }

  function openSheet() {
    draft.shape = state.shape;
    draft.message = state.message;
    paintSheet();
    sheet.hidden = false;
    backdrop.hidden = false;
    document.body.dataset.sheet = '1';
    requestAnimationFrame(function () {
      sheet.classList.add('show');
      backdrop.classList.add('show');
      revealActiveShape();
    });
  }

  function closeSheet() {
    if (sheet.hidden) return;
    stopVoice();
    sheet.classList.remove('show');
    backdrop.classList.remove('show');
    document.body.dataset.sheet = '0';
    setTimeout(function () { sheet.hidden = true; backdrop.hidden = true; }, 320);
  }

  document.querySelectorAll('.shape').forEach(function (b) {
    b.addEventListener('click', function () {
      draft.shape = b.dataset.shape;
      paintSheet();
      revealActiveShape();
      SL.Audio.ui();
      applyDraft(true);
    });
  });

  input.addEventListener('input', function () {
    draft.message = input.value.slice(0, 60);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); applyDraft(); }
  });
  $('#msgClear').addEventListener('click', function () {
    input.value = '';
    draft.message = '';
    input.focus();
    SL.Audio.ui();
  });

  /* ---------------- voice input (말로 입력) ---------------- */
  var voiceBtn = $('#voiceBtn');
  var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null, listening = false, voiceBase = '', voiceNotice = false;

  function setListening(on) {
    listening = on;
    voiceBtn.classList.toggle('listening', on);
    voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    voiceBtn.setAttribute('aria-label', on ? '말로 입력 중지' : '말로 입력');
  }

  function stopVoice() {
    if (recog && listening) { try { recog.stop(); } catch (e) { } }
    setListening(false);
  }

  function commitVoice(text) {
    var merged = (voiceBase ? voiceBase + ' ' : '') + text;
    merged = merged.replace(/\s+/g, ' ').trim().slice(0, 60);
    input.value = merged;
    draft.message = merged;
    return merged;
  }

  function startVoice() {
    if (!SpeechRec) {
      toast('이 브라우저는 말로 입력을 지원하지 않아요. 직접 적어주세요');
      try { input.focus({ preventScroll: true }); } catch (e) { }
      return;
    }
    voiceBase = input.value.replace(/\s+/g, ' ').trim();
    voiceNotice = false;
    try {
      recog = new SpeechRec();
      recog.lang = 'ko-KR';
      recog.interimResults = true;
      recog.continuous = false;
      recog.maxAlternatives = 1;
      recog.onstart = function () { setListening(true); };
      recog.onresult = function (e) {
        var txt = '';
        for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        if (!txt.trim()) return;
        if (commitVoice(txt).length >= 60) { try { recog.stop(); } catch (err) { } }
      };
      recog.onerror = function (e) {
        var code = (e && e.error) || '';
        if (code === 'aborted') return;
        voiceNotice = true;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          toast('마이크 사용을 허용해 주세요');
        } else if (code === 'audio-capture') {
          toast('마이크를 찾을 수 없어요. 직접 적어주세요');
        } else if (code === 'no-speech') {
          toast('잘 안 들렸어요. 다시 눌러 말해주세요');
        } else {
          toast('음성 인식이 안 됐어요. 직접 적어주세요');
        }
      };
      recog.onend = function () {
        setListening(false);
        if (!voiceNotice && !input.value.trim()) toast('잘 안 들렸어요. 다시 눌러 말해주세요');
      };
      recog.start();
      setListening(true);
      SL.Audio.ui();
    } catch (err) {
      setListening(false);
      toast('말로 입력을 시작하지 못했어요. 직접 적어주세요');
    }
  }

  voiceBtn.addEventListener('click', function () {
    SL.Audio.unlock();
    if (listening) { stopVoice(); SL.Audio.ui(); return; }
    startVoice();
  });

  function applyDraft(preview) {
    state.shape = draft.shape;
    state.message = draft.message;
    buildScene();
    if (preview) relock();
  }

  $('#previewBtn').addEventListener('click', function () {
    applyDraft(true);
    closeSheet();
    toast('돌려서 편지를 열어보세요');
    SL.Audio.ui();
  });

  $('#createBtn').addEventListener('click', function () { SL.Audio.unlock(); openSheet(); });
  $('#makeBtn').addEventListener('click', function () { openSheet(); });
  $('#sheetClose').addEventListener('click', function () { closeSheet(); SL.Audio.ui(); });
  backdrop.addEventListener('click', closeSheet);

  /* ---------------- share ---------------- */
  function shareUrl() {
    var u = new URL(location.href);
    u.search = '';
    var q = '?s=' + encodeURIComponent(state.shape) + '&m=' + encodeURIComponent(state.message);
    return u.origin + u.pathname + q;
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt).catch(function () { return legacyCopy(txt); });
    }
    return legacyCopy(txt);
  }
  function legacyCopy(txt) {
    return new Promise(function (res, rej) {
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
        ok ? res() : rej(new Error('copy failed'));
      } catch (e) { rej(e); }
    });
  }

  $('#shareBtn').addEventListener('click', function () {
    if (!draft.message.trim()) { toast('메시지를 먼저 적어주세요'); input.focus(); return; }
    applyDraft(false);
    var url = shareUrl();
    var msg = state.message;
    copyText(url).catch(function () { });
    if (navigator.share) {
      navigator.share({ title: '별빛 편지', text: '"' + msg + '" — 돌려서 열어보세요', url: url })
        .then(function () { toast('링크를 보냈어요'); })
        .catch(function () { toast('링크를 복사했어요'); });
    } else {
      toast('링크를 복사했어요');
    }
    relock();
    closeSheet();
    SL.Audio.ui();
  });

  /* ---------------- toast ---------------- */
  var toastEl = $('#toast'), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ---------------- mute ---------------- */
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

  $('#againBtn').addEventListener('click', function () {
    relock();
    SL.Audio.ui();
  });

  /* ---------------- boot ---------------- */
  layout();
  density = SL.clamp(view.scale / 430, 1, 1.85);
  buildScene();
  buildChips();
  paintMute();
  if (fromLink) {
    $('#startNote').hidden = false;
    document.title = '별빛 편지 — 누군가 남긴 편지';
  }
  requestAnimationFrame(function (t) { last = t; frame(t); });
})();
