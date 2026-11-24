/* ══════════════════════════════════════════════════════════
   빅넘버월드 V2 · modes.js — 게임 규칙 플러그인 + 러너
   ──────────────────────────────────────────────────────────
   새 규칙을 붙이는 방법:
     BNW.modes.register({
       id, name, emoji, rules[],
       init(state, runner),
       renderQuestion(ctx),      // ctx = {host, q, state, runner, index, total}
       evaluate(ctx, selection), // → {ok, points, ...}
       getShareSummary(stats),
       prepare?(q), accepts?(q), hud?(state), progress?(state), reveal?(ctx,res)
     });
   app.js 는 모드 id 만 알고, 규칙은 전부 여기서 등록됩니다.
   ══════════════════════════════════════════════════════════ */
(function (BNW) {
  'use strict';

  var util = BNW.util;
  var REQUIRED = ['init', 'renderQuestion', 'evaluate', 'getShareSummary'];
  var registry = new Map();

  var modes = {
    register: function (def) {
      REQUIRED.forEach(function (k) {
        if (typeof def[k] !== 'function') throw new Error('모드 ' + def.id + '에 ' + k + '()가 없습니다');
      });
      if (registry.has(def.id)) throw new Error('이미 등록된 모드: ' + def.id);
      registry.set(def.id, def);
      return def;
    },
    get: function (id) { return registry.get(id); },
    has: function (id) { return registry.has(id); },
    list: function () { return Array.from(registry.values()); }
  };
  BNW.modes = modes;

  /* ── 공통 렌더 도우미 ──────────────────────────────────── */
  function unitOf(q, o) { return o.u || q.unit || ''; }

  function valueText(q, o) { return util.fmt(o.v, unitOf(q, o)); }

  function isRedundantNote(q, o) {
    if (!o.n) return true;
    var digits = function (s) { return String(s).replace(/[^\d.-]/g, ''); };
    var noteDigits = digits(o.n);
    var valueDigits = digits(valueText(q, o));
    var unitDigits = digits(unitOf(q, o));
    return noteDigits === valueDigits + unitDigits || noteDigits === valueDigits + unitDigits.replace(/-/g, '');
  }

  function optionHtml(q, o, i) {
    var unit = unitOf(q, o);
    var note = isRedundantNote(q, o) ? '' : '<span class="opt-note">' + util.esc(o.n) + '</span>';
    var domain = o.d ? '<span class="opt-domain">' + util.esc(o.d) + '</span>' : '';
    var live = q.lens === 'numeral';
    return '<button type="button" class="opt" data-i="' + i + '">' +
      '<span class="opt-key">' + (i + 1) + '</span>' +
      '<span class="opt-body">' + domain +
        '<span class="opt-label">' + util.esc(o.t) + '</span>' + note +
      '</span>' +
      '<span class="opt-val' + (live ? ' is-live' : '') + '">' + util.esc(valueText(q, o)) +
        (unit ? '<small>' + util.esc(unit) + '</small>' : '') + '</span>' +
      '<span class="opt-bar" data-bar></span>' +
    '</button>';
  }

  function optionsBlock(q) {
    return '<div class="opts' + (q.opts.length === 3 ? ' opts-3' : '') + '" data-opts>' +
      q.opts.map(function (o, i) { return optionHtml(q, o, i); }).join('') + '</div>';
  }

  function revealOptions(host, q, ansIdx, picked) {
    var wrap = host.querySelector('.opts');
    if (wrap) wrap.classList.add('is-open');
    var vals = q.opts.map(function (o) { return o.v; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    util.qsa('.opt', host).forEach(function (btn, i) {
      var t = max === min ? 1 : (q.opts[i].v - min) / (max - min);
      var bar = btn.querySelector('[data-bar]');
      if (bar) bar.style.width = (10 + 90 * util.clamp(t, 0, 1)).toFixed(1) + '%';
      btn.classList.add('is-dim');
    });
    var opts = util.qsa('.opt', host);
    if (opts[ansIdx]) {
      opts[ansIdx].classList.remove('is-dim');
      opts[ansIdx].classList.add('is-right');
    }
    if (picked != null && picked !== ansIdx && opts[picked]) {
      opts[picked].classList.remove('is-dim');
      opts[picked].classList.add('is-wrong');
    }
  }

  function insightHtml(q) {
    return '<div class="q-tip">' +
      '<span class="tip-ico" aria-hidden="true">💡</span>' +
      '<div><p class="tip-head">한 줄 직관 해설</p>' +
      '<p class="tip-body">' + util.esc(q.insight) + '</p></div>' +
    '</div>';
  }

  function answerText(q, idx) {
    var o = q.opts[idx];
    var unit = unitOf(q, o);
    return '<b>' + util.esc(o.t) + '</b> = ' + util.esc(valueText(q, o)) +
      (unit ? util.esc(unit) : '');
  }

  function bindNext(host, fn, label) {
    var btn = host.querySelector('[data-next]');
    if (btn) {
      btn.textContent = label || '다음 문제 →';
      btn.addEventListener('click', fn);
      btn.focus({ preventScroll: true });
      if (window.innerWidth < 860) {
        setTimeout(function () { btn.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 140);
      }
    }
  }

  /* ══════════════════════════════════════════════════════
     러너 — 모드가 바뀌어도 공통으로 유지되는 진행 루프
     ══════════════════════════════════════════════════════ */
  function Runner(cfg) {
    this.host = cfg.host;
    this.questions = cfg.questions || [];
    this.mode = cfg.mode;
    this.label = cfg.label || cfg.mode.name;
    this.meta = cfg.meta || {};
    this.onEnd = cfg.onEnd;
    this.lives = cfg.lives || 0;
    this.total = this.questions.length;
    this.state = {
      questions: this.questions,
      index: 0, correct: 0, wrong: 0, score: 0, combo: 0, maxCombo: 0,
      hearts: this.lives || 0, maxHearts: this.lives || 0,
      answers: [], startedAt: Date.now(), finished: false, reason: ''
    };
    this.mode.init(this.state, this);
    this._onKey = this._handleKey.bind(this);
  }

  Runner.prototype.start = function () {
    this.host.innerHTML = '';
    this.root = util.el(
      '<div class="game">' +
        '<div class="game-bar"><div class="game-meta" data-meta></div><div class="game-hud" data-hud></div></div>' +
        '<div class="progress" data-progress><span></span></div>' +
        '<div class="q-card" data-card>' +
          '<div class="q-top"><p class="q-count" data-count></p><span class="q-cat" data-cat></span></div>' +
          '<h2 class="q-text" data-q></h2>' +
          '<p class="q-sub" data-sub hidden></p>' +
          '<div data-body></div>' +
        '</div>' +
      '</div>'
    );
    this.host.appendChild(this.root);
    this.metaEl = this.root.querySelector('[data-meta]');
    this.hudEl = this.root.querySelector('[data-hud]');
    this.progEl = this.root.querySelector('[data-progress] > span');
    this.cardEl = this.root.querySelector('[data-card]');
    this.countEl = this.root.querySelector('[data-count]');
    this.catEl = this.root.querySelector('[data-cat]');
    this.qEl = this.root.querySelector('[data-q]');
    this.subEl = this.root.querySelector('[data-sub]');
    this.bodyEl = this.root.querySelector('[data-body]');
    document.addEventListener('keydown', this._onKey);
    this.paintChrome();
    this.next();
  };

  Runner.prototype.packLabel = function (q) {
    var names = this.meta.packNames || {};
    var emo = this.meta.packEmoji || {};
    return (emo[q.pack] ? emo[q.pack] + ' ' : '') + (names[q.pack] || q.pack);
  };

  Runner.prototype.paintChrome = function () {
    var s = this.state, q = this.q;
    if (!q) return;
    this.metaEl.innerHTML =
      '<span class="gb-mode">' + util.esc(this.label) + '</span>' +
      '<span class="gb-lv">Lv.' + q.lv + ' ' + (BNW.LVS[q.lv] || '') + '</span>' +
      '<span class="gb-lv">' + util.esc(this.packLabel(q)) + '</span>' +
      (q.lens === 'numeral' ? '<span class="gb-lv gen">숫자만 비교</span>' : '');

    this.hudEl.innerHTML = this.mode.hud
      ? this.mode.hud(s, this)
      : '<span class="game-score">정답 <b>' + s.correct + '</b>/' + this.total + '</span>';

    var pct = this.mode.progress ? this.mode.progress(s, this) : (this.total ? (s.index / this.total) * 100 : 0);
    if (this.progEl) this.progEl.style.width = util.clamp(pct, 0, 100) + '%';

    if (this.q === q) {
      this.countEl.innerHTML = 'Q' + (s.index + 1) + (this.total > 1 ? ' <span>/ ' + this.total + '</span>' : '');
      this.catEl.textContent = this.mode.name;
      this.qEl.textContent = q.q;
      if (q.subText) {
        this.subEl.hidden = false;
        this.subEl.textContent = q.subText;
      } else if (q.lens === 'numeral') {
        this.subEl.hidden = false;
        this.subEl.textContent = '단위가 달라도 표시된 숫자 크기로만 겨룹니다.';
      } else if (q.unit) {
        this.subEl.hidden = false;
        this.subEl.textContent = '보기 단위는 모두 “' + q.unit + '”입니다. 값은 정답 공개 때 열립니다.';
      } else {
        this.subEl.hidden = true;
        this.subEl.textContent = '';
      }
    }
  };

  Runner.prototype.next = function () {
    clearTimeout(this._auto);
    if (this.state.finished) return;
    if (this.state.index >= this.questions.length) return this.finish('done');
    this.locked = false;
    this.keyPick = null;
    this.q = this.mode.prepare
      ? this.mode.prepare(this.questions[this.state.index], this.state)
      : this.questions[this.state.index];
    this.paintChrome();
    this.bodyEl.innerHTML = '';
    var self = this;
    this.mode.renderQuestion({
      host: this.bodyEl,
      q: this.q,
      state: this.state,
      runner: this,
      index: this.state.index,
      total: this.total,
      finish: function (reason) { self.finish(reason); }
    });
    if (window.innerWidth < 860 && this.state.index > 0) {
      this.cardEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  Runner.prototype.submit = function (selection) {
    if (this.locked || this.state.finished) return;
    this.locked = true;
    var s = this.state;
    var ctx = {
      q: this.q, state: s, runner: this, host: this.bodyEl,
      selection: selection, index: s.index, total: this.total
    };
    var res = this.mode.evaluate(ctx, selection) || {};
    res = res || {};
    if (res.ok) { s.correct++; s.combo++; }
    else { s.wrong++; s.combo = 0; }
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.score += Math.max(0, Math.round(res.points || 0));
    s.answers.push({
      id: this.q.id, pack: this.q.pack, lv: this.q.lv, lens: this.q.lens,
      ok: !!res.ok, points: Math.round(res.points || 0)
    });
    this.paintChrome();
    this.mode.reveal(ctx, res);
    BNW.bus.emit('answer', { q: this.q, res: res, state: s });
  };

  Runner.prototype.advance = function () {
    if (this.state.finished) return;
    this.state.index++;
    this.next();
  };

  Runner.prototype.abort = function () {
    this.state.finished = true;
    clearTimeout(this._auto);
    document.removeEventListener('keydown', this._onKey);
  };

  Runner.prototype.scheduleAdvance = function (ms) {
    var self = this;
    clearTimeout(this._auto);
    this._auto = setTimeout(function () { self.advance(); }, ms);
  };

  Runner.prototype.finish = function (reason) {
    if (this.state.finished) return;
    var s = this.state;
    s.finished = true;
    s.reason = reason || 'done';
    clearTimeout(this._auto);
    document.removeEventListener('keydown', this._onKey);
    var answered = s.answers.length;
    var stats = {
      modeId: this.mode.id,
      modeName: this.mode.name,
      label: this.label,
      meta: this.meta,
      correct: s.correct,
      wrong: s.wrong,
      total: answered,
      pct: answered ? Math.round((s.correct / answered) * 100) : 0,
      score: s.score,
      maxCombo: s.maxCombo,
      hearts: s.hearts,
      maxHearts: s.maxHearts,
      answers: s.answers.slice(),
      duration: Math.round((Date.now() - s.startedAt) / 1000),
      reason: s.reason,
      summary: this.mode.getShareSummary(s, this.meta)
    };
    if (this.onEnd) this.onEnd(stats);
  };

  Runner.prototype._handleKey = function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (this.locked) {
      if ((e.key === 'Enter' || e.key === ' ') && this.bodyEl) {
        var nb = this.bodyEl.querySelector('[data-next]');
        if (nb && !nb.hidden) { e.preventDefault(); nb.click(); }
      }
      return;
    }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && typeof this.keyPick === 'function') {
      e.preventDefault();
      this.keyPick(n - 1);
    }
  };
  BNW.Runner = Runner;

  /* ══════════════════════════════════════════════════════
     모드 1 · pick_max — 가장 큰 숫자 하나
     ══════════════════════════════════════════════════════ */
  modes.register({
    id: 'pick_max',
    name: '빅넘버 픽',
    emoji: '🎯',
    kind: 'quiz',
    blurb: '가장 큰 숫자 하나를 고릅니다.',
    rules: ['보기 중 가장 큰 값 하나를 선택', '정답 100점', '틀려도 해설로 바로 복습'],
    accepts: function (q) { return q.opts && q.opts.length >= 3; },
    init: function () {},
    renderQuestion: function (ctx) {
      var q = ctx.q, runner = ctx.runner;
      ctx.host.innerHTML = optionsBlock(q) +
        '<div class="q-foot"><p class="q-hint">보기를 고르면 실제 환산값과 해설이 열립니다. 키보드 1~' + q.opts.length + '도 됩니다.</p></div>';
      util.qsa('.opt', ctx.host).forEach(function (btn) {
        btn.addEventListener('click', function () { runner.submit(Number(btn.dataset.i)); });
      });
      runner.keyPick = function (i) { runner.submit(i); };
    },
    evaluate: function (ctx, picked) {
      var q = ctx.q, ans = 0;
      for (var i = 1; i < q.opts.length; i++) if (q.opts[i].v > q.opts[ans].v) ans = i;
      return { ok: picked === ans, points: picked === ans ? 100 : 0, ans: ans };
    },
    reveal: function (ctx, res) {
      var q = ctx.q, host = ctx.host, runner = ctx.runner;
      revealOptions(host, q, res.ans, ctx.selection);
      var last = ctx.index >= ctx.total - 1;
      var hint = res.ok
        ? '정답입니다. 최댓값은 ' + answerText(q, res.ans) + '.'
        : '아쉽습니다. 정답은 ' + answerText(q, res.ans) + '.';
      host.insertAdjacentHTML('beforeend', insightHtml(q) +
        '<div class="q-foot"><p class="q-hint">' + hint + '</p>' +
        '<button type="button" class="btn btn-primary" data-next>' + (last ? '결과 보기 →' : '다음 문제 →') + '</button></div>');
      bindNext(host, function () { runner.advance(); });
      if (res.ok) BNW.bus.emit('flash', 'good'); else BNW.bus.emit('flash', 'bad');
    },
    getShareSummary: function (stats) {
      return '정답 ' + stats.correct + '/' + stats.total + ' · ' + stats.pct + '%';
    }
  });

  /* ══════════════════════════════════════════════════════
     모드 2 · rank_3 — 3장을 큰 순서대로
     ══════════════════════════════════════════════════════ */
  modes.register({
    id: 'rank_3',
    name: '3장 줄세우기',
    emoji: '🃏',
    kind: 'rank',
    blurb: '3장의 카드를 큰 순서대로 탭합니다.',
    rules: ['카드 3장을 큰 순서로 탭', '자리마다 50점 · 올 클리어 150점', '다시 고르기 가능'],
    accepts: function (q) { return q.opts && q.opts.length >= 3; },
    prepare: function (q) {
      var picked = q.opts.map(function (o, i) { return i; });
      if (picked.length > 3) picked = util.shuffle(picked).slice(0, 3);
      var cards = util.shuffle(picked).map(function (i) { return Object.assign({ _i: i }, q.opts[i]); });
      return Object.assign({}, q, {
        rankCards: cards,
        q: '세 장의 카드를 큰 값 순서대로 줄 세우세요.',
        subText: '카드에 적힌 숫자를 비교해 1등부터 차례로 탭하세요.'
      });
    },
    init: function (state) {
      state.order = [];
    },
    renderQuestion: function (ctx) {
      var q = ctx.q, runner = ctx.runner, state = ctx.state;
      state.order = [];
      var cards = q.rankCards.map(function (o, k) {
        var unit = unitOf(q, o);
        var isExpr = !!o.f;
        var main = isExpr
          ? util.esc(o.t)
          : util.esc(util.fmt(o.v, unit)) + (unit ? '<small>' + util.esc(unit) + '</small>' : '');
        return '<button type="button" class="rank-card" data-k="' + k + '" aria-pressed="false">' +
          '<span class="rank-pos">카드 ' + (k + 1) + '</span>' +
          '<span class="rank-num">' + main + '</span>' +
          (isExpr ? '' : '<span class="rank-label">' + util.esc(o.t) + '</span>') +
          (isExpr ? '<span class="rank-value" data-value hidden>' + util.esc(valueText(q, o)) + (unit ? ' ' + util.esc(unit) : '') + '</span>' : '') +
          (o.d ? '<span class="rank-domain">' + util.esc(o.d) + '</span>' : '') +
          '<span class="rank-order" data-order hidden></span>' +
        '</button>';
      }).join('');
      ctx.host.innerHTML =
        '<div class="rank-cards" data-cards>' + cards + '</div>' +
        '<div class="rank-actions">' +
          '<button type="button" class="btn btn-line btn-sm" data-reset>다시 고르기</button>' +
          '<button type="button" class="btn btn-primary" data-check disabled>정답 확인 (0/3)</button>' +
        '</div>';

      var cardsEl = util.qsa('.rank-card', ctx.host);
      var checkBtn = ctx.host.querySelector('[data-check]');

      function sync() {
        cardsEl.forEach(function (el) {
          var k = Number(el.dataset.k);
          var pos = state.order.indexOf(k);
          el.classList.toggle('is-picked', pos > -1);
          el.setAttribute('aria-pressed', pos > -1 ? 'true' : 'false');
          var badge = el.querySelector('[data-order]');
          if (pos > -1) { badge.hidden = false; badge.textContent = String(pos + 1); }
          else badge.hidden = true;
        });
        checkBtn.disabled = state.order.length < 3;
        checkBtn.textContent = state.order.length < 3 ? '정답 확인 (' + state.order.length + '/3)' : '정답 확인';
      }

      cardsEl.forEach(function (el) {
        el.addEventListener('click', function () {
          if (state.finished || runner.locked) return;
          var k = Number(el.dataset.k);
          if (state.order.indexOf(k) > -1) return;
          if (state.order.length >= 3) return;
          state.order.push(k);
          sync();
          if (state.order.length === 3) checkBtn.focus({ preventScroll: true });
        });
      });
      ctx.host.querySelector('[data-reset]').addEventListener('click', function () {
        if (runner.locked) return;
        state.order = [];
        sync();
      });
      checkBtn.addEventListener('click', function () {
        if (state.order.length < 3 || runner.locked) return;
        runner.submit(state.order.slice());
      });
      runner.keyPick = function (i) {
        if (i < 3) cardsEl[i].click();
      };
      sync();
    },
    evaluate: function (ctx, selection) {
      var q = ctx.q;
      var correct = q.rankCards.map(function (o, k) { return k; })
        .sort(function (a, b) { return q.rankCards[b].v - q.rankCards[a].v; });
      var matches = 0;
      (selection || []).forEach(function (k, pos) { if (correct[pos] === k) matches++; });
      return { ok: matches === 3, points: matches * 50, correct: correct, matches: matches };
    },
    reveal: function (ctx, res) {
      var q = ctx.q, host = ctx.host, runner = ctx.runner;
      util.qsa('.rank-card', host).forEach(function (el) {
        var k = Number(el.dataset.k);
        var pos = res.correct.indexOf(k);
        var userPos = ctx.selection.indexOf(k);
        el.classList.add(userPos === pos ? 'is-right' : 'is-wrong');
        var val = el.querySelector('[data-value]');
        if (val) val.hidden = false;
        if (pos > -1) {
          var badge = el.querySelector('[data-order]');
          badge.hidden = false;
          badge.textContent = String(pos + 1);
        }
      });
      var order = res.correct.map(function (k, i) {
        var o = q.rankCards[k];
        return (i + 1) + ') ' + util.esc(o.t) + ' <b>' + util.esc(util.fmt(o.v, unitOf(q, o))) + '</b>';
      }).join(' · ');
      var pick = ctx.selection.map(function (k, i) {
        return (i + 1) + ') ' + util.esc(q.rankCards[k].t);
      }).join(' · ');
      var last = ctx.index >= ctx.total - 1;
      host.insertAdjacentHTML('beforeend',
        '<div class="answer-strip">정답 순서 <span>' + order + '</span></div>' +
        '<div class="answer-strip">내 순서 <span>' + pick + '</span> · 자리 ' + res.matches + '/3</div>' +
        insightHtml(q) +
        '<div class="q-foot"><p class="q-hint">' +
          (res.ok ? '완벽합니다. 세 자리 모두 맞혔습니다.' : '자리 ' + res.matches + '/3 정답. ' + (res.matches * 50) + '점을 얻었습니다.') +
        '</p><button type="button" class="btn btn-primary" data-next>' + (last ? '결과 보기 →' : '다음 라운드 →') + '</button></div>');
      bindNext(host, function () { runner.advance(); });
      if (res.ok) BNW.bus.emit('flash', 'good');
    },
    hud: function (state, runner) {
      return '<span class="game-score">라운드 <b>' + Math.min(state.index + 1, runner.total) + '</b>/' + runner.total +
        ' · 점수 <b>' + util.number(state.score) + '</b></span>';
    },
    getShareSummary: function (stats) {
      return '3장 랭킹 ' + stats.correct + '/' + stats.total + ' 라운드 · ' + util.number(stats.score) + '점';
    }
  });

  /* ══════════════════════════════════════════════════════
     모드 3 · survival_streak — 하트 3개 연승전
     ══════════════════════════════════════════════════════ */
  modes.register({
    id: 'survival_streak',
    name: '끝장 연승전',
    emoji: '🔥',
    kind: 'survival',
    blurb: '하트 3개로 버티는 콤보 배틀.',
    rules: ['틀리면 하트 1개 감소', '3콤보부터 x1.5', '5콤보부터 x2.0'],
    accepts: function (q) { return q.opts && q.opts.length >= 3; },
    init: function (state, runner) {
      state.hearts = state.maxHearts || 3;
      state.maxHearts = state.hearts;
    },
    renderQuestion: function (ctx) {
      var q = ctx.q, runner = ctx.runner;
      ctx.host.innerHTML = optionsBlock(q) +
        '<div class="q-foot"><p class="q-hint">틀리면 하트가 하나 사라집니다. 키보드 1~' + q.opts.length + '도 됩니다.</p></div>';
      util.qsa('.opt', ctx.host).forEach(function (btn) {
        btn.addEventListener('click', function () { runner.submit(Number(btn.dataset.i)); });
      });
      runner.keyPick = function (i) { runner.submit(i); };
    },
    evaluate: function (ctx, picked) {
      var q = ctx.q, state = ctx.state, ans = 0;
      for (var i = 1; i < q.opts.length; i++) if (q.opts[i].v > q.opts[ans].v) ans = i;
      var ok = picked === ans;
      var mult = state.combo >= 4 ? 2 : (state.combo >= 2 ? 1.5 : 1);
      if (!ok) state.hearts = Math.max(0, state.hearts - 1);
      return { ok: ok, points: ok ? Math.round(100 * mult) : 0, ans: ans, mult: mult };
    },
    reveal: function (ctx, res) {
      var q = ctx.q, host = ctx.host, runner = ctx.runner, state = ctx.state;
      revealOptions(host, q, res.ans, ctx.selection);
      var hint = res.ok
        ? (res.mult > 1 ? 'x' + res.mult.toFixed(1) + ' 콤보 · ' + Math.round(100 * res.mult) + '점' : '정답 · 100점')
        : '하트 -1. 정답은 ' + answerText(q, res.ans) + '.';
      host.insertAdjacentHTML('beforeend', insightHtml(q) +
        '<div class="q-foot"><p class="q-hint">' + hint + '</p>' +
        '<div class="auto-bar"><span class="' + (res.ok ? 'run' : 'run-long') + '"></span></div></div>');
      if (state.hearts <= 0) {
        setTimeout(function () { runner.finish('hearts'); }, res.ok ? 900 : 1700);
      } else {
        runner.scheduleAdvance(res.ok ? 1000 : 1800);
      }
      if (res.ok && state.maxCombo > 0) BNW.bus.emit('combo', state.combo);
      if (res.ok) BNW.bus.emit('flash', 'good'); else BNW.bus.emit('flash', 'bad');
    },
    hud: function (state) {
      var hearts = '';
      for (var i = 0; i < state.maxHearts; i++) {
        hearts += '<i class="' + (i < state.hearts ? '' : 'lost') + '" aria-hidden="true">♥</i>';
      }
      var mult = state.combo >= 4 ? 2 : (state.combo >= 2 ? 1.5 : 1);
      var cls = mult >= 2 ? 'hot' : (mult > 1 ? 'on' : '');
      return '<div class="surv-hud" style="width:100%">' +
        '<div class="hearts" role="img" aria-label="하트 ' + state.hearts + '/' + state.maxHearts + '">' + hearts + '</div>' +
        '<div class="surv-score"><span>점수</span><b>' + util.number(state.score) + '</b>' +
        '<span class="combo-chip ' + cls + '">x' + mult.toFixed(1) + '</span>' +
        '<span class="combo-chip">' + state.combo + ' 콤보</span></div>' +
      '</div>';
    },
    progress: function (state) { return (state.combo % 5) / 5 * 100; },
    getShareSummary: function (stats) {
      return stats.score + '점 · 최대 ' + stats.maxCombo + '콤보 · 하트 ' + stats.hearts + '/' + stats.maxHearts;
    }
  });

  /* 새 모드를 밖에서도 등록할 수 있게 노출 */
  BNW.registerMode = modes.register;
})(window.BNW);
