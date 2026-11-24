/* ══════════════════════════════════════════════════════════
   빅넘버월드 · app.js
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SHARE_URL = 'https://lookbw2010.github.io/bignumber-world/';
  var CATS = { math: '수학·방정식', history: '역사·인문', pop: '연예·음악·영화', brand: '브랜드·라이프', mix: '이종 결합' };
  var LVS = { 1: '입문', 2: '중수', 3: '고수', 4: '오타쿠' };
  var TIERS = [
    { min: 90, key: 'god', emoji: '👑', name: '빅넘버 갓', msg: '이 페이지의 주인이 맞습니다. Lv.4 믹스도 흔들리지 않네요. 타임어택 최고 기록까지 노려 보세요.' },
    { min: 70, key: 'otaku', emoji: '🧠', name: '숫자오타쿠', msg: '연도와 단위가 손끝에 붙었습니다. 브랜드 팩까지 가면 Lv.4 믹스가 진짜 재미입니다.' },
    { min: 40, key: 'hunter', emoji: '🔎', name: '숫자헌터', msg: '감은 충분합니다. 틀린 문제의 해설만 다시 읽어도 다음 판은 달라집니다.' },
    { min: 0, key: 'su', emoji: '🐣', name: '수린이', msg: '여기서 시작이 반. Lv.1부터 한 판 더 돌리면 금방 숫자가 보이기 시작합니다.' }
  ];

  /* ── 유틸 ─────────────────────────────────────────────── */
  function safeCalc(expr) {
    if (typeof expr !== 'string' || !/^[-+*/().\d\s]+$/.test(expr)) return NaN;
    try { return Function('"use strict";return (' + expr + ')')(); } catch (e) { return NaN; }
  }

  function fmt(v, unit) {
    if (v == null || isNaN(v)) return '—';
    var r = Math.round(v * 1000) / 1000;
    if (unit === '년') return String(r);            /* 연도는 자릿수 구분 없이 */
    if (Number.isInteger(r)) return r.toLocaleString('ko-KR');
    return r.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  }

  function normalizeAll(list) {
    return list.map(function (q) {
      var opts = q.opts.map(function (o) {
        var v = (o.f != null) ? safeCalc(o.f) : o.v;
        return { t: o.t, v: v, u: o.u || '', n: o.n || '' };
      });
      return {
        id: q.id, lv: q.lv, cat: q.cat, subs: q.subs || [], pack: q.pack || '', unit: q.unit || '',
        q: q.q, tip: q.tip || '', opts: opts
      };
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function cloneRound(q, shuffleFn) {
    var opts = q.opts.slice();
    if (shuffleFn) {
      for (var i = opts.length - 1; i > 0; i--) {
        var j = Math.floor(shuffleFn() * (i + 1));
        var t = opts[i]; opts[i] = opts[j]; opts[j] = t;
      }
    }
    return { id: q.id, lv: q.lv, cat: q.cat, subs: q.subs, pack: q.pack, gen: !!q.gen, unit: q.unit || '', q: q.q, tip: q.tip, opts: opts };
  }

  function answerIndex(q) {
    var best = 0;
    for (var i = 1; i < q.opts.length; i++) if (q.opts[i].v > q.opts[best].v) best = i;
    return best;
  }

  function unitSuffix(u) { return u ? (u === '년' ? u : ' ' + u) : ''; }

  function tierFor(pct) {
    for (var i = 0; i < TIERS.length; i++) if (pct >= TIERS[i].min) return TIERS[i];
    return TIERS[3];
  }

  function todayKey() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function todayLabel() {
    var d = new Date();
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + days[d.getDay()] + ')';
  }

  function store(key, val) {
    try {
      if (val === undefined) { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* 저장 불가 환경 무시 */ }
    return null;
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  var toastTimer = null;
  function toast(msg) {
    var box = document.getElementById('toast');
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 2400);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '복사했습니다'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사가 지원되지 않습니다'); }
      document.body.removeChild(ta);
    }
  }

  /* ── 데이터 ───────────────────────────────────────────── */
  var DATA = [];          /* questions.json (또는 폴백 번들) 로드 후 채워집니다 */
  var BASE_COUNT = 0;     /* 손으로 검산한 문제 수 */
  var genSeq = 0;

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* 수학·연산 문제 자동 출제 (값이 겹치지 않고 최댓값이 하나가 되도록 생성) */
  function genExpr(lv) {
    var a, b, c, d;
    if (lv === 1) {
      if (Math.random() < 0.5) { a = randInt(12, 89); b = randInt(12, 89); return { t: a + ' + ' + b, e: a + '+' + b }; }
      a = randInt(60, 199); b = randInt(11, a - 10); return { t: a + ' − ' + b, e: a + '-' + b };
    }
    var k = randInt(0, 3);
    if (k === 0) { a = randInt(12, 29); b = randInt(3, 9); return { t: a + ' × ' + b, e: a + '*' + b }; }
    if (k === 1) {
      b = randInt(3, 9); c = randInt(12, 30); d = randInt(2, 9);
      return { t: (b * c) + ' ÷ ' + b + ' × ' + d, e: '(' + (b * c) + '/' + b + ')*' + d };
    }
    if (k === 2) {
      a = randInt(4, 19); b = randInt(4, 19); c = randInt(2, 9);
      return { t: '(' + a + ' + ' + b + ') × ' + c, e: '(' + a + '+' + b + ')*' + c };
    }
    a = randInt(12, 29); b = randInt(3, 9); c = randInt(10, 60);
    return { t: a + ' × ' + b + ' + ' + c, e: a + '*' + b + '+' + c };
  }

  function makeArithmetic(lv) {
    var opts = [], seen = {}, guard = 0;
    while (opts.length < 4 && guard++ < 120) {
      var g = genExpr(lv), v = safeCalc(g.e);
      if (!isFinite(v) || v <= 0 || seen[String(v)]) continue;
      seen[String(v)] = 1;
      opts.push({ t: g.t, v: v, u: '', n: g.t + ' = ' + fmt(v) });
    }
    if (opts.length < 4) return null;
    return {
      id: 'gen-' + lv + '-' + (++genSeq), lv: lv, cat: 'math', subs: [], pack: '', gen: true,
      q: '가장 큰 값은?',
      tip: '자동 출제 문제입니다. 네 보기 값이 서로 겹치지 않고 최댓값이 하나가 되도록 생성 단계에서 검사합니다.',
      opts: opts
    };
  }

  function addGenerated(perLevel) {
    [1, 2].forEach(function (lv) {
      for (var i = 0; i < perLevel; i++) {
        var q = makeArithmetic(lv);
        if (q) DATA.push(q);
      }
    });
  }

  /* questions.json 우선, 실패하면 data.js 폴백 */
  function readData(cb) {
    var done = false;
    function finish(list, meta) {
      if (done) return;
      done = true;
      DATA = normalizeAll(list || []);
      BASE_COUNT = DATA.length;
      addGenerated(12);
      cb(meta || {});
    }
    function fallback() {
      var f = window.BNW_DATA || [];
      var list = Array.isArray(f) ? f : (f.questions || []);
      finish(list, (f && f.meta) || {});
    }
    if (window.fetch && location.protocol !== 'file:') {
      fetch('assets/questions.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) { finish(j.questions || [], j.meta || {}); })
        .catch(fallback);
    } else {
      fallback();
    }
  }

  function poolFor(lv, cat) {
    return DATA.filter(function (q) {
      if (cat !== 'all') {
        var inCat = q.cat === cat || (q.cat === 'mix' && q.subs.indexOf(cat) !== -1);
        if (!inCat) return false;
      }
      if (lv > 0 && q.lv !== lv) return false;
      return true;
    });
  }

  function buildRound(lv, cat, n) {
    var strict = shuffle(poolFor(lv, cat));
    var picked = strict.slice(0, n);
    if (picked.length < n) {
      var extra = shuffle(poolFor(0, cat).filter(function (q) {
        return picked.every(function (p) { return p.id !== q.id; });
      }));
      picked = picked.concat(extra.slice(0, n - picked.length));
    }
    if (picked.length < n) {
      var rest = shuffle(DATA.filter(function (q) {
        return !q.pack && picked.every(function (p) { return p.id !== q.id; });
      }));
      picked = picked.concat(rest.slice(0, n - picked.length));
    }
    return shuffle(picked).map(function (q) { return cloneRound(q, Math.random); });
  }

  function buildDaily() {
    /* 날짜 시드로 오늘의 문제 고정 */
    var seedStr = todayKey();
    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 2147483647;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    function pick(arr, k) {
      var a = arr.slice(), out = [];
      while (out.length < k && a.length) {
        var j = Math.floor(rnd() * a.length);
        out.push(a.splice(j, 1)[0]);
      }
      return out;
    }
    var base = DATA.filter(function (q) { return !q.pack && !q.gen; });
    var plan = [[1, 4], [2, 3], [3, 2], [4, 1]];
    var qs = [];
    plan.forEach(function (p) {
      var lvPool = base.filter(function (q) { return q.lv === p[0] && qs.every(function (s) { return s.id !== q.id; }); });
      qs = qs.concat(pick(lvPool, p[1]));
    });
    return qs.map(function (q) { return cloneRound(q, rnd); });
  }

  /* ── 퀴즈 엔진 ─────────────────────────────────────────── */
  function Quiz(cfg) {
    this.host = cfg.host;
    this.qs = cfg.questions;
    this.mode = cfg.mode;              /* daily | world | brand | time */
    this.instant = !!cfg.instant;
    this.onEnd = cfg.onEnd;
    this.metaLabel = cfg.metaLabel || '';
    this.index = 0;
    this.correct = 0;
    this.answers = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.locked = false;
    this.timer = null;
  }

  Quiz.prototype.start = function () {
    this.index = 0; this.correct = 0; this.answers = []; this.combo = 0; this.maxCombo = 0; this.score = 0;
    this.render();
  };

  Quiz.prototype.render = function () {
    var self = this;
    var q = this.qs[this.index];
    var total = this.qs.length;
    var pct = Math.round((this.index / total) * 100);

    var optsHtml = q.opts.map(function (o, i) {
      var unit = o.u ? '<small>' + o.u + '</small>' : '';
      return '<button type="button" class="opt" data-i="' + i + '">' +
        '<span class="opt-key">' + (i + 1) + '</span>' +
        '<span class="opt-body"><span class="opt-label">' + esc(o.t) + '</span>' +
        '<span class="opt-note">' + esc(o.n) + '</span></span>' +
        '<span class="opt-val">' + fmt(o.v, o.u) + unit + '</span>' +
        '</button>';
    }).join('');

    var catLabel = CATS[q.cat] || '';
    var lvLabel = 'Lv.' + q.lv + ' ' + LVS[q.lv];

    var headHtml = this.instant ? '' : (
      '<div class="game-bar">' +
        '<div class="game-meta"><span class="gb-mode">' + esc(this.metaLabel) + '</span>' +
          '<span class="gb-lv">' + lvLabel + '</span><span class="gb-lv">' + catLabel + '</span>' +
          (q.gen ? '<span class="gb-lv gen">자동 출제</span>' : '') + '</div>' +
        '<div class="game-score">정답 <b>' + this.correct + '</b>/' + total + '</div>' +
      '</div>' +
      '<div class="progress"><span style="width:' + pct + '%"></span></div>'
    );

    var footHtml = this.instant
      ? '<div class="q-foot"><p class="q-hint">정답을 고르면 바로 다음 문제로 넘어갑니다. 키보드 1~' + q.opts.length + '도 됩니다.</p></div>'
      : '<div class="q-tip" data-tip hidden><p class="q-tip-head">오타쿠 해설</p><p class="q-tip-body">' + esc(q.tip) + '</p></div>' +
        '<div class="q-foot">' +
          '<p class="q-hint" data-hint>보기를 고르면 실제 환산값과 해설이 열립니다. 키보드 1~' + q.opts.length + '도 됩니다.</p>' +
          '<button type="button" class="btn btn-primary" data-next hidden>다음 문제 →</button>' +
        '</div>';

    this.host.innerHTML =
      '<div class="game">' + headHtml +
        '<div class="q-card">' +
          '<div class="q-top"><p class="q-count">Q' + (this.index + 1) +
            (this.instant ? '' : ' <span>/ ' + total + '</span>') + '</p>' +
            '<span class="q-cat">' + catLabel + '</span></div>' +
          '<h2 class="q-text">' + esc(q.q) + '</h2>' +
          '<div class="opts" data-opts>' + optsHtml + '</div>' +
          footHtml +
        '</div>' +
      '</div>';

    this.locked = false;
    var optsEl = this.host.querySelector('[data-opts]');
    optsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.opt');
      if (!btn) return;
      self.select(parseInt(btn.dataset.i, 10));
    });
    var next = this.host.querySelector('[data-next]');
    if (next) next.addEventListener('click', function () { self.next(); });

    /* 키보드 1~4 */
    if (this._key) document.removeEventListener('keydown', this._key);
    this._key = function (e) {
      if (!document.body.contains(self.host)) return;
      if (self.host.offsetParent === null) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (self.locked) {
        if (e.key === 'Enter' || e.key === ' ') {
          var nb = self.host.querySelector('[data-next]');
          if (nb && !nb.hidden) { e.preventDefault(); nb.click(); }
        }
        return;
      }
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.opts.length) { e.preventDefault(); self.select(n - 1); }
    };
    document.addEventListener('keydown', this._key);
  };

  Quiz.prototype.select = function (i) {
    if (this.locked) return;
    this.locked = true;
    var q = this.qs[this.index];
    var ans = answerIndex(q);
    var ok = i === ans;
    var opts = this.host.querySelectorAll('.opt');

    /* 시간 모드: 즉시 피드백 후 자동 진행 */
    if (this.instant) {
      opts.forEach(function (b) { b.classList.add('is-muted'); });
      opts[i].classList.remove('is-muted');
      opts[i].classList.add(ok ? 'is-right' : 'is-wrong');
      if (!ok) { opts[ans].classList.remove('is-muted'); opts[ans].classList.add('is-right'); }

      if (ok) {
        this.correct++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += 100 + Math.min(this.combo, 10) * 25;
        flash('good');
        if (this.combo >= 3) comboPop(this.combo);
      } else {
        this.combo = 0;
        flash('bad');
      }
      this.answers.push({ id: q.id, ok: ok });
      var self = this;
      setTimeout(function () {
        if (self.stopped) return;
        self.next();
      }, 560);
      return;
    }

    /* 기본 모드: 전 보기 공개 */
    opts.forEach(function (b) { b.classList.add('is-muted'); });
    opts[i].classList.remove('is-muted');
    opts[ans].classList.remove('is-muted');
    opts[ans].classList.add('is-right');
    if (!ok) opts[i].classList.add('is-wrong');
    opts.forEach(function (b) { b.classList.remove('is-muted'); });

    var wrap = this.host.querySelector('[data-opts]');
    wrap.classList.add('is-open');

    if (ok) this.correct++;
    this.answers.push({ id: q.id, ok: ok });

    var tip = this.host.querySelector('[data-tip]');
    tip.hidden = false;
    var hint = this.host.querySelector('[data-hint]');
    hint.innerHTML = ok
      ? '정답입니다. 최댓값은 <b>' + fmt(q.opts[ans].v, q.opts[ans].u || q.unit) + unitSuffix(q.opts[ans].u || q.unit) + '</b>.'
      : '아쉽습니다. 정답은 <b>' + esc(q.opts[ans].t) + '</b> = ' + fmt(q.opts[ans].v, q.opts[ans].u || q.unit) + unitSuffix(q.opts[ans].u || q.unit) + '.';

    var next = this.host.querySelector('[data-next]');
    next.hidden = false;
    next.textContent = (this.index === this.qs.length - 1) ? '결과 보기 →' : '다음 문제 →';
    next.focus({ preventScroll: true });
    if (window.innerWidth < 860) {
      setTimeout(function () { next.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 90);
    }

    var scoreEl = this.host.querySelector('.game-score');
    scoreEl.innerHTML = '정답 <b>' + this.correct + '</b>/' + this.qs.length;
    var bar = this.host.querySelector('.progress > span');
    if (bar) bar.style.width = Math.round(((this.index + 1) / this.qs.length) * 100) + '%';
  };

  Quiz.prototype.next = function () {
    this.index++;
    if (this.instant) {
      if (this.index >= this.qs.length) this.index = 0;   /* 시간 모드는 문제를 계속 순환 */
      this.render();
      return;
    }
    if (this.index >= this.qs.length) {
      if (this.onEnd) this.onEnd(this.stats());
      return;
    }
    this.render();
    var card = this.host.querySelector('.q-card');
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  Quiz.prototype.stats = function () {
    var total = this.qs.length;
    var answered = this.answers.length;
    var base = this.instant ? Math.max(answered, 1) : total;
    var pct = Math.round((this.correct / base) * 100);
    return {
      correct: this.correct, total: this.instant ? answered : total, pct: pct,
      answers: this.answers.slice(), score: this.score, maxCombo: this.maxCombo
    };
  };

  Quiz.prototype.stop = function () { this.stopped = true; };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function flash(kind) {
    var f = document.createElement('div');
    f.className = 'ta-flash on-' + (kind === 'good' ? 'good' : 'bad');
    document.body.appendChild(f);
    setTimeout(function () { f.classList.remove('on-good', 'on-bad'); }, 160);
    setTimeout(function () { f.remove(); }, 260);
  }

  function comboPop(n) {
    var p = document.createElement('div');
    p.className = 'combo-pop';
    p.textContent = n + ' COMBO';
    document.body.appendChild(p);
    setTimeout(function () { p.classList.add('go'); }, 10);
    setTimeout(function () { p.remove(); }, 800);
  }

  /* ── 오늘의 큰 수 ─────────────────────────────────────── */
  var Daily = {
    host: null,
    quiz: null,
    enter: function () {
      this.host = document.getElementById('daily-stage');
      if (this.host.dataset.state === 'game') return;
      this.intro();
    },
    intro: function () {
      var self = this;
      var key = 'bnw.daily.' + todayKey();
      var prev = store(key);
      var prevHtml = prev
        ? '<p class="prev-result">오늘 기록 <b>' + prev.correct + '/' + prev.total + '</b> · 정답률 <b>' + prev.pct + '%</b> · ' + prev.tier + ' <span>— 다시 도전할 수 있습니다.</span></p>'
        : '';
      this.host.dataset.state = 'intro';
      this.host.innerHTML =
        '<div class="start-card">' +
          '<div class="start-top"><span class="start-date">' + todayKey() + ' · ' + todayLabel() + '</span>' +
            '<span class="start-badge">매일 자정 갱신</span></div>' +
          '<h2>오늘의 10문제</h2>' +
          '<p>입문 4문제 → 중수 3문제 → 고수 2문제 → 오타쿠 1문제. 뒤로 갈수록 단위와 분야가 섞입니다.</p>' +
          '<ul class="start-steps">' +
            '<li><b>STEP 1</b><span>보기 중 가장 큰 값 하나를 고릅니다.</span></li>' +
            '<li><b>STEP 2</b><span>고르는 순간 전 보기의 환산값과 해설이 열립니다.</span></li>' +
            '<li><b>STEP 3</b><span>정답률로 덕후 티어가 정해지고 결과를 복사할 수 있습니다.</span></li>' +
          '</ul>' + prevHtml +
          '<div class="start-foot">' +
            '<button type="button" class="btn btn-primary btn-lg" id="daily-start">10문제 시작</button>' +
            '<p class="start-note">검증 문제 ' + BASE_COUNT + '개 + 연산 자동 출제 · 로그인 없음 · 기록은 이 브라우저에만 저장</p>' +
          '</div>' +
        '</div>';
      this.host.querySelector('#daily-start').addEventListener('click', function () { self.play(); });
    },
    play: function () {
      var self = this;
      this.host.dataset.state = 'game';
      this.host.innerHTML = '';
      this.quiz = new Quiz({
        host: this.host, questions: buildDaily(), mode: 'daily', metaLabel: '오늘의 큰 수',
        onEnd: function (st) { self.finish(st); }
      });
      this.quiz.start();
    },
    finish: function (st) {
      var tier = tierFor(st.pct);
      store('bnw.daily.' + todayKey(), { correct: st.correct, total: st.total, pct: st.pct, tier: tier.name, at: Date.now() });
      var share = '빅넘버월드 · 오늘의 큰 수 (' + todayKey() + ')\n정답 ' + st.correct + '/' + st.total +
        ' · 정답률 ' + st.pct + '% · ' + tier.emoji + ' ' + tier.name + '\nFind the Big Number! ' + SHARE_URL;
      this.host.innerHTML =
        '<div class="result">' +
          '<div class="result-badge">' + tier.emoji + '</div>' +
          '<p class="result-tier">오늘의 티어</p>' +
          '<p class="result-tier-name">' + tier.name + '</p>' +
          '<p class="result-score">' + st.correct + '<span>/' + st.total + '</span></p>' +
          '<dl class="result-stats">' +
            '<div><dt>정답률</dt><dd>' + st.pct + '%</dd></div>' +
            '<div><dt>정답</dt><dd>' + st.correct + '문제</dd></div>' +
            '<div><dt>오답</dt><dd>' + (st.total - st.correct) + '문제</dd></div>' +
          '</dl>' +
          '<p class="result-msg">' + tier.msg + '</p>' +
          '<div class="result-actions">' +
            '<button type="button" class="btn btn-primary" id="res-copy">결과 복사</button>' +
            '<button type="button" class="btn btn-ghost" id="res-again">한 번 더</button>' +
            '<a class="btn btn-ghost" href="#world">덕후 월드</a>' +
          '</div>' +
        '</div>';
      document.getElementById('res-copy').addEventListener('click', function () { copyText(share, '결과를 복사했습니다'); });
      document.getElementById('res-again').addEventListener('click', function () { Daily.play(); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── 덕후 월드 ────────────────────────────────────────── */
  var World = {
    lv: 0, cat: 'all', quiz: null,
    init: function () {
      var self = this;
      document.getElementById('lv-picker').addEventListener('click', function (e) {
        var b = e.target.closest('[data-lv]');
        if (!b) return;
        self.lv = parseInt(b.dataset.lv, 10);
        self.sync();
      });
      document.getElementById('cat-picker').addEventListener('click', function (e) {
        var b = e.target.closest('[data-cat]');
        if (!b) return;
        self.cat = b.dataset.cat;
        self.sync();
      });
      document.getElementById('world-start-btn').addEventListener('click', function () { self.play(); });
      this.sync();
    },
    preset: function (lv) {
      this.lv = lv;
      this.sync();
      location.hash = '#world';
      var setup = document.querySelector('.world-setup');
      if (setup) setTimeout(function () { setup.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 120);
    },
    sync: function () {
      var self = this;
      document.querySelectorAll('#lv-picker .chip').forEach(function (b) {
        b.classList.toggle('is-on', parseInt(b.dataset.lv, 10) === self.lv);
      });
      document.querySelectorAll('#cat-picker .chip').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.cat === self.cat);
      });
      var n = poolFor(this.lv, this.cat).length;
      var packTotal = poolFor(0, this.cat).length;
      var round = Math.min(10, packTotal);
      var lvText = this.lv ? ('Lv.' + this.lv + ' ' + LVS[this.lv]) : '전체 난이도';
      var catText = this.cat === 'all' ? '전체 믹스' : CATS[this.cat];
      var info = lvText + ' · ' + catText + ' — <b>' + n + '</b>문제 풀 · <b>' + round + '</b>문제 진행';
      if (this.lv && n < 10) info += ' (같은 팩의 다른 난이도로 보충)';
      document.getElementById('pool-info').innerHTML = info;
    },
    play: function () {
      var self = this;
      var stage = document.getElementById('world-stage');
      var qs = buildRound(this.lv, this.cat, 10);
      var label = (this.cat === 'all' ? '전체 믹스' : CATS[this.cat]);
      stage.innerHTML = '';
      this.quiz = new Quiz({
        host: stage, questions: qs, mode: 'world', metaLabel: label,
        onEnd: function (st) { self.finish(st, label); }
      });
      this.quiz.start();
      stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    finish: function (st, label) {
      var tier = tierFor(st.pct);
      var share = '빅넘버월드 · 덕후 월드 (' + label + ')\n정답 ' + st.correct + '/' + st.total +
        ' · ' + tier.emoji + ' ' + tier.name + '\nFind the Big Number! ' + SHARE_URL;
      document.getElementById('world-stage').innerHTML =
        '<div class="result">' +
          '<div class="result-badge">' + tier.emoji + '</div>' +
          '<p class="result-tier">' + esc(label) + ' 결과</p>' +
          '<p class="result-tier-name">' + tier.name + '</p>' +
          '<p class="result-score">' + st.correct + '<span>/' + st.total + '</span></p>' +
          '<dl class="result-stats">' +
            '<div><dt>정답률</dt><dd>' + st.pct + '%</dd></div>' +
            '<div><dt>정답</dt><dd>' + st.correct + '문제</dd></div>' +
            '<div><dt>오답</dt><dd>' + (st.total - st.correct) + '문제</dd></div>' +
          '</dl>' +
          '<p class="result-msg">' + tier.msg + '</p>' +
          '<div class="result-actions">' +
            '<button type="button" class="btn btn-primary" id="w-copy">결과 복사</button>' +
            '<button type="button" class="btn btn-ghost" id="w-again">같은 조건 한 판 더</button>' +
            '<a class="btn btn-ghost" href="#time">타임어택 도전</a>' +
          '</div>' +
        '</div>';
      document.getElementById('w-copy').addEventListener('click', function () { copyText(share, '결과를 복사했습니다'); });
      document.getElementById('w-again').addEventListener('click', function () { World.play(); });
    }
  };

  /* ── 60초 타임어택 ────────────────────────────────────── */
  var Time = {
    host: null, quiz: null, left: 60, tick: null, running: false,
    enter: function () {
      this.host = document.getElementById('time-stage');
      if (this.running) return;
      this.intro();
    },
    intro: function () {
      var self = this;
      var best = store('bnw.time.best');
      var bestHtml = best
        ? '<p class="prev-result">최고 기록 <b>' + best.score + '점</b> · 정답 <b>' + best.correct + '개</b> · 최대 콤보 <b>' + best.combo + '</b></p>'
        : '<p class="prev-result">아직 기록이 없습니다. 첫 판이 곧 최고 기록입니다.</p>';
      this.host.innerHTML =
        '<div class="start-card">' +
          '<div class="start-top"><span class="start-date">60 SECONDS · TIME ATTACK</span>' +
            '<span class="start-badge">기록은 이 브라우저에 저장</span></div>' +
          '<h2>60초, 콤보로 점수를 쌓아라</h2>' +
          '<p>정답 100점 + 콤보 보너스(콤보당 25점, 최대 250점). 틀리면 콤보가 0으로 돌아갑니다.</p>' +
          '<ul class="start-steps">' +
            '<li><b>01</b><span>보기를 고르면 바로 정답이 표시됩니다.</span></li>' +
            '<li><b>02</b><span>3콤보부터 화면에 콤보가 뜹니다.</span></li>' +
            '<li><b>03</b><span>60초가 끝나면 점수와 최고 기록이 나옵니다.</span></li>' +
          '</ul>' + bestHtml +
          '<div class="start-foot">' +
            '<button type="button" class="btn btn-primary btn-lg" id="time-start">시작하기</button>' +
            '<p class="start-note">전 난이도 문제가 섞여 나옵니다.</p>' +
          '</div>' +
        '</div>';
      this.host.querySelector('#time-start').addEventListener('click', function () { self.play(); });
    },
    play: function () {
      var self = this;
      this.running = true;
      this.left = 60;
      this.host.innerHTML = '';
      var qs = shuffle(DATA.filter(function (q) { return !q.pack; })).map(function (q) { return cloneRound(q, Math.random); });
      this.quiz = new Quiz({
        host: this.host, questions: qs, mode: 'time', instant: true, metaLabel: '60초 타임어택',
        onEnd: function () { /* 시간 종료로만 끝남 */ }
      });
      this.host.innerHTML =
        '<div class="ta-head">' +
          '<div class="ta-timer"><span class="ta-time">60<small>s</small></span><div class="ta-bar"><span></span></div>' +
            '<div class="game-meta" style="margin-top:8px"><span class="gb-mode">60초 타임어택</span><span class="gb-lv">전 난이도</span></div>' +
          '</div>' +
          '<dl class="ta-side">' +
            '<div class="ta-stat"><dt>점수</dt><dd id="ta-score">0</dd></div>' +
            '<div class="ta-stat combo"><dt>콤보</dt><dd id="ta-combo">0</dd></div>' +
          '</dl>' +
        '</div>' +
        '<div id="ta-body"></div>';
      this.quiz.host = document.getElementById('ta-body');
      this.quiz.render();

      var scoreEl = document.getElementById('ta-score');
      var comboEl = document.getElementById('ta-combo');
      var bar = this.host.querySelector('.ta-bar > span');
      var timeEl = this.host.querySelector('.ta-time');

      this.tick = setInterval(function () {
        self.left -= 0.1;
        if (self.left <= 0) { self.end(); return; }
        timeEl.innerHTML = Math.ceil(self.left) + '<small>s</small>';
        bar.style.width = Math.max(0, (self.left / 60) * 100) + '%';
        scoreEl.textContent = self.quiz.score;
        comboEl.textContent = self.quiz.combo;
      }, 100);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    end: function () {
      if (!this.running) return;
      this.running = false;
      clearInterval(this.tick);
      if (this.quiz) this.quiz.stop();
      var st = this.quiz.stats();
      var best = store('bnw.time.best');
      var isBest = !best || st.score > best.score;
      if (isBest) store('bnw.time.best', { score: st.score, correct: st.correct, combo: st.maxCombo, at: Date.now() });
      var tier = tierFor(st.total ? Math.round((st.correct / Math.max(st.total, 1)) * 100) : 0);
      var share = '빅넘버월드 · 60초 타임어택\n' + st.score + '점 · 정답 ' + st.correct + '개 · 최대 콤보 ' + st.maxCombo +
        (isBest ? ' (신기록)' : '') + '\nFind the Big Number! ' + SHARE_URL;
      this.host.innerHTML =
        '<div class="result">' +
          '<div class="result-badge">' + (isBest ? '🏆' : '⏱') + '</div>' +
          '<p class="result-tier">' + (isBest ? 'NEW RECORD' : 'TIME UP') + '</p>' +
          '<p class="result-tier-name">' + st.score + '점</p>' +
          '<dl class="result-stats">' +
            '<div><dt>정답</dt><dd>' + st.correct + '개</dd></div>' +
            '<div><dt>최대 콤보</dt><dd>' + st.maxCombo + '</dd></div>' +
            '<div><dt>최고 기록</dt><dd>' + (isBest ? st.score : best.score) + '점</dd></div>' +
          '</dl>' +
          '<p class="result-msg">' + (isBest ? '최고 기록을 갈아치웠습니다. ' : '') + tier.msg + '</p>' +
          '<div class="result-actions">' +
            '<button type="button" class="btn btn-primary" id="t-again">다시 도전</button>' +
            '<button type="button" class="btn btn-ghost" id="t-copy">결과 복사</button>' +
            '<a class="btn btn-ghost" href="#daily">오늘의 큰 수</a>' +
          '</div>' +
        '</div>';
      document.getElementById('t-again').addEventListener('click', function () { Time.play(); });
      document.getElementById('t-copy').addEventListener('click', function () { copyText(share, '결과를 복사했습니다'); });
    }
  };

  /* ── 고객사 표준 출제 시트 ────────────────────────────── */
  var Sheet = {
    rows: [], host: null, stage: null, quiz: null,
    SAMPLES: [
      {
        q: '공복혈당이 가장 높은 것은? (샘플 예시)',
        o: ['92', '100', '126', '140'], u: 'mg/dL',
        tip: '공복혈당은 100mg/dL 미만을 정상, 126mg/dL 이상을 당뇨병 진단 기준으로 봅니다. 일반 건강 상식으로 만든 샘플입니다.'
      },
      {
        q: '성인 하루 권장 수면 시간의 상한은? (샘플 예시)',
        o: ['6', '7', '8', '9'], u: '시간',
        tip: '성인 권장 수면 시간은 7~9시간으로 안내됩니다. 상한은 9시간입니다.'
      },
      {
        q: '월 보험료 12만 원을 1년 내면 모두 얼마? (샘플 예시)',
        o: ['1200000', '1320000', '1440000', '1560000'], u: '원',
        tip: '120,000 × 12 = 1,440,000원. 보험료·적립금 계산은 브랜드 팩의 단골 소재입니다.'
      },
      {
        q: '1년은 모두 몇 시간? (샘플 예시)',
        o: ['7200', '8064', '8760', '9000'], u: '시간',
        tip: '365일 × 24시간 = 8,760시간. 8,064는 336일 기준이라 함정 보기로 쓰기 좋습니다.'
      },
      {
        q: '하루 1만 보를 30일 걸으면? (샘플 예시)',
        o: ['200000', '250000', '300000', '365000'], u: '보',
        tip: '10,000 × 30 = 300,000보. 걷기 챌린지·건강 이벤트 팩에 그대로 쓸 수 있는 형태입니다.'
      }
    ],
    init: function () {
      var self = this;
      this.host = document.getElementById('sheet-rows');
      this.stage = document.getElementById('sheet-stage');
      this.rows = [this.blank(), this.blank()];
      this.render();
      document.getElementById('sheet-preset').addEventListener('click', function () { self.preset(); });
      document.getElementById('sheet-play').addEventListener('click', function () { self.play(); });
      document.getElementById('sheet-add').addEventListener('click', function () { self.addRow(); });
      document.getElementById('sheet-clear').addEventListener('click', function () { self.clear(); });
    },
    blank: function () { return { q: '', o: ['', '', '', ''], u: '', tip: '' }; },
    render: function () {
      var self = this;
      this.host.innerHTML = this.rows.map(function (r, i) {
        var cells = r.o.map(function (v, k) {
          return '<label>보기 ' + (k + 1) +
            '<input type="number" step="any" inputmode="decimal" data-i="' + i + '" data-f="' + k + '" value="' + esc(v) + '" placeholder="숫자"></label>';
        }).join('');
        return '<div class="sheet-row" data-row="' + i + '">' +
          '<div class="sr-top">' +
            '<span class="sr-no">Q' + (i + 1) + '</span>' +
            '<input class="sr-q" type="text" data-i="' + i + '" data-f="q" value="' + esc(r.q) + '" placeholder="문제 문장 (예: 공복혈당이 가장 높은 것은?)">' +
            '<button type="button" class="sr-del" data-del="' + i + '" aria-label="Q' + (i + 1) + ' 삭제">✕</button>' +
          '</div>' +
          '<div class="sr-fields">' + cells +
            '<label>단위<input type="text" data-i="' + i + '" data-f="u" value="' + esc(r.u) + '" placeholder="mg/dL"></label>' +
          '</div>' +
          '<textarea class="sr-tip" rows="3" data-i="' + i + '" data-f="tip" placeholder="해설 — 정답 공개 때 함께 보입니다 (선택)">' + esc(r.tip) + '</textarea>' +
        '</div>';
      }).join('');

      this.host.querySelectorAll('input, textarea').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var row = self.rows[+inp.dataset.i];
          if (!row) return;
          var f = inp.dataset.f;
          if (f === 'q' || f === 'u' || f === 'tip') row[f] = inp.value;
          else row.o[+f] = inp.value;
        });
      });
      this.host.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (self.rows.length <= 1) { self.rows[0] = self.blank(); }
          else self.rows.splice(+b.dataset.del, 1);
          self.render();
        });
      });
      this.count();
      return this;
    },
    count: function () {
      var n = this.rows.filter(function (r) { return r.q.trim(); }).length;
      var el = document.getElementById('sheet-count');
      if (el) el.textContent = n + '문제';
    },
    addRow: function () {
      if (this.rows.length >= 8) { toast('데모에서는 8문제까지 넣을 수 있습니다'); return; }
      this.rows.push(this.blank());
      this.render();
      var last = this.host.querySelector('[data-row="' + (this.rows.length - 1) + '"] .sr-q');
      if (last) last.focus();
    },
    clear: function () {
      this.rows = [this.blank(), this.blank()];
      this.render();
      if (this.stage) this.stage.innerHTML = '';
      toast('시트를 비웠습니다');
    },
    preset: function () {
      var self = this;
      this.rows = this.SAMPLES.map(function (x) {
        return { q: x.q, o: x.o.slice(), u: x.u, tip: x.tip };
      });
      this.render();
      if (this.stage) this.stage.innerHTML = '';
      toast('DB생명 샘플 5문제를 불러왔습니다');
      var box = document.getElementById('sheet-builder');
      if (box) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    buildQuestions: function () {
      var bad = [];
      var qs = [];
      this.rows.forEach(function (r, i) {
        var q = r.q.trim();
        var vals = r.o.map(function (x) { return String(x).replace(/,/g, '').trim(); })
          .map(function (x) { return x === '' ? NaN : Number(x); })
          .filter(function (n) { return isFinite(n); });
        var rowEl = document.querySelector('.sheet-row[data-row="' + i + '"]');
        if (rowEl) rowEl.classList.remove('is-bad');
        if (!q && vals.length === 0) return;                 /* 빈 줄은 건너뜀 */
        if (!q || vals.length < 2) { bad.push(i); return; }
        if (new Set(vals).size !== vals.length) { bad.push(i); return; }
        var unit = r.u.trim();
        var opts = vals.map(function (v) {
          return { t: fmt(v) + (unit ? ' ' + unit : ''), v: v, u: '', n: '' };
        });
        qs.push({
          id: 'sheet-' + (i + 1), lv: 2, cat: 'brand', subs: [], pack: '', sheet: true, unit: unit,
          q: q, tip: r.tip.trim() || '고객사 출제 시트에서 입력한 문항입니다.', opts: opts
        });
      });
      bad.forEach(function (i) {
        var rowEl = document.querySelector('.sheet-row[data-row="' + i + '"]');
        if (rowEl) rowEl.classList.add('is-bad');
      });
      return { questions: qs, bad: bad };
    },
    play: function () {
      var self = this;
      var built = this.buildQuestions();
      if (!built.questions.length) {
        toast(built.bad.length ? '표시된 줄의 문제 문장과 숫자 보기를 확인해 주세요' : '문제를 한 줄 이상 채워 주세요');
        return;
      }
      if (built.bad.length) {
        toast('빨간 줄을 확인해 주세요 (문제 문장 · 숫자 2개 이상 · 값 중복 금지)');
      }
      this.stage.innerHTML = '';
      this.quiz = new Quiz({
        host: this.stage, questions: built.questions, mode: 'sheet', metaLabel: '출제 시트 미리보기',
        onEnd: function (st) { self.finish(st); }
      });
      this.quiz.start();
      this.stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    finish: function (st) {
      this.stage.innerHTML =
        '<div class="result">' +
          '<div class="result-badge">📋</div>' +
          '<p class="result-tier">시트 미리보기 완료</p>' +
          '<p class="result-tier-name">' + st.total + '문제 중 ' + st.correct + '정답</p>' +
          '<dl class="result-stats">' +
            '<div><dt>정답률</dt><dd>' + st.pct + '%</dd></div>' +
            '<div><dt>문항 수</dt><dd>' + st.total + '</dd></div>' +
            '<div><dt>형식</dt><dd>표준 시트</dd></div>' +
          '</dl>' +
          '<p class="result-msg">이 시트 그대로 브랜드 전용 팩으로 제작합니다. 문제는 고객사가 계속 추가·교체할 수 있습니다.</p>' +
          '<div class="result-actions">' +
            '<button type="button" class="btn btn-primary" data-open-contact data-contact-type="브랜드 스폰서드 팩">이 팩으로 제휴 문의</button>' +
            '<button type="button" class="btn btn-ghost" id="sheet-again">다시 플레이</button>' +
            '<a class="btn btn-ghost" href="#daily">오늘의 큰 수</a>' +
          '</div>' +
        '</div>';
      document.getElementById('sheet-again').addEventListener('click', function () { Sheet.play(); });
    }
  };

  /* ── 브랜드 제휴관 (신라면 데모) ──────────────────────── */
  var Brand = {
    host: null,
    init: function () {
      var self = this;
      this.host = document.getElementById('brand-stage');
      document.getElementById('brand-start-btn').addEventListener('click', function () { self.play(); });
    },
    play: function () {
      var self = this;
      var qs = shuffle(DATA.filter(function (q) { return q.pack === 'shinramen'; })).slice(0, 5)
        .map(function (q) { return cloneRound(q, Math.random); });
      if (!qs.length) { toast('데모 팩을 불러오지 못했습니다'); return; }
      this.host.innerHTML = '';
      this.quiz = new Quiz({
        host: this.host, questions: qs, mode: 'brand', metaLabel: '신라면 스페셜 팩',
        onEnd: function (st) { self.coupon(st); }
      });
      this.quiz.start();
      this.host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    coupon: function (st) {
      var pct = st.pct;
      var grade = pct >= 80 ? 'GOLD' : (pct >= 60 ? 'SILVER' : 'BASIC');
      var code = 'BNW-SR-' + grade + '-' + String(Math.floor(Math.random() * 9000) + 1000);
      var share = '빅넘버월드 신라면 스페셜 팩 · ' + st.correct + '/' + st.total + ' 정답\n가상 쿠폰 ' + code;
      this.host.innerHTML =
        '<div class="coupon">' +
          '<p class="kicker">SPONSORED PACK · DEMO RESULT</p>' +
          '<h2>' + st.correct + '/' + st.total + ' 정답 · ' + grade + ' 쿠폰</h2>' +
          '<p>정답률 ' + pct + '%로 ' + grade + ' 등급 쿠폰을 받았습니다. 실제 서비스에서는 이 화면이 브랜드 랜딩 페이지로 연결됩니다.</p>' +
          '<div class="coupon-code">' + code + '<small>가상 쿠폰 코드 · 실제 사용 불가</small></div>' +
          '<div class="coupon-actions">' +
            '<button type="button" class="btn btn-light" id="c-copy">쿠폰 코드 복사</button>' +
            '<button type="button" class="btn btn-outline-light" id="c-again">다시 플레이</button>' +
            '<button type="button" class="btn btn-outline-light" data-open-contact data-contact-type="브랜드 스폰서드 팩">이 팩으로 제휴 문의</button>' +
          '</div>' +
          '<p class="coupon-note">※ 가상 제휴 데모입니다. 실제 쿠폰 발급·결제·제휴는 이루어지지 않습니다.</p>' +
        '</div>';
      document.getElementById('c-copy').addEventListener('click', function () { copyText(code, '쿠폰 코드를 복사했습니다'); });
      document.getElementById('c-again').addEventListener('click', function () { Brand.play(); });
      this.host.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  /* ── 제휴 문의 모달 ───────────────────────────────────── */
  var Contact = {
    modal: null, lastFocus: null, seq: 0,
    init: function () {
      var self = this;
      this.modal = document.getElementById('contact-modal');
      document.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-open-contact]');
        if (opener) {
          e.preventDefault();
          self.open(opener.dataset.contactType || '');
          return;
        }
        if (e.target.closest('[data-close-contact]')) { self.close(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !self.modal.hidden) self.close();
      });
      document.getElementById('contact-form').addEventListener('submit', function (e) {
        e.preventDefault();
        self.submit(e.target);
      });
    },
    open: function (type) {
      var self = this;
      this.lastFocus = document.activeElement;
      var form = document.getElementById('contact-form');
      var done = document.getElementById('cm-done');
      var wrap = document.getElementById('cm-form-wrap');
      form.reset();
      form.hidden = false;
      wrap.hidden = false;
      done.hidden = true;
      document.getElementById('form-error').hidden = true;
      form.querySelectorAll('.is-bad').forEach(function (f) { f.classList.remove('is-bad'); });
      var sel = document.getElementById('contact-type');
      if (type) {
        Array.prototype.forEach.call(sel.options, function (o) {
          if (o.text === type) sel.value = o.text;
        });
      }
      this.modal.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(function () {
        var first = form.querySelector('input[name="company"]');
        if (first) first.focus();
      }, 40);
    },
    close: function () {
      this.modal.hidden = true;
      document.body.style.overflow = '';
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    },
    submit: function (form) {
      var err = document.getElementById('form-error');
      var bad = [];
      var required = ['company', 'name', 'phone'];
      required.forEach(function (n) {
        var f = form.elements[n];
        if (!f.value.trim()) { f.classList.add('is-bad'); bad.push(f); }
        else f.classList.remove('is-bad');
      });
      var agree = form.elements['agree'];
      if (!agree.checked) bad.push(agree);
      var phone = form.elements['phone'];
      if (phone.value.trim() && !/^[0-9+\-()\s]{7,20}$/.test(phone.value.trim())) {
        phone.classList.add('is-bad'); bad.push(phone);
      }
      var email = form.elements['email'];
      if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add('is-bad'); bad.push(email);
      }
      if (bad.length) {
        err.textContent = agree.checked ? '필수 항목을 확인해 주세요. (연락처 형식 포함)' : '데모 접수 동의에 체크해 주세요.';
        err.hidden = false;
        if (bad[0].focus) bad[0].focus();
        return;
      }
      err.hidden = true;
      var data = {
        company: form.elements['company'].value.trim(),
        name: form.elements['name'].value.trim(),
        phone: form.elements['phone'].value.trim(),
        email: form.elements['email'].value.trim(),
        type: form.elements['type'].value,
        message: form.elements['message'].value.trim(),
        at: Date.now()
      };
      var no = 'BNW-' + todayKey().replace(/-/g, '').slice(2) + '-' + String(Math.floor(Math.random() * 900) + 100);
      data.no = no;
      var list = store('bnw.inquiries') || [];
      list.push(data);
      store('bnw.inquiries', list);

      document.getElementById('cm-form-wrap').hidden = true;
      var done = document.getElementById('cm-done');
      done.hidden = false;
      document.getElementById('done-no').textContent = '접수번호 ' + no;
      document.getElementById('done-desc').innerHTML =
        '<b>' + esc(data.company) + '</b> · ' + esc(data.type) + '<br>' +
        '담당자 ' + esc(data.name) + ' · ' + esc(data.phone) +
        '<br>프로토타입에서는 실제 발송 대신 이 브라우저에만 접수 내역을 남깁니다.';
    }
  };

  /* ── 라우터 ───────────────────────────────────────────── */
  var VIEWS = ['home', 'daily', 'world', 'time', 'brand'];
  function route() {
    var id = (location.hash || '#home').replace('#', '');
    if (VIEWS.indexOf(id) === -1) id = 'home';
    VIEWS.forEach(function (v) {
      var sec = document.getElementById('view-' + v);
      if (sec) sec.hidden = (v !== id);
    });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('is-active', a.dataset.nav === id);
      if (a.dataset.nav === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (id === 'daily') Daily.enter();
    if (id === 'time') Time.enter();
    if (id === 'world') World.sync();
    if (Contact.modal && !Contact.modal.hidden) Contact.close();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ── 초기화 ───────────────────────────────────────────── */
  function init() {
    document.querySelectorAll('[data-count="questions"]').forEach(function (n) {
      n.textContent = BASE_COUNT;
    });
    document.querySelectorAll('[data-play-lv]').forEach(function (b) {
      b.addEventListener('click', function () { World.preset(parseInt(b.dataset.playLv, 10)); });
    });
    World.init();
    Brand.init();
    Sheet.init();
    Contact.init();
    window.addEventListener('hashchange', route);
    route();
  }

  function boot() { readData(function () { init(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
