/* ══════════════════════════════════════════════════════════
   빅넘버월드 V2 · app.js — 뷰·라우팅·결과 카드·제휴관
   ══════════════════════════════════════════════════════════ */
(function (BNW) {
  'use strict';

  var util = BNW.util;
  var App = {
    repo: null, scores: null, leads: null, config: null,
    packs: [], packMap: {}, brands: [], all: [],
    worldPack: 'cross', worldLv: 0,
    rankPack: 'all', streakPack: 'all',
    sheetMode: 'pick_max',
    brand: null, brandId: null, brandMode: 'pick_max',
    runner: null
  };
  window.BNWApp = App;

  var VIEWS = ['home', 'cross', 'world', 'rank', 'streak', 'brand', 'brandplay'];
  var TYPE_DEFS = {
    cross: { emoji: '🌀', name: '경계를 넘는 자', msg: '분야가 달라도 숫자로 꿰뚫습니다. 이 게임이 가장 재미있는 사람입니다.' },
    cosmos: { emoji: '🌌', name: '우주 스케일 마스터', msg: '자릿수만 봐도 감이 옵니다. 8,849와 8,760을 구분하는 눈이 이미 있습니다.' },
    intuition: { emoji: '🧠', name: '착시 돌파자', msg: '직관이 먼저 틀리는 자리에서 멈출 줄 압니다. 복리와 2의 제곱이 손에 붙었네요.' },
    life: { emoji: '💸', name: '자본주의 계산기', msg: '최저임금부터 로또 조합까지, 생활 숫자를 돈으로 환산해 읽습니다.' },
    sports: { emoji: '⚡', name: '기록 수집가', msg: '마라톤·볼링·바둑판. 공식 기록이 곧 놀이가 되는 사람입니다.' },
    history: { emoji: '🏛', name: '연대기 수호자', msg: '연도가 곧 숫자. 기원전 음수 계산까지 흔들리지 않습니다.' },
    culture: { emoji: '🎬', name: '기록 감별사', msg: '개봉 연도와 오스카 수를 기억하는 사람. 영화관에서 유용합니다.' },
    math: { emoji: '🧮', name: '암산 엔진', msg: '괄호와 제곱이 섞여도 순서가 보입니다. 계산은 이미 습관입니다.' }
  };
  var FALLBACK_TYPES = [
    { min: 90, emoji: '🌀', name: '경계를 넘는 자', msg: '분야가 달라도 숫자로 꿰뚫습니다. 이 게임이 가장 재미있는 사람입니다.' },
    { min: 75, emoji: '🌌', name: '우주 스케일 마스터', msg: '큰 자릿수에 흔들리지 않습니다. 8,849와 8,760을 구분하는 눈입니다.' },
    { min: 60, emoji: '🧠', name: '착시 돌파자', msg: '직관이 먼저 틀리는 자리에서 멈출 줄 압니다.' },
    { min: 40, emoji: '💸', name: '자본주의 계산기', msg: '숫자를 돈과 시간으로 환산해 읽는 감각이 있습니다.' },
    { min: 0, emoji: '🎲', name: '감으로 찍는 모험가', msg: '여기서 시작이 반. 해설만 다시 읽어도 다음 판은 달라집니다.' }
  ];

  /* ── 공통 ─────────────────────────────────────────────── */
  function flash(kind) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90;box-shadow:inset 0 0 0 4px ' +
      (kind === 'good' ? 'rgba(0,180,146,.5)' : 'rgba(255,77,109,.5)') + ';opacity:.9;transition:opacity .35s;';
    document.body.appendChild(d);
    setTimeout(function () { d.style.opacity = '0'; }, 150);
    setTimeout(function () { d.remove(); }, 600);
  }

  function cloneQuestion(q, rnd) {
    var opts = util.shuffle(q.opts);
    return Object.assign({}, q, { opts: opts });
  }

  function poolFor(packIds, lv) {
    var ids = packIds === 'all' ? App.packs.map(function (p) { return p.id; }) : packIds;
    var out = [];
    ids.forEach(function (id) {
      App.repo.packQuestions(id).forEach(function (q) { out.push(q); });
    });
    if (lv) out = out.filter(function (q) { return q.lv === lv; });
    return out;
  }

  function buildRound(pool, n, rnd) {
    var shuffled = util.shuffle(pool);
    var picked = shuffled.slice(0, Math.min(n, shuffled.length));
    return picked.map(function (q) { return cloneQuestion(q, rnd); });
  }

  function startGame(opts) {
    if (App.runner && App.runner.abort) App.runner.abort();
    var host = typeof opts.host === 'string' ? document.querySelector(opts.host) : opts.host;
    host.innerHTML = '';
    var mode = BNW.modes.get(opts.modeId);
    var runner = new BNW.Runner({
      host: host,
      questions: opts.questions,
      mode: mode,
      label: opts.label || mode.name,
      meta: opts.meta || { packNames: App.packNameMap(), packEmoji: App.packEmojiMap() },
      lives: opts.lives || 0,
      onEnd: opts.onEnd
    });
    App.runner = runner;
    runner.start();
    if (window.innerWidth < 900) {
      host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    return runner;
  }

  App.packNameMap = function () {
    var m = {};
    App.packs.forEach(function (p) { m[p.id] = p.name; });
    m.brand = '브랜드 팩';
    m.sheet = '출제 시트';
    return m;
  };
  App.packEmojiMap = function () {
    var m = {};
    App.packs.forEach(function (p) { m[p.id] = p.emoji; });
    m.brand = '🏷';
    m.sheet = '📋';
    return m;
  };

  /* ── 결과 유형 판정 ────────────────────────────────────── */
  function judgeType(stats) {
    var byPack = {};
    stats.answers.forEach(function (a) {
      byPack[a.pack] = byPack[a.pack] || { correct: 0, total: 0 };
      byPack[a.pack].total++;
      if (a.ok) byPack[a.pack].correct++;
    });
    var single = Object.keys(byPack).length === 1 ? Object.keys(byPack)[0] : null;
    if (single && single !== 'cross' && TYPE_DEFS[single] && stats.pct >= 60 && byPack[single].total >= 3) {
      return Object.assign({ key: single, tag: 'PACK TYPE' }, TYPE_DEFS[single]);
    }
    var best = null;
    Object.keys(byPack).forEach(function (pack) {
      if (!TYPE_DEFS[pack] || byPack[pack].total < 2) return;
      var acc = byPack[pack].correct / byPack[pack].total;
      if (acc >= 0.7 && (!best || acc > best.acc)) best = { pack: pack, acc: acc };
    });
    if (best && stats.pct >= 45) {
      return Object.assign({ key: best.pack, tag: 'PACK TYPE' }, TYPE_DEFS[best.pack]);
    }
    var t = FALLBACK_TYPES[FALLBACK_TYPES.length - 1];
    for (var i = 0; i < FALLBACK_TYPES.length; i++) {
      if (stats.pct >= FALLBACK_TYPES[i].min) { t = FALLBACK_TYPES[i]; break; }
    }
    return Object.assign({ tag: 'SCORE TYPE' }, t);
  }

  function packBreakdown(stats) {
    var map = {};
    stats.answers.forEach(function (a) {
      map[a.pack] = map[a.pack] || { correct: 0, total: 0 };
      map[a.pack].total++;
      if (a.ok) map[a.pack].correct++;
    });
    return Object.keys(map).map(function (id) {
      var p = App.packMap[id];
      return { id: id, emoji: p ? p.emoji : (id === 'brand' ? '🏷' : '📋'), name: p ? p.name : (id === 'brand' ? '브랜드 팩' : '출제 시트'), correct: map[id].correct, total: map[id].total };
    });
  }

  function shareText(stats, type, title) {
    var lines = [type.emoji + ' 빅넘버월드 V2 · ' + title, util.todayKey() + ' · ' + util.todayLabel()];
    lines.push('정답 ' + stats.correct + '/' + stats.total + ' · ' + stats.pct + '% · ' + type.name);
    var bd = packBreakdown(stats);
    if (bd.length > 1) {
      lines.push(bd.map(function (b) { return b.emoji + ' ' + b.name + ' ' + b.correct + '/' + b.total; }).join(' · '));
    } else if (bd.length === 1) {
      lines.push(bd[0].emoji + ' ' + bd[0].name + ' ' + bd[0].correct + '/' + bd[0].total);
    }
    if (stats.modeId === 'survival_streak') lines.push('🔥 ' + stats.score + '점 · 최대 ' + stats.maxCombo + '콤보');
    lines.push('Find the Big Number → ' + BNW.SHARE_URL);
    return lines.join('\n');
  }

  function renderResult(host, stats, cfg) {
    cfg = cfg || {};
    var type = judgeType(stats);
    var bd = packBreakdown(stats);
    var share = shareText(stats, type, cfg.title || stats.label);
    var statsRows = [
      ['정답률', stats.pct + '%'],
      ['정답', stats.correct + '/' + stats.total],
      ['점수', util.number(stats.score)]
    ];
    if (stats.modeId === 'survival_streak') {
      statsRows = [['점수', util.number(stats.score)], ['최대 콤보', stats.maxCombo + '연속'], ['남은 하트', stats.hearts + '/' + stats.maxHearts]];
    }
    host.innerHTML =
      '<div class="result">' +
        '<div class="result-badge" aria-hidden="true">' + type.emoji + '</div>' +
        '<p class="result-tier">' + (cfg.kicker || 'RESULT') + '</p>' +
        '<p class="result-tier-name">' + util.esc(type.name) + '</p>' +
        '<p class="result-score">' + stats.correct + '<span>/' + stats.total + '</span></p>' +
        '<dl class="result-stats">' + statsRows.map(function (r) {
          return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
        }).join('') + '</dl>' +
        '<div class="type-card">' +
          '<div class="tc-top"><span class="tc-emoji" aria-hidden="true">' + type.emoji + '</span>' +
            '<div><p class="tc-tag">숫자 직관 유형 · ' + type.tag + '</p>' +
            '<p class="tc-name">' + util.esc(type.name) + '</p></div></div>' +
          '<p>' + util.esc(type.msg) + '</p>' +
        '</div>' +
        (bd.length > 1 ? '<div class="result-grid">' + bd.map(function (b) {
          return '<div><span class="rg-emoji">' + b.emoji + '</span><span class="rg-name">' + util.esc(b.name) + '</span><span class="rg-val">' + b.correct + '/' + b.total + '</span></div>';
        }).join('') + '</div>' : '') +
        '<div class="result-actions">' +
          '<button type="button" class="btn btn-primary" data-res-copy>결과 카드 복사</button>' +
          '<button type="button" class="btn btn-ghost" data-res-again>' + (cfg.againLabel || '한 번 더') + '</button>' +
          (cfg.extraActions || '') +
        '</div>' +
        '<p class="result-note">결과는 단톡방에 붙여넣으면 그대로 표가 됩니다. 기록은 이 브라우저에만 저장됩니다.</p>' +
      '</div>';
    host.querySelector('[data-res-copy]').addEventListener('click', function () { util.copy(share, '결과 카드를 복사했습니다'); });
    host.querySelector('[data-res-again]').addEventListener('click', function () {
      if (cfg.onAgain) cfg.onAgain();
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── 홈 ───────────────────────────────────────────────── */
  App.updateCounts = function () {
    var total = App.all.length;
    util.qsa('[data-count="questions"]').forEach(function (el) { el.textContent = util.number(total); });
    util.qsa('[data-count="packs"]').forEach(function (el) { el.textContent = App.packs.length; });
    util.qsa('[data-count="modes"]').forEach(function (el) { el.textContent = BNW.modes.list().length; });
  };

  function packCard(p, opts) {
    opts = opts || {};
    var dots = '';
    for (var lv = 1; lv <= 4; lv++) {
      dots += '<i class="' + ((p.levels && p.levels[lv]) ? 'on' : '') + '"></i>';
    }
    return '<button type="button" class="pack-card' + (opts.on ? ' is-on' : '') + '"' +
      ' style="--pc:' + (p.color || '#4B3BFF') + ';--pcs:' + (p.soft || '#ECEAFF') + '"' +
      ' data-pack="' + p.id + '" aria-pressed="' + (opts.on ? 'true' : 'false') + '">' +
      '<span class="pack-card-head"><span class="pack-emoji" aria-hidden="true">' + (p.emoji || '🎲') + '</span>' +
        (p.badge ? '<span class="pack-badge">' + p.badge + '</span>' : '') + '</span>' +
      '<span class="pack-name">' + util.esc(p.name) + '</span>' +
      '<span class="pack-tag">' + util.esc(p.tagline || p.desc || '') + '</span>' +
      '<span class="pack-foot"><span class="pack-count">' + (p.count || 0) + '문제</span>' +
        '<span class="lv-dots" aria-hidden="true">' + dots + '</span></span>' +
    '</button>';
  }

  var ALL_PACK = { id: 'all', name: '전체 믹스', emoji: '🎲', tagline: '8개 팩을 한 판에', color: '#12142B', soft: '#E8E8F5', count: 0, levels: { 1: 1, 2: 1, 3: 1, 4: 1 }, badge: 'MIX' };

  App.renderHomePacks = function () {
    var host = document.getElementById('home-pack-grid');
    if (!host) return;
    host.innerHTML = App.packs.map(function (p) { return packCard(p); }).join('');
    util.qsa('.pack-card', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.worldPack = btn.dataset.pack;
        location.hash = '#world';
      });
    });
  };

  App.renderWorldPacks = function () {
    var host = document.getElementById('world-pack-grid');
    if (!host) return;
    ALL_PACK.count = App.all.length;
    host.innerHTML = packCard(ALL_PACK, { on: App.worldPack === 'all' }) +
      App.packs.map(function (p) { return packCard(p, { on: App.worldPack === p.id }); }).join('');
    util.qsa('.pack-card', host).forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.worldPack = btn.dataset.pack;
        App.renderWorldPacks();
        App.syncWorld();
      });
    });
  };

  var WORLD = {
    enter: function () {
      App.renderWorldPacks();
      WORLD.sync();
    },
    sync: function () {
      util.qsa('#lv-picker .chip').forEach(function (b) {
        b.classList.toggle('is-on', Number(b.dataset.lv) === App.worldLv);
      });
      var ids = App.worldPack === 'all' ? App.packs.map(function (p) { return p.id; }) : [App.worldPack];
      var pool = poolFor(ids, App.worldLv);
      var name = App.worldPack === 'all' ? '전체 믹스' : (App.packMap[App.worldPack] ? App.packMap[App.worldPack].name : '');
      var note = document.getElementById('pack-note');
      if (note) note.textContent = name + ' · ' + (App.worldLv ? 'Lv.' + App.worldLv + ' ' + BNW.LVS[App.worldLv] : '전체 난이도');
      var info = document.getElementById('pool-info');
      if (info) {
        var full = poolFor(ids, 0).length;
        info.innerHTML = '<b>' + pool.length + '</b>문제 풀 · <b>' + Math.min(10, full) + '</b>문제 진행' +
          (pool.length < 10 ? ' (다른 난이도로 보충)' : '');
      }
      var btn = document.getElementById('world-start-btn');
      if (btn) btn.disabled = pool.length === 0;
    },
    play: function () {
      var ids = App.worldPack === 'all' ? App.packs.map(function (p) { return p.id; }) : [App.worldPack];
      var pool = poolFor(ids, App.worldLv);
      var qs = buildRound(pool, 10);
      if (qs.length < 10) {
        var seen = {};
        qs.forEach(function (q) { seen[q.id] = 1; });
        var extra = poolFor(ids, 0).filter(function (q) { return !seen[q.id]; });
        qs = qs.concat(buildRound(extra, 10 - qs.length));
      }
      var name = App.worldPack === 'all' ? '전체 믹스' : App.packMap[App.worldPack].name;
      var label = name + ' · ' + (App.worldLv ? 'Lv.' + App.worldLv : '전체');
      var stage = document.getElementById('world-stage');
      startGame({
        host: stage, questions: qs, modeId: 'pick_max', label: label,
        onEnd: function (stats) {
          renderResult(stage, stats, {
            title: '덕후 월드 · ' + label, kicker: 'OTAKU WORLD',
            againLabel: '같은 조건 한 판 더',
            onAgain: function () { WORLD.play(); },
            extraActions: '<a class="btn btn-ghost" href="#rank">3장 줄세우기</a>'
          });
          App.scores.save('world', { pack: App.worldPack, lv: App.worldLv, correct: stats.correct, total: stats.total, pct: stats.pct, score: stats.score });
        }
      });
    }
  };
  App.syncWorld = WORLD.sync;

  /* ── 오늘의 크로스오버 ─────────────────────────────────── */
  var Cross = {
    enter: function () {
      var stage = document.getElementById('cross-stage');
      if (!stage) return;
      if (stage.dataset.state === 'game' || stage.dataset.state === 'result') return;
      this.intro();
    },
    questions: function () {
      var rnd = util.seeded('bnw2-cross-' + util.todayKey());
      var pool = poolFor(['cross'], 0);
      var plan = [[1, 2], [2, 3], [3, 3], [4, 2]];
      var out = [];
      plan.forEach(function (p) {
        var level = pool.filter(function (q) { return q.lv === p[0] && !out.some(function (o) { return o.id === q.id; }); });
        util.pickSeed(level, p[1], rnd).forEach(function (q) { out.push(q); });
      });
      if (out.length < 10) {
        util.pickSeed(pool.filter(function (q) { return !out.some(function (o) { return o.id === q.id; }); }), 10 - out.length, rnd)
          .forEach(function (q) { out.push(q); });
      }
      return util.pickSeed(out, Math.min(10, out.length), rnd).map(function (q) { return cloneQuestion(q); });
    },
    intro: function () {
      var stage = document.getElementById('cross-stage');
      var today = util.todayKey();
      var prev = (App.scores.list('daily') || []).filter(function (r) { return r.date === today; }).pop();
      stage.dataset.state = 'intro';
      stage.innerHTML =
        '<div class="start-card">' +
          '<div class="start-top"><span class="start-date">' + today + ' · ' + util.todayLabel() + '</span>' +
            '<span class="start-badge">매일 자정 갱신</span></div>' +
          '<h2>오늘의 크로스오버 10문제</h2>' +
          '<p>로또 조합 수, 에베레스트 높이, 광속, 1년의 초. 분야도 단위도 다르지만 <b>표시된 숫자 크기</b>로만 겨룹니다.</p>' +
          '<ul class="start-steps">' +
            '<li><b>STEP 1</b><span>보기 중 숫자가 가장 큰 것 하나를 고릅니다.</span></li>' +
            '<li><b>STEP 2</b><span>고르는 순간 전 보기의 실제 값과 한 줄 해설이 열립니다.</span></li>' +
            '<li><b>STEP 3</b><span>정답률로 숫자 직관 유형 카드가 나옵니다.</span></li>' +
          '</ul>' +
          (prev ? '<p class="prev-result">오늘 기록 <b>' + prev.correct + '/' + prev.total + '</b> · <b>' + prev.pct + '%</b> · ' + util.esc(prev.type || '') + '</p>' : '') +
          '<div class="start-foot">' +
            '<button type="button" class="btn btn-primary btn-lg" id="cross-start">10문제 시작</button>' +
            '<p class="start-note">검증된 크로스오버 문제 · 로그인 없음 · 기록은 이 브라우저에만</p>' +
          '</div>' +
        '</div>';
      document.getElementById('cross-start').addEventListener('click', function () { Cross.play(); });
    },
    play: function () {
      var stage = document.getElementById('cross-stage');
      stage.dataset.state = 'game';
      var qs = Cross.questions();
      startGame({
        host: stage, questions: qs, modeId: 'pick_max', label: '오늘의 크로스오버',
        onEnd: function (stats) {
          var type = judgeType(stats);
          App.scores.save('daily', {
            date: util.todayKey(), correct: stats.correct, total: stats.total, pct: stats.pct,
            score: stats.score, type: type.name, at: Date.now()
          });
          stage.dataset.state = 'result';
          renderResult(stage, stats, {
            title: '오늘의 크로스오버', kicker: 'DAILY CROSSOVER · ' + util.todayKey(),
            againLabel: '오늘 다시 도전',
            onAgain: function () { Cross.play(); },
            extraActions: '<a class="btn btn-ghost" href="#world">덕후 월드</a><a class="btn btn-ghost" href="#streak">연승전</a>'
          });
        }
      });
    }
  };

  /* ── 3장 줄세우기 ─────────────────────────────────────── */
  var Rank = {
    enter: function () {
      var seg = document.getElementById('rank-pack-picker');
      if (seg && !seg.dataset.built) {
        seg.insertAdjacentHTML('beforeend', App.packs.map(function (p) {
          return '<button type="button" class="chip" data-pack="' + p.id + '">' + p.emoji + ' ' + util.esc(p.name) + '</button>';
        }).join(''));
        seg.dataset.built = '1';
      }
      Rank.sync();
    },
    sync: function () {
      util.qsa('#rank-pack-picker .chip').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.pack === App.rankPack);
      });
      var pool = poolFor(App.rankPack === 'all' ? 'all' : [App.rankPack], 0);
      var info = document.getElementById('rank-info');
      if (info) info.innerHTML = '<b>' + pool.length + '</b>문제 풀 · 10라운드 · 카드 3장씩';
    },
    play: function () {
      var pool = poolFor(App.rankPack === 'all' ? 'all' : [App.rankPack], 0);
      var qs = buildRound(pool, 10);
      var name = App.rankPack === 'all' ? '전체 팩' : App.packMap[App.rankPack].name;
      var stage = document.getElementById('rank-stage');
      startGame({
        host: stage, questions: qs, modeId: 'rank_3', label: '3장 줄세우기 · ' + name,
        onEnd: function (stats) {
          renderResult(stage, stats, {
            title: '3장 줄세우기 · ' + name, kicker: 'RANKING MODE',
            againLabel: '같은 조건 한 판 더',
            onAgain: function () { Rank.play(); },
            extraActions: '<a class="btn btn-ghost" href="#cross">오늘의 크로스오버</a>'
          });
          App.scores.save('rank', { correct: stats.correct, total: stats.total, score: stats.score, pct: stats.pct });
        }
      });
    }
  };

  /* ── 연승전 ───────────────────────────────────────────── */
  var Streak = {
    enter: function () {
      var seg = document.getElementById('streak-pack-picker');
      if (seg && !seg.dataset.built) {
        seg.insertAdjacentHTML('beforeend', App.packs.map(function (p) {
          return '<button type="button" class="chip" data-pack="' + p.id + '">' + p.emoji + ' ' + util.esc(p.name) + '</button>';
        }).join(''));
        seg.dataset.built = '1';
      }
      Streak.sync();
      var best = App.scores.best('streak', 'score');
      var info = document.getElementById('streak-info');
      if (info) {
        info.innerHTML = (best ? '최고 <b>' + util.number(best.score) + '점</b> · ' : '') + '하트 3개';
      }
    },
    sync: function () {
      util.qsa('#streak-pack-picker .chip').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.pack === App.streakPack);
      });
    },
    play: function () {
      var pool = poolFor(App.streakPack === 'all' ? 'all' : [App.streakPack], 0);
      var qs = util.shuffle(pool).map(function (q) { return cloneQuestion(q); });
      var name = App.streakPack === 'all' ? '전체 팩' : App.packMap[App.streakPack].name;
      var stage = document.getElementById('streak-stage');
      startGame({
        host: stage, questions: qs, modeId: 'survival_streak', label: '끝장 연승전 · ' + name, lives: 3,
        onEnd: function (stats) {
          var best = App.scores.best('streak', 'score');
          var isBest = !best || stats.score > best.score;
          App.scores.save('streak', { score: stats.score, correct: stats.correct, total: stats.total, combo: stats.maxCombo });
          renderResult(stage, stats, {
            title: '끝장 연승전 · ' + name, kicker: isBest ? 'NEW RECORD' : 'SURVIVAL',
            againLabel: '다시 도전',
            onAgain: function () { Streak.play(); },
            extraActions: '<a class="btn btn-ghost" href="#world">덕후 월드</a>'
          });
          var badge = stage.querySelector('.result-tier');
          if (badge) badge.textContent = (isBest ? 'NEW RECORD · ' : 'SURVIVAL · ') + stats.maxCombo + ' COMBO';
        }
      });
    }
  };

  /* ── 제휴관 ───────────────────────────────────────────── */
  var Brand = {
    render: function () {
      var host = document.getElementById('brand-grid');
      if (!host) return;
      host.innerHTML = App.brands.map(function (b) {
        return '<article class="brand-card" style="--bc:' + (b.color || '#4B3BFF') + ';--bc2:' + (b.color2 || '#8B5CF6') + '">' +
          '<div class="bc-top"><p class="bc-brand"><span aria-hidden="true">' + (b.emoji || '🏷') + '</span>' + util.esc(b.name) + '</p>' +
            '<span class="bc-demo">가상 제휴 데모</span></div>' +
          '<div class="bc-body">' +
            '<h2>' + util.esc(b.slogan || b.name) + '</h2>' +
            '<p>' + util.esc(b.desc || '') + '</p>' +
            '<ul class="bc-facts">' +
              '<li>' + (b.count || 0) + '문제</li><li>약 2분</li><li>?brand=' + b.id + '</li>' +
            '</ul>' +
          '</div>' +
          '<div class="bc-actions">' +
            '<button type="button" class="btn btn-primary" style="background:linear-gradient(120deg,var(--bc),var(--bc2));box-shadow:none" data-brand-play="' + b.id + '">데모 플레이</button>' +
            '<button type="button" class="btn btn-ghost" data-brand-url="' + b.id + '">전용 URL 복사</button>' +
          '</div>' +
        '</article>';
      }).join('');
      util.qsa('[data-brand-play]', host).forEach(function (btn) {
        btn.addEventListener('click', function () { App.openBrand(btn.dataset.brandPlay); });
      });
      util.qsa('[data-brand-url]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          util.copy(App.brandUrl(btn.dataset.brandUrl), '전용 URL을 복사했습니다');
        });
      });
    }
  };

  App.brandUrl = function (id) {
    return location.origin + location.pathname + '?brand=' + encodeURIComponent(id);
  };

  App.openBrand = async function (id) {
    try {
      var brand = await App.repo.brand(id);
      App.brand = brand;
      App.brandId = id;
      App.brandMode = 'pick_max';
      var head = document.getElementById('wl-head');
      head.style.setProperty('--bc', brand.color || '#4B3BFF');
      head.style.setProperty('--bc2', brand.color2 || '#8B5CF6');
      document.getElementById('wl-emoji').textContent = brand.emoji || '🏷';
      document.getElementById('brandplay-title').textContent = brand.name + ' 미니게임';
      document.getElementById('wl-slogan').textContent = brand.slogan || '';
      document.title = brand.name + ' 미니게임 · 빅넘버월드 V2';
      util.qsa('#wl-mode-seg .seg-btn').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.mode === App.brandMode);
      });
      var stage = document.getElementById('brandplay-stage');
      stage.dataset.init = '';
      stage.dataset.brand = brand.id;
      stage.innerHTML = '';
      Brand.intro();
      if (location.hash !== '#brandplay') location.hash = '#brandplay';
      else showView('brandplay');
    } catch (e) {
      util.toast('브랜드 팩을 불러오지 못했습니다');
      location.hash = '#brand';
    }
  };

  Brand.intro = function () {
    var stage = document.getElementById('brandplay-stage');
    var b = App.brand;
    if (!stage || !b) return;
    stage.dataset.init = '1';
    var qs = b.questions || [];
    stage.innerHTML =
      '<div class="start-card" style="border-top:4px solid ' + (b.color || '#4B3BFF') + '">' +
        '<div class="start-top"><span class="start-date">' + util.esc(b.company || b.name) + ' × 빅넘버월드 V2</span>' +
          '<span class="start-badge">' + (b.demo ? '가상 제휴 데모' : '브랜드 팩') + '</span></div>' +
        '<h2>' + util.esc(b.slogan || b.name) + '</h2>' +
        '<p>' + util.esc(b.desc || '') + '</p>' +
        '<ul class="start-steps">' +
          '<li><b>FORMAT</b><span>' + qs.length + '문제 · 규칙은 위에서 선택</span></li>' +
          '<li><b>MODE</b><span>빅넘버 픽 / 3장 줄세우기</span></li>' +
          '<li><b>SHARE</b><span>전용 URL로 QR 배포</span></li>' +
        '</ul>' +
        '<div class="start-foot">' +
          '<button type="button" class="btn btn-primary btn-lg" id="brand-start">' + qs.length + '문제 시작</button>' +
          '<button type="button" class="btn btn-ghost" id="brand-url-copy">전용 URL 복사</button>' +
          '<p class="start-note">결과 화면은 실제 서비스에서 쿠폰·랜딩으로 연결됩니다.</p>' +
        '</div>' +
      '</div>';
    document.getElementById('brand-start').addEventListener('click', function () { Brand.play(); });
    var startBtn = document.getElementById('brand-start');
    if (startBtn) {
      startBtn.style.background = 'linear-gradient(120deg,' + (b.color || '#4B3BFF') + ',' + (b.color2 || '#8B5CF6') + ')';
      startBtn.style.boxShadow = '0 10px 24px -14px ' + (b.color || '#4B3BFF');
    }
    document.getElementById('brand-url-copy').addEventListener('click', function () {
      util.copy(App.brandUrl(b.id), '전용 URL을 복사했습니다');
    });
  };

  Brand.play = function () {
    var b = App.brand;
    var stage = document.getElementById('brandplay-stage');
    var qs = util.shuffle(b.questions || []).map(function (q) { return cloneQuestion(q); });
    startGame({
      host: stage, questions: qs, modeId: App.brandMode, label: b.name + ' · ' + BNW.modes.get(App.brandMode).name,
      onEnd: function (stats) {
        var grade = stats.pct >= 80 ? 'GOLD' : (stats.pct >= 60 ? 'SILVER' : 'BASIC');
        var code = 'BNW2-' + b.id.slice(0, 2).toUpperCase() + '-' + grade + '-' + String(Math.floor(Math.random() * 9000) + 1000);
        stage.innerHTML =
          '<div class="result">' +
            '<div class="result-badge" aria-hidden="true">' + (b.emoji || '🏷') + '</div>' +
            '<p class="result-tier">SPONSORED PACK · DEMO RESULT</p>' +
            '<p class="result-tier-name">' + stats.correct + '/' + stats.total + ' 정답 · ' + grade + ' 쿠폰</p>' +
            '<dl class="result-stats">' +
              '<div><dt>정답률</dt><dd>' + stats.pct + '%</dd></div>' +
              '<div><dt>점수</dt><dd>' + util.number(stats.score) + '</dd></div>' +
              '<div><dt>모드</dt><dd>' + BNW.modes.get(stats.modeId).name + '</dd></div>' +
            '</dl>' +
            '<div class="coupon-code" style="font-family:var(--mono);font-size:1.15rem;font-weight:800;background:var(--bg);border:1px dashed var(--line);border-radius:12px;padding:14px;margin:14px 0">' + code +
              '<small style="display:block;font-size:.7rem;color:var(--muted-2);font-weight:600">가상 쿠폰 코드 · 실제 사용 불가</small></div>' +
            '<div class="result-actions">' +
              '<button type="button" class="btn btn-primary" id="bc-copy">쿠폰 코드 복사</button>' +
              '<button type="button" class="btn btn-ghost" id="bc-again">다시 플레이</button>' +
              '<button type="button" class="btn btn-ghost" data-open-contact data-contact-type="브랜드 스폰서드 팩">이 팩으로 제휴 문의</button>' +
            '</div>' +
            '<p class="result-note">※ 가상 제휴 데모입니다. 실제 쿠폰 발급·결제는 이루어지지 않습니다.</p>' +
          '</div>';
        document.getElementById('bc-copy').addEventListener('click', function () { util.copy(code, '쿠폰 코드를 복사했습니다'); });
        document.getElementById('bc-again').addEventListener('click', function () { Brand.play(); });
      }
    });
  };

  /* ── 출제 시트 ────────────────────────────────────────── */
  var Sheet = {
    rows: [], host: null, stage: null,
    SAMPLES: [
      { q: '공복혈당이 가장 높은 것은? (샘플 예시)', o: ['92', '100', '126', '140'], u: 'mg/dL', tip: '공복혈당은 100mg/dL 미만이 정상, 126 이상이면 당뇨병 진단 기준입니다.' },
      { q: '성인 하루 권장 수면 시간의 상한은? (샘플 예시)', o: ['6', '7', '8', '9'], u: '시간', tip: '성인 권장 수면은 7~9시간, 상한은 9시간입니다.' },
      { q: '월 보험료 12만 원을 1년 내면 모두 얼마? (샘플 예시)', o: ['1200000', '1320000', '1440000', '1560000'], u: '원', tip: '120,000 × 12 = 1,440,000원. 보험료·적립금 계산은 브랜드 팩의 단골 소재입니다.' },
      { q: '1년은 모두 몇 시간? (샘플 예시)', o: ['7200', '8064', '8760', '9000'], u: '시간', tip: '365일 × 24시간 = 8,760시간.' },
      { q: '하루 1만 보를 30일 걸으면? (샘플 예시)', o: ['200000', '250000', '300000', '365000'], u: '보', tip: '10,000 × 30 = 300,000보.' }
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
      util.qsa('[data-sheet-mode]').forEach(function (b) {
        b.addEventListener('click', function () {
          App.sheetMode = b.dataset.sheetMode;
          util.qsa('[data-sheet-mode]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        });
      });
    },
    blank: function () { return { q: '', o: ['', '', '', ''], u: '', tip: '' }; },
    render: function () {
      var self = this;
      this.host.innerHTML = this.rows.map(function (r, i) {
        var cells = r.o.map(function (v, k) {
          return '<label>보기 ' + (k + 1) + '<input type="number" step="any" inputmode="decimal" data-i="' + i + '" data-f="' + k + '" value="' + util.esc(v) + '" placeholder="숫자"></label>';
        }).join('');
        return '<div class="sheet-row" data-row="' + i + '">' +
          '<div class="sr-top"><span class="sr-no">Q' + (i + 1) + '</span>' +
            '<input class="sr-q" type="text" data-i="' + i + '" data-f="q" value="' + util.esc(r.q) + '" placeholder="문제 문장 (예: 공복혈당이 가장 높은 것은?)">' +
            '<button type="button" class="sr-del" data-del="' + i + '" aria-label="Q' + (i + 1) + ' 삭제">✕</button></div>' +
          '<div class="sr-fields">' + cells +
            '<label>단위<input type="text" data-i="' + i + '" data-f="u" value="' + util.esc(r.u) + '" placeholder="mg/dL"></label></div>' +
          '<textarea class="sr-tip" rows="2" data-i="' + i + '" data-f="tip" placeholder="한 줄 해설 — 정답 공개 때 함께 보입니다 (선택)">' + util.esc(r.tip) + '</textarea>' +
        '</div>';
      }).join('');
      util.qsa('input, textarea', this.host).forEach(function (inp) {
        inp.addEventListener('input', function () {
          var row = self.rows[Number(inp.dataset.i)];
          if (!row) return;
          var f = inp.dataset.f;
          if (f === 'q' || f === 'u' || f === 'tip') row[f] = inp.value;
          else row.o[Number(f)] = inp.value;
        });
      });
      util.qsa('[data-del]', this.host).forEach(function (b) {
        b.addEventListener('click', function () {
          if (self.rows.length <= 1) self.rows[0] = self.blank();
          else self.rows.splice(Number(b.dataset.del), 1);
          self.render();
        });
      });
      this.count();
    },
    count: function () {
      var n = this.rows.filter(function (r) { return r.q.trim(); }).length;
      var el = document.getElementById('sheet-count');
      if (el) el.textContent = n + '문제';
    },
    addRow: function () {
      if (this.rows.length >= 8) { util.toast('데모에서는 8문제까지 넣을 수 있습니다'); return; }
      this.rows.push(this.blank());
      this.render();
      var last = this.host.querySelector('[data-row="' + (this.rows.length - 1) + '"] .sr-q');
      if (last) last.focus();
    },
    clear: function () {
      this.rows = [this.blank(), this.blank()];
      this.render();
      if (this.stage) this.stage.innerHTML = '';
      util.toast('시트를 비웠습니다');
    },
    preset: async function () {
      var self = this;
      var rows = this.SAMPLES.map(function (x) {
        return { q: x.q, o: x.o.slice(), u: x.u, tip: x.tip };
      });
      try {
        var brand = await App.repo.brand('dblife');
        rows = (brand.questions || []).map(function (q) {
          return {
            q: q.q, u: q.unit || '',
            o: q.opts.map(function (o) { return String(o.v); }),
            tip: q.insight || ''
          };
        });
      } catch (e) { /* 폴백 샘플 */ }
      this.rows = rows;
      this.render();
      if (this.stage) this.stage.innerHTML = '';
      util.toast('DB생명 샘플 ' + rows.length + '문제를 불러왔습니다');
      var box = document.getElementById('sheet-builder');
      if (box) box.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    build: function () {
      var bad = [];
      var qs = [];
      this.rows.forEach(function (r, i) {
        var text = r.q.trim();
        var vals = r.o.map(function (x) { return String(x).replace(/,/g, '').trim(); })
          .map(function (x) { return x === '' ? NaN : Number(x); })
          .filter(function (n) { return isFinite(n); });
        var rowEl = document.querySelector('.sheet-row[data-row="' + i + '"]');
        if (rowEl) rowEl.classList.remove('is-bad');
        if (!text && vals.length === 0) return;
        if (!text || vals.length < 3) { bad.push(i); return; }
        if (new Set(vals).size !== vals.length) { bad.push(i); return; }
        var unit = (r.u || '').trim();
        var opts = vals.map(function (v) {
          return { t: util.fmt(v) + (unit ? ' ' + unit : ''), v: v, u: '', n: '' };
        });
        qs.push({
          id: 'sheet-' + (i + 1), pack: 'sheet', lv: 2, form: 'pick1', lens: 'unit', unit: unit,
          q: text, insight: (r.tip || '').trim() || '출제 시트에서 입력한 문항입니다.', src: 'sheet',
          opts: opts
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
      var built = this.build();
      if (!built.questions.length) {
        util.toast(built.bad.length ? '표시된 줄의 문제 문장과 숫자 보기를 확인해 주세요' : '문제를 한 줄 이상 채워 주세요');
        return;
      }
      if (built.bad.length) util.toast('빨간 줄을 확인해 주세요 (문제 문장 · 숫자 3개 이상 · 값 중복 금지)');
      this.stage.innerHTML = '';
      var qs = built.questions.map(function (q) { return Object.assign({}, q, { opts: q.opts.slice() }); });
      startGame({
        host: this.stage, questions: qs, modeId: App.sheetMode, label: '출제 시트 미리보기 · ' + BNW.modes.get(App.sheetMode).name,
        onEnd: function (stats) {
          renderResult(self.stage, stats, {
            title: '출제 시트 미리보기', kicker: 'SHEET PREVIEW · ' + BNW.modes.get(stats.modeId).name,
            againLabel: '다시 플레이',
            onAgain: function () { self.play(); },
            extraActions: '<button type="button" class="btn btn-primary" data-open-contact data-contact-type="출제 시트·문제 등록">이 팩으로 제휴 문의</button>'
          });
        }
      });
    }
  };

  /* ── 제휴 문의 모달 ───────────────────────────────────── */
  var Contact = {
    modal: null, lastFocus: null,
    init: function () {
      var self = this;
      this.modal = document.getElementById('contact-modal');
      document.addEventListener('click', function (e) {
        var opener = e.target.closest('[data-open-contact]');
        if (opener) { e.preventDefault(); self.open(opener.dataset.contactType || ''); return; }
        if (e.target.closest('[data-close-contact]')) self.close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && self.modal && !self.modal.hidden) self.close();
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
      form.reset();
      form.hidden = false;
      document.getElementById('cm-form-wrap').hidden = false;
      document.getElementById('cm-done').hidden = true;
      document.getElementById('form-error').hidden = true;
      util.qsa('.is-bad', form).forEach(function (f) { f.classList.remove('is-bad'); });
      var sel = document.getElementById('contact-type');
      if (type) {
        Array.prototype.forEach.call(sel.options, function (o) { if (o.text === type) sel.value = o.text; });
      }
      this.modal.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(function () {
        var first = form.querySelector('[name="company"]');
        if (first) first.focus();
      }, 40);
    },
    close: function () {
      this.modal.hidden = true;
      document.body.style.overflow = '';
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    },
    submit: async function (form) {
      var err = document.getElementById('form-error');
      var bad = [];
      ['company', 'name', 'phone'].forEach(function (n) {
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
        message: form.elements['message'].value.trim()
      };
      var res = { ok: true, id: 'BNW2-LOCAL' };
      try { res = await App.leads.submit(data); }
      catch (e) { util.toast('접수 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'); return; }
      document.getElementById('cm-form-wrap').hidden = true;
      var done = document.getElementById('cm-done');
      done.hidden = false;
      document.getElementById('done-no').textContent = '접수번호 ' + res.id;
      document.getElementById('done-desc').innerHTML =
        '<b>' + util.esc(data.company) + '</b> · ' + util.esc(data.type) + '<br>담당자 ' + util.esc(data.name) + ' · ' + util.esc(data.phone) +
        '<br>프로토타입에서는 실제 발송 대신 이 브라우저에만 접수 내역을 남깁니다.';
    }
  };

  /* ── 확장 안내 코드 복사 ──────────────────────────────── */
  var SNIPPETS = {
    pack: '{\n  "id": "ocean",\n  "name": "바다·해양",\n  "emoji": "🌊",\n  "color": "#0EA5E9",\n  "file": "data/packs/ocean.json",\n  "order": 9\n}',
    mode: "BNW.modes.register({\n  id: 'ox_speed',\n  name: 'O/X 스피드전',\n  init(state) { state.time = 30; },\n  renderQuestion(ctx) { /* 카드 렌더 */ },\n  evaluate(ctx, pick) { return { ok: pick === ctx.q.answer, points: 80 }; },\n  getShareSummary(stats) { return `정답 ${stats.correct}/${stats.total}`; }\n});"
  };

  /* ── 라우팅 ───────────────────────────────────────────── */
  function showView(id) {
    VIEWS.forEach(function (v) {
      var sec = document.getElementById('view-' + v);
      if (sec) sec.hidden = (v !== id);
    });
    var navId = id === 'brandplay' ? 'brand' : id;
    util.qsa('[data-nav]').forEach(function (a) {
      var on = a.dataset.nav === navId;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function route() {
    var id = (location.hash || '#home').replace('#', '');
    if (VIEWS.indexOf(id) === -1) id = 'home';
    if (id === 'brandplay' && !App.brand) {
      var bid = util.param('brand');
      if (bid) { App.openBrand(bid); return; }
      id = 'brand';
    }
    if (App.runner && id !== (App.currentView || 'home')) {
      /* 다른 화면으로 이동하면 진행 중 게임 타이머를 정리 */
      if (App.runner.state && !App.runner.state.finished) App.runner.abort();
    }
    App.currentView = id;
    showView(id);
    if (id === 'cross') Cross.enter();
    if (id === 'world') WORLD.enter();
    if (id === 'rank') Rank.enter();
    if (id === 'streak') Streak.enter();
    if (id === 'brand') Brand.render();
    if (id === 'brandplay' && App.brand) {
      var stage = document.getElementById('brandplay-stage');
      if (!stage.dataset.init || stage.dataset.brand !== App.brandId) {
        stage.dataset.brand = App.brandId;
        Brand.intro();
      }
    }
    document.title = id === 'brandplay' && App.brand
      ? App.brand.name + ' 미니게임 · 빅넘버월드 V2'
      : '빅넘버월드 V2 | 숫자로 겹쳐 노는 크로스오버 아레나';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ── 이벤트 바인딩 ────────────────────────────────────── */
  function bind() {
    window.addEventListener('hashchange', route);

    document.getElementById('lv-picker').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]');
      if (!b) return;
      App.worldLv = Number(b.dataset.lv);
      WORLD.sync();
    });
    document.getElementById('world-start-btn').addEventListener('click', function () { WORLD.play(); });

    document.getElementById('rank-pack-picker').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pack]');
      if (!b) return;
      App.rankPack = b.dataset.pack;
      Rank.sync();
    });
    document.getElementById('rank-start-btn').addEventListener('click', function () { Rank.play(); });

    document.getElementById('streak-pack-picker').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pack]');
      if (!b) return;
      App.streakPack = b.dataset.pack;
      Streak.sync();
    });
    document.getElementById('streak-start-btn').addEventListener('click', function () { Streak.play(); });

    document.getElementById('wl-mode-seg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]');
      if (!b) return;
      App.brandMode = b.dataset.mode;
      util.qsa('#wl-mode-seg .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      var stage = document.getElementById('brandplay-stage');
      stage.dataset.init = '';
      Brand.intro();
    });
    document.getElementById('wl-copy').addEventListener('click', function () {
      if (App.brand) util.copy(App.brandUrl(App.brand.id), '전용 URL을 복사했습니다');
    });

    document.addEventListener('click', function (e) {
      var copyBtn = e.target.closest('[data-copy-code]');
      if (copyBtn) {
        util.copy(SNIPPETS[copyBtn.dataset.copyCode] || '', '예시 코드를 복사했습니다');
      }
    });

    BNW.bus.on('flash', flash);
  }

  /* ── 부트 ─────────────────────────────────────────────── */
  App.boot = async function () {
    try {
      var adapters = await BNW.adapters.create();
      App.repo = adapters.repo;
      App.scores = adapters.scores;
      App.leads = adapters.leads;
      App.config = adapters.config;
      App.packs = App.repo.packs();
      App.packMap = {};
      App.packs.forEach(function (p) { App.packMap[p.id] = p; });
      App.brands = App.repo.brands();
      App.all = App.repo.allQuestions();

      App.updateCounts();
      App.renderHomePacks();
      Brand.render();
      Sheet.init();
      Contact.init();
      bind();

      var brandParam = util.param('brand');
      if (brandParam) {
        await App.openBrand(brandParam);
        return;
      }
      if (location.hash === '#world') { App.renderWorldPacks(); }
      route();
    } catch (e) {
      if (window.console) console.error(e);
      util.toast('데이터를 불러오지 못했습니다. 새로고침해 주세요.');
    }
  };

  BNW.App = App;
  BNW.ready(function () { App.boot(); });
})(window.BNW);
