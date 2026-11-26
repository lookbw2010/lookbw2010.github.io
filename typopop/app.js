/* TypoPop — app.js : dictionary, detection, studio UI, share viewer */
(function () {
  'use strict';

  /* ============================================================
     dictionary — keyword -> motion
     ============================================================ */
  var MOTIONS = [
    { key: 'umbrella', en: ['umbrella', 'rain', 'rainy'], ko: ['우산', '비'] },
    { key: 'steps', en: ['steps', 'step', 'stairs', 'stair', 'climb'], ko: ['계단', '한걸음'] },
    { key: 'kick', en: ['kick', 'kicking'], ko: ['발차기', '퇴근', '차다'] },
    { key: 'help', en: ['help', 'sos'], ko: ['도움', '살려줘', '도와줘', '헬프'] },
    { key: 'foot', en: ['foot', 'feet', 'walk', 'walking', 'stroll'], ko: ['산책', '걷기', '걸어'] },
    { key: 'coffee', en: ['coffee', 'latte', 'espresso', 'americano'], ko: ['커피', '라떼', '아메리카노'] },
    { key: 'love', en: ['love', 'heart'], ko: ['사랑', '하트'] },
    {
      key: 'thanks', en: ['thank', 'thanks', 'thankyou', 'thankful', 'grateful', 'gratitude', 'appreciate'],
      ko: ['감사', '고마워', '고맙', '덕분'],
      ph: ['thank you so much', 'thank you very much', 'thank you', '감사합니다', '감사해요', '감사드립니다', '감사드려요', '고맙습니다', '고마워요', '덕분에']
    },
    { key: 'cheers', en: ['cheers', 'cheer', 'congrats', 'congratulation', 'congratulations', 'hooray', 'birthday', 'party'], ko: ['축하', '생일', '파티', '만세'] },
    { key: 'sleep', en: ['sleep', 'sleepy', 'goodnight', 'rest', 'dream'], ko: ['잘자', '휴식', '굿나잇', '꿈'] },
    { key: 'rocket', en: ['rocket', 'launch', 'fight', 'fighting', 'challenge'], ko: ['도전', '화이팅', '파이팅', '로켓', '출발'] },
    {
      key: 'christmas', en: ['christmas', 'xmas', 'santa', 'merry'],
      ko: ['크리스마스', '성탄', '메리크리스마스', '산타'],
      ph: ['merry christmas', '메리 크리스마스', '메리크리스마스']
    },
    {
      key: 'newyear', en: ['newyear', '2026', '2027', 'happynewyear'],
      ko: ['신년', '새해', '새해복', '신정', '해돋이'],
      ph: ['happy new year', 'new year', '새해 복', '새해복 많이', '신년 인사']
    }
  ];

  /* Korean particles and common verb endings that may follow a keyword */
  var JOSA = /^[이가를을은는도만요에랑과의로와해했하자할한함니냐라야다네군쯤씩들]{0,2}$/;

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* "Merry Christmas" / "새해 복" 같이 띄어 쓴 구문도 한 덩어리로 잡는다 */
  function phraseRe(p) {
    var body = String(p).split(/\s+/).map(escapeRe).join('[\\s,\\.]+');
    return new RegExp('(^|[^\\uAC00-\\uD7A3A-Za-z0-9])(' + body + ')($|[^\\uAC00-\\uD7A3A-Za-z0-9])', 'i');
  }

  function detect(text) {
    var best = null;
    if (!text) return { key: 'pop', word: '' };

    MOTIONS.forEach(function (m) {
      // whole phrases first — they highlight and cover the full expression
      if (m.ph) {
        m.ph.forEach(function (p) {
          var mm = phraseRe(p).exec(text);
          if (mm) {
            var pidx = mm.index + mm[1].length, pword = mm[2];
            if (!best || pword.length > best.word.length || (pword.length === best.word.length && pidx < best.idx)) {
              best = { idx: pidx, key: m.key, word: pword };
            }
          }
        });
      }
      // English words
      m.en.forEach(function (w) {
        var re = new RegExp('(^|[^A-Za-z0-9])(' + escapeRe(w) + ')(s|es|ing|ed)?($|[^A-Za-z0-9])', 'i');
        var mm = re.exec(text);
        if (mm) {
          var idx = mm.index + mm[1].length;
          var word = mm[2] + (mm[3] || '');
          if (!best || word.length > best.word.length || (word.length === best.word.length && idx < best.idx)) {
            best = { idx: idx, key: m.key, word: word };
          }
        }
      });
      // Korean tokens
      var kre = /[\uAC00-\uD7A3]+/g, km;
      while ((km = kre.exec(text)) !== null) {
        var tk = km[0];
        for (var i = 0; i < m.ko.length; i++) {
          var kw = m.ko[i];
          if (tk === kw) {
            if (!best || kw.length > best.word.length || (kw.length === best.word.length && km.index < best.idx)) {
              best = { idx: km.index, key: m.key, word: kw };
            }
            break;
          }
          if (tk.indexOf(kw) === 0) {
            var tail = tk.slice(kw.length);
            if (tail.length <= 2 && JOSA.test(tail)) {
              if (!best || kw.length > best.word.length || (kw.length === best.word.length && km.index < best.idx)) {
                best = { idx: km.index, key: m.key, word: kw };
              }
              break;
            }
          }
        }
      }
    });

    if (best) return { key: best.key, word: best.word, idx: best.idx };

    // fallback: longest word in the line becomes the hero
    var words = text.match(/[^\s,.;:!?"'()\[\]]+/g) || [text];
    var pick = words[0];
    words.forEach(function (w) { if (w.length >= pick.length) pick = w; });
    var at = text.indexOf(pick);
    return { key: 'pop', word: pick, idx: at < 0 ? 0 : at, fallback: true };
  }

  /* ============================================================
     copy
     ============================================================ */
  var T = {
    ko: {
      ph: '문장을 지어보세요 — 예: 오늘 비 오는데 우산 챙겨',
      idle: '문장을 쓰면 핵심 단어가 살아나요',
      live: '지금 살아 있는 단어',
      replay: '↻ 다시 재생',
      stage: '무대',
      copy: '링크 복사',
      copied: '복사했어요',
      clear: '지우기',
      preview: '받는 사람 화면',
      cta: '나도 만들어 보기',
      mic: '말로 만들기',
      micOn: '듣는 중',
      vUnsupported: '이 브라우저에서는 음성 인식을 지원하지 않아요. 직접 입력해 주세요.',
      vPermission: '마이크 권한이 필요해요. 주소창 옆 설정에서 마이크를 허용해 주세요.',
      vNoSpeech: '잘 들리지 않았어요. 다시 말해 주세요.',
      vNetwork: '음성 인식 서버에 연결하지 못했어요. 직접 입력해 주세요.',
      vAudio: '마이크를 찾지 못했어요. 기기 마이크를 확인해 주세요.',
      vError: '음성 인식이 되지 않았어요. 직접 입력해 주세요.',
      themes: { studio: '스튜디오', ink: '잉크', blue: '블루', yellow: '포스터' },
      presets: [
        { w: '크리스마스', text: '크리스마스 잘 보내세요' },
        { w: '새해', text: '새해 복 많이 받으세요' },
        { w: '감사', text: '정말 감사합니다' },
        { w: '우산', text: '오늘 비 오는데, 우산 챙겨' },
        { w: '계단', text: '한 칸씩 계단을 올라가자' },
        { w: '퇴근', text: '오늘은 여기서 퇴근!' },
        { w: '살려줘', text: '힘들면 살려줘, 내가 갈게' },
        { w: '산책', text: '저녁엔 천천히 산책 어때' },
        { w: '커피', text: '오늘도 수고했어, 커피 한잔' },
        { w: '생일', text: '우리 시완이, 생일 축하해' },
        { w: '사랑', text: '오늘 하루도 사랑해' }
      ],
      dflt: '오늘 비 오는데, 우산 챙겨'
    },
    en: {
      ph: 'Write a line — e.g. Don\u2019t forget your umbrella',
      idle: 'Type a line — the key word comes alive',
      live: 'live word',
      replay: '↻ Replay',
      stage: 'stage',
      copy: 'Copy link',
      copied: 'Link copied',
      clear: 'Clear',
      preview: 'Recipient view',
      cta: 'Make your own',
      mic: 'Voice',
      micOn: 'Listening',
      vUnsupported: 'This browser can\u2019t do voice input. Please type instead.',
      vPermission: 'Mic access is needed. Allow the microphone in your browser settings.',
      vNoSpeech: 'I didn\u2019t catch that. Try again.',
      vNetwork: 'Couldn\u2019t reach the speech service. Please type instead.',
      vAudio: 'No microphone found. Check your device.',
      vError: 'Voice input failed. Please type instead.',
      themes: { studio: 'Studio', ink: 'Ink', blue: 'Blue', yellow: 'Poster' },
      presets: [
        { w: 'christmas', text: 'Merry Christmas, everyone' },
        { w: 'newyear', text: 'Happy New Year, 2027' },
        { w: 'Thanks', text: 'Thank you so much' },
        { w: 'umbrella', text: 'Don\u2019t forget your umbrella' },
        { w: 'STEPS', text: 'STEPS to the top, one at a time' },
        { w: 'KICK', text: 'Weekend starts now, KICK it off' },
        { w: 'HELP', text: 'If it gets heavy, HELP is here' },
        { w: 'foot', text: 'One foot after another' },
        { w: 'coffee', text: 'Good work today, coffee is on me' },
        { w: 'cheers', text: 'Cheers to your big day' },
        { w: 'love', text: 'Love you more than yesterday' }
      ],
      dflt: 'Don\u2019t forget your umbrella'
    }
  };

  var THEMES = ['studio', 'ink', 'blue', 'yellow'];
  var SWATCH = { studio: '#FFFFFF', ink: '#0F0F12', blue: '#1B2AD4', yellow: '#FFD400' };

  /* ============================================================
     state + dom
     ============================================================ */
  var params = new URLSearchParams(location.search);
  var state = {
    lang: (function () {
      var l = params.get('l') || params.get('lang');
      return l === 'en' ? 'en' : (l === 'ko' ? 'ko' : (/^ko/i.test(navigator.language || '') ? 'ko' : 'en'));
    })(),
    theme: THEMES.indexOf(params.get('t') || params.get('theme')) >= 0 ? (params.get('t') || params.get('theme')) : 'studio',
    text: params.get('m') || '',
    touched: !!params.get('m')
  };
  state.text = (state.text || T[state.lang].dflt).slice(0, 90);

  var $ = function (s) { return document.querySelector(s); };
  var svg = $('#svg'), stage = $('#stage'), shareview = $('#shareview'), svStage = $('#sv-stage');
  var input = $('#input'), detectEl = $('#detect'), detectText = $('#detect-text');
  var presetsEl = $('#presets'), swatchesEl = $('#swatches'), toastEl = $('#toast');
  var copyBtn = $('#copy'), copyText = $('#copy-text'), previewBtn = $('#preview');
  var micBtn = $('#mic'), micText = $('#mic-text');
  var fieldEl = $('#field'), clearBtn = $('#clear');

  var scene = null;
  var current = { key: null, word: null, caption: null };
  var startAt = performance.now();
  var ACTIVE = 1000, HOLD = 1500, CYCLE = ACTIVE + HOLD;
  var raf = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var typingTimer = null;

  /* ---------- scene ---------- */
  function captionSegments(text, word, idx) {
    if (!text) return [];
    if (!word || idx == null || idx < 0) return [{ t: text, a: false }];
    var out = [];
    if (idx > 0) out.push({ t: text.slice(0, idx), a: false });
    out.push({ t: text.slice(idx, idx + word.length), a: true });
    if (idx + word.length < text.length) out.push({ t: text.slice(idx + word.length), a: false });
    return out;
  }

  function apply(opts) {
    opts = opts || {};
    var text = (state.text || '').trim();
    var d = detect(text);

    var word = d.word || 'TypoPop';
    var caption = text ? captionSegments(text, d.word, d.idx) : [];
    // the caption keeps the whole line; the hero word is the living word
    var sig = d.key + '|' + word + '|' + text;
    if (!scene || current.sig !== sig) {
      current = { key: d.key, word: word, caption: caption, sig: sig };
      try {
        scene = TypoPop.render(svg, { word: word, caption: caption, motion: d.key });
      } catch (e) {
        scene = TypoPop.render(svg, { word: word, caption: [], motion: 'pop' });
      }
      document.title = text ? ('TypoPop — ' + word) : 'TypoPop — 살아 움직이는 1초 카드';
    }

    syncClear();

    // hint
    detectEl.classList.toggle('idle', !text);
    if (!text) {
      detectText.textContent = T[state.lang].idle;
    } else {
      detectText.innerHTML = T[state.lang].live + ' · <b>' + esc(d.word) + '</b>';
    }

    // active preset
    Array.prototype.forEach.call(presetsEl.children, function (chip) {
      chip.classList.toggle('on', state.text === chip.dataset.text);
    });

    if (!opts.keepPlayhead) replay();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  /* clear (×) button shows only while there is something to clear */
  function syncClear() {
    if (!clearBtn) return;
    var has = !!(input.value && input.value.length);
    fieldEl.classList.toggle('has-text', has);
    clearBtn.classList.toggle('on', has);
    clearBtn.setAttribute('aria-label', T[state.lang].clear);
    clearBtn.setAttribute('title', T[state.lang].clear);
  }

  function replay() {
    startAt = performance.now();
    if (reduce) { scene && scene.frame(1, 0); return; }
    if (!raf) loop();
  }

  window.TypoPop = window.TypoPop || {};
  window.TypoPop.seek = function (b, ms) {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (scene) scene.frame(Math.max(0, Math.min(1, b)), ms === undefined ? 1200 : ms);
  };
  window.TypoPop.resume = function () { if (!raf && !reduce) loop(); };
  window.TypoPop.state = state;

  function loop() {
    raf = requestAnimationFrame(function tick(now) {
      var t = (now - startAt) % CYCLE;
      var b = Math.min(1, t / ACTIVE);
      if (scene) scene.frame(b, now);
      if (document.hidden) { raf = null; return; }
      raf = requestAnimationFrame(tick);
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !raf && !reduce) loop();
  });

  /* ---------- presets ---------- */
  function buildPresets() {
    presetsEl.innerHTML = '';
    T[state.lang].presets.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = p.w;
      b.dataset.text = p.text;
      b.addEventListener('click', function () {
        state.text = p.text;
        state.touched = true;
        input.value = p.text;
        apply();
      });
      presetsEl.appendChild(b);
    });
  }

  /* ---------- themes ---------- */
  function buildSwatches() {
    swatchesEl.innerHTML = '';
    THEMES.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw' + (state.theme === k ? ' on' : '');
      b.dataset.theme = k;
      b.innerHTML = '<i style="background:' + SWATCH[k] + '"></i><span>' + T[state.lang].themes[k] + '</span>';
      b.addEventListener('click', function () {
        setTheme(k);
      });
      swatchesEl.appendChild(b);
    });
  }

  function setTheme(k) {
    state.theme = k;
    stage.setAttribute('data-theme', k);
    shareview.setAttribute('data-theme', k);
    Array.prototype.forEach.call(swatchesEl.children, function (el) {
      el.classList.toggle('on', el.dataset.theme === k);
    });
    var v = document.querySelector('meta[name="theme-color"]');
    if (v) v.setAttribute('content', k === 'ink' ? '#0F0F12' : (k === 'blue' ? '#1B2AD4' : (k === 'yellow' ? '#FFD400' : '#F2F3F5')));
  }

  /* ---------- labels ---------- */
  function applyLang() {
    var t = T[state.lang];
    document.documentElement.lang = state.lang;
    input.placeholder = t.ph;
    $('#replay').textContent = t.replay;
    $('#themes-label').textContent = t.stage;
    copyText.textContent = t.copy;
    previewBtn.textContent = t.preview;
    if (micBtn) {
      micText.textContent = listening ? t.micOn : t.mic;
      micBtn.setAttribute('aria-label', listening ? t.micOn : t.mic);
      micBtn.setAttribute('title', listening ? t.micOn : t.mic);
    }
    $('#sv-cta').innerHTML = t.cta + ' <span aria-hidden="true">→</span>';
    Array.prototype.forEach.call(document.querySelectorAll('#lang button'), function (b) {
      b.classList.toggle('on', b.dataset.lang === state.lang);
    });
    buildPresets();
    buildSwatches();
    syncClear();
  }

  /* ---------- share ---------- */
  function shareURL() {
    var u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('m', state.text || current.word || '');
    u.searchParams.set('theme', state.theme);
    u.searchParams.set('lang', state.lang);
    return u.toString();
  }

  var pushed = false;

  function openShare(push) {
    shareview.setAttribute('data-theme', state.theme);
    svStage.appendChild(svg);
    shareview.hidden = false;
    document.body.style.overflow = 'hidden';
    replay();
    document.title = 'TypoPop — ' + (current.word || '');
    if (push) {
      try { history.pushState({ tp: 1 }, '', shareURL()); pushed = true; } catch (e) { }
    }
  }

  function closeShare(fromPop) {
    shareview.hidden = true;
    stage.appendChild(svg);
    document.body.style.overflow = '';
    apply({ keepPlayhead: true });
    replay();
    if (pushed && !fromPop) {
      pushed = false;
      try { history.pushState({ tp: 0 }, '', location.pathname); } catch (e) { }
    }
    pushed = false;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toastEl.classList.remove('on');
      setTimeout(function () { toastEl.hidden = true; }, 240);
    }, 1700);
  }

  function doCopy() {
    var url = shareURL();
    function done() { copyText.textContent = T[state.lang].copied; toast(T[state.lang].copied); setTimeout(function () { copyText.textContent = T[state.lang].copy; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { legacyCopy(url, done); });
    } else legacyCopy(url, done);
  }

  function legacyCopy(str, done) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, str.length);
    try { document.execCommand('copy'); done(); } catch (e) { toast(str); }
    document.body.removeChild(ta);
  }

  /* ---------- wiring ---------- */
  input.addEventListener('input', function () {
    state.text = input.value;
    state.touched = true;
    syncClear();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { apply(); }, 260);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(typingTimer);
      apply();
      if (window.innerWidth < 700) input.blur();
    }
  });

  $('#replay').addEventListener('click', function () { replay(); });

  if (clearBtn) {
    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(typingTimer);
      input.value = '';
      state.text = '';
      state.touched = true;
      syncClear();
      apply();
      try { input.focus({ preventScroll: true }); } catch (err) { try { input.focus(); } catch (e2) { } }
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('#lang button'), function (b) {
    b.addEventListener('click', function () {
      if (state.lang === b.dataset.lang) return;
      stopVoice();
      state.lang = b.dataset.lang;
      if (!state.touched) {
        state.text = T[state.lang].dflt;
        input.value = state.text;
      }
      applyLang();
      apply();
    });
  });

  copyBtn.addEventListener('click', doCopy);
  previewBtn.addEventListener('click', function () { openShare(true); });
  $('#sv-cta').addEventListener('click', function (e) { e.stopPropagation(); closeShare(); });
  $('#sv-close').addEventListener('click', function (e) { e.stopPropagation(); closeShare(); });
  svStage.addEventListener('click', function () { replay(); });

  window.addEventListener('popstate', function () {
    if (!shareview.hidden) { closeShare(true); }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !shareview.hidden) closeShare();
  });

  window.addEventListener('resize', function () {
    // stage width is CSS-driven; only repaint sizes that depend on the stage
  });

  /* ---------- voice input (Web Speech API) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var recog = null, listening = false;

  function setListening(on) {
    listening = on;
    if (!micBtn) return;
    micBtn.classList.toggle('on', on);
    micBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    micText.textContent = on ? T[state.lang].micOn : T[state.lang].mic;
    micBtn.setAttribute('aria-label', on ? T[state.lang].micOn : T[state.lang].mic);
  }

  var voiceTimer = null, startTimer = null, voiceStarted = false;
  var voiceHeard = false, voiceErrored = false, voiceByUser = false;

  function clearVoiceTimer() {
    if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = null; }
    if (startTimer) { clearTimeout(startTimer); startTimer = null; }
  }

  function stopVoice() {
    clearVoiceTimer();
    if (!recog) { setListening(false); return; }
    var r = recog;
    recog = null;
    voiceByUser = true;
    try { r.abort ? r.abort() : r.stop(); } catch (e) { }
    setListening(false);
  }

  function startVoice() {
    var t = T[state.lang];
    if (!SR || !window.isSecureContext) { toast(t.vUnsupported); return; }
    try {
      recog = new SR();
    } catch (e) { toast(t.vUnsupported); return; }

    recog.lang = state.lang === 'ko' ? 'ko-KR' : 'en-US';
    recog.interimResults = true;
    recog.continuous = false;
    recog.maxAlternatives = 1;

    recog.onstart = function () { voiceStarted = true; if (startTimer) { clearTimeout(startTimer); startTimer = null; } setListening(true); };
    recog.onaudiostart = function () { voiceStarted = true; setListening(true); };
    recog.onspeechend = function () { setListening(false); };
    recog.onresult = function (ev) {
      clearVoiceTimer();
      voiceHeard = true;
      var out = '';
      for (var i = 0; i < ev.results.length; i++) out += ev.results[i][0].transcript;
      out = out.replace(/\s+/g, ' ').replace(/^[\s,.;:!?]+|[\s,]+$/g, '').slice(0, 90);
      if (!out) return;
      state.text = out;
      state.touched = true;
      input.value = out;
      clearTimeout(typingTimer);
      apply();
    };
    recog.onerror = function (ev) {
      clearVoiceTimer();
      voiceErrored = true;
      var code = (ev && ev.error) || '';
      if (code === 'aborted') { voiceByUser = true; return; }
      var msg = t.vError;
      if (code === 'not-allowed' || code === 'service-not-allowed') msg = t.vPermission;
      else if (code === 'no-speech') msg = t.vNoSpeech;
      else if (code === 'network') msg = t.vNetwork;
      else if (code === 'audio-capture') msg = t.vAudio;
      toast(msg);
    };
    recog.onend = function () {
      clearVoiceTimer();
      recog = null;
      setListening(false);
      if (!voiceHeard && !voiceErrored && !voiceByUser) toast(T[state.lang].vNoSpeech);
    };

    voiceHeard = false;
    voiceErrored = false;
    voiceByUser = false;

    try {
      recog.start();
      setListening(true);            /* instant feedback on the tap */
      clearVoiceTimer();
      voiceStarted = false;
      startTimer = setTimeout(function () {
        if (!recog || voiceStarted) return;
        toast(T[state.lang].vUnsupported);
        stopVoice();
      }, 3000);
      voiceTimer = setTimeout(function () {
        if (!recog) return;
        toast(T[state.lang].vNoSpeech);
        stopVoice();
      }, 9000);
    } catch (e) {
      recog = null;
      setListening(false);
      toast(t.vUnsupported);
    }
  }

  if (micBtn) {
    micBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (listening) stopVoice(); else startVoice();
    });
  }

  /* ---------- boot ---------- */
  applyLang();
  input.value = state.text;
  setTheme(state.theme);

  function boot() {
    apply();
    if (params.get('m')) { openShare(false); }
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    setTimeout(function () { if (!scene) boot(); }, 900);
  } else {
    boot();
  }
})();
