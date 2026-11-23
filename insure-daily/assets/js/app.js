/* ============================================================
   인슈어데일리 INSURE DAILY — app
   ============================================================ */
(function () {
  'use strict';
  var DATA = window.INSURE_DAILY;
  var ART = DATA.articles;
  var CATS = DATA.categories;
  var SPECIAL = ['dongyang-healthage', 'db-driver', 'kakao-mini', 'ga-1200-rule'];
  var OPINION = ['op-ai-explain', 'op-senior-driver', 'op-retention'];

  var state = { cat: '종합', q: '', shown: 9, current: null };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var byId = function (id) { return ART.filter(function (a) { return a.id === id; })[0]; };
  var sameCat = function (a, c) { return c === '종합' || a.cat === c; };

  /* ---------------- ticker ---------------- */
  function renderTicker() {
    var html = DATA.market.map(function (m) {
      var cls = m.dir === 'up' ? 'up' : (m.dir === 'down' ? 'down' : 'flat');
      return '<span class="tk"><b>' + esc(m.label) + '</b>' + esc(m.value) +
        ' <span class="' + cls + '">' + esc(m.delta) + '</span></span>';
    }).join('');
    var set = '<div class="ticker-set">' + html + '</div>';
    $('#tickerTrack').innerHTML = set + set;
  }

  /* ---------------- nav ---------------- */
  function renderNav() {
    var nav = $('#navList');
    nav.innerHTML = CATS.map(function (c) {
      return '<button class="nav-link" role="tab" type="button" data-cat="' + esc(c) + '" aria-selected="' +
        (c === state.cat) + '">' + esc(c) + '</button>';
    }).join('');
    $('#drawerNav').innerHTML = CATS.map(function (c) {
      var n = ART.filter(function (a) { return sameCat(a, c); }).length;
      return '<a href="#latest" data-cat="' + esc(c) + '">' + esc(c) + '<small>' + n + '건</small></a>';
    }).join('');
  }

  function setCat(c, scroll) {
    state.cat = c;
    state.shown = 9;
    $$('.nav-link').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.cat === c)); });
    renderGrid();
    if (scroll) {
      var y = $('#latest').getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  /* ---------------- hero ---------------- */
  function renderHero() {
    var lead = ART[0];

    // timeline: newest first
    var tl = ART.slice().sort(function (a, b) { return b.time.localeCompare(a.time); }).slice(0, 9);
    $('#timeline').innerHTML = tl.map(function (a, i) {
      return '<li><div class="tl-time">' + esc(a.time) + (i === 0 ? '<span class="new">NEW</span>' : '') +
        '</div><a class="tl-title" href="#/article/' + a.id + '" data-open="' + a.id + '">' + esc(a.title) +
        '</a><div class="tl-cat">' + esc(a.cat) + '</div></li>';
    }).join('');

    // lead
    $('#lead').innerHTML =
      '<figure class="lead-figure"><img src="' + lead.img + '" alt="' + esc(lead.imgAlt || '') + '" fetchpriority="high">' +
      '<span class="fig-badge">TOP STORY</span><span class="fig-credit">인슈어데일리</span></figure>' +
      '<div class="lead-body">' +
      '<p class="eyebrow">' + esc(lead.cat) + '<span class="dot"></span>2026.11.23 06:00<span class="dot"></span>주요 뉴스</p>' +
      '<h1 class="lead-title"><a href="#/article/' + lead.id + '" data-open="' + lead.id + '">' + esc(lead.title) + '</a></h1>' +
      '<p class="lead-dek">' + esc(lead.dek) + '</p>' +
      '<div class="sum-box"><b>3줄 핵심</b><ul>' + lead.summary.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="byline"><div class="who"><b>' + esc(lead.author) + '</b><i></i><span>' + esc(lead.authorRole) + '</span><i></i><span>' + esc(lead.time) + ' 입력</span></div>' +
      '<button class="btn-read" type="button" data-open="' + lead.id + '">기사 읽기 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>' +
      '</div>';

    // most read
    var most = ART.filter(function (a) { return a.id !== lead.id; })
      .sort(function (a, b) { return b.viewsNum - a.viewsNum; }).slice(0, 5);
    $('#mostList').innerHTML = most.map(function (a) {
      return '<li><a href="#/article/' + a.id + '" data-open="' + a.id + '">' + esc(a.title) +
        '<span class="cat">' + esc(a.cat) + '</span></a></li>';
    }).join('');

    // data widget
    var bars = [
      { n: '삼성화재', v: 14.84 }, { n: 'DB손보', v: 13.04 }, { n: '메리츠', v: 12.26 },
      { n: 'KB손보', v: 10.90 }, { n: '현대해상', v: 10.18 }
    ];
    var max = 15.5;
    $('#dataWidget').innerHTML =
      '<div class="dw-head"><h3>오늘의 보험 데이터</h3><span>2026.3Q</span></div>' +
      '<p class="dw-sub">5대 손보사 보유 CSM · 단위: 조원</p>' +
      bars.map(function (b) {
        return '<div class="dw-bar"><span class="nm">' + b.n + '</span><span class="track"><span class="fill" style="width:' +
          Math.round(b.v / max * 100) + '%"></span></span><span class="val">' + b.v.toFixed(2) + '</span></div>';
      }).join('') +
      '<div class="dw-foot"><span>합계 <b>61.2조원</b></span><span>전년 대비 <b>+9.9%</b></span></div>' +
      '<div style="border-top:1px solid var(--line-2);margin-top:12px;padding-top:10px">' +
      '<div class="dw-head"><h3 style="font-size:11.5px">실손보험 손해율</h3><span>2024→2026</span></div>' +
      '<svg class="spark" viewBox="0 0 220 48" preserveAspectRatio="none" aria-label="실손보험 손해율 추이 112%, 115%, 118%">' +
      '<path class="area" d="M0,38 L60,29 L120,20 L180,8 L220,2 L220,48 L0,48 Z"/>' +
      '<path class="line" d="M6,37 L70,28 L134,18 L196,7"/>' +
      '<circle cx="196" cy="7" r="2.6" fill="var(--gold)"/>' +
      '</svg>' +
      '<div class="dw-foot"><span>2024 <b>112%</b></span><span>2025 <b>115%</b></span><span>2026 <b>118%</b></span></div></div>';
  }

  /* ---------------- special ---------------- */
  function renderSpecial() {
    $('#specialGrid').innerHTML = SPECIAL.map(function (id) {
      var a = byId(id); if (!a) return '';
      return '<a class="sp-card" href="#/article/' + a.id + '" data-open="' + a.id + '">' +
        '<span class="sp-cat">' + esc(a.cat) + '</span>' +
        '<span class="sp-title">' + esc(a.title) + '</span>' +
        '<span class="sp-meta">' + esc(a.author) + ' · ' + esc(a.time) + '</span></a>';
    }).join('');
  }

  /* ---------------- grid ---------------- */
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return ART.filter(function (a) {
      if (!sameCat(a, state.cat)) return false;
      if (!q) return true;
      var hay = (a.title + ' ' + a.dek + ' ' + a.author + ' ' + a.tags.join(' ') + ' ' + a.cat).toLowerCase();
      return hay.indexOf(q) > -1;
    });
  }

  function card(a) {
    return '<article class="card" data-open="' + a.id + '" tabindex="0" role="button" aria-label="' + esc(a.title) + '">' +
      '<div class="card-fig"><img src="' + a.img + '" alt="' + esc(a.imgAlt || '') + '" loading="lazy">' +
      '<span class="card-cat">' + esc(a.cat) + '</span></div>' +
      '<h3 class="card-title">' + esc(a.title) + '</h3>' +
      '<p class="card-dek">' + esc(a.dek) + '</p>' +
      '<div class="card-meta"><span>' + esc(a.author) + '</span><i></i><span>' + esc(a.time) + '</span></div>' +
      '</article>';
  }

  function renderGrid() {
    var list = filtered();
    var show = list.slice(0, state.shown);
    $('#grid').innerHTML = show.length ? show.map(card).join('')
      : '<p class="empty">‘' + esc(state.q || state.cat) + '’에 해당하는 기사가 없습니다. 다른 키워드로 검색해 보세요.</p>';

    $('#latestTitle').innerHTML = (state.q ? '검색 결과' : (state.cat === '종합' ? '최신 기사' : state.cat)) +
      ' <small>LATEST</small>';
    $('#latestCount').textContent = list.length + '건 · ' + (state.q ? '‘' + state.q + '’' : state.cat);

    var note = $('#resultNote');
    if (state.q) {
      note.className = 'result-note on';
      note.innerHTML = '<span><b>‘' + esc(state.q) + '’</b> 검색 결과 <b>' + list.length + '건</b></span>' +
        '<button type="button" id="clearQ">검색 초기화</button>';
      var cq = $('#clearQ');
      if (cq) cq.onclick = function () { clearSearch(); };
    } else { note.className = 'result-note'; note.innerHTML = ''; }

    $('#moreWrap').style.display = list.length > show.length ? 'flex' : 'none';
  }

  function renderOpinion() {
    $('#opGrid').innerHTML = OPINION.map(function (id) {
      var a = byId(id); if (!a) return '';
      var initial = a.author.slice(0, 1);
      return '<article class="op-card" data-open="' + a.id + '" tabindex="0" role="button">' +
        '<p class="op-quote">' + esc(a.dek) + '</p>' +
        '<div class="op-who"><span class="op-av">' + esc(initial) + '</span>' +
        '<span><b>' + esc(a.author) + '</b><span>' + esc(a.authorRole) + '</span></span></div></article>';
    }).join('');
  }

  function renderDataFeature() {
    var bars = [
      { n: '삼성화재', v: 14.84, d: '+4.7%' }, { n: 'DB손보', v: 13.04, d: '+6.9%' },
      { n: '메리츠', v: 12.26, d: '+10.4%' }, { n: 'KB손보', v: 10.90, d: '+17.4%' },
      { n: '현대해상', v: 10.18, d: '+13.4%' }
    ];
    var maxV = 15.5, W = 520, H = 210, base = 168, bw = 54, gap = 46;
    var svg = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="5대 손보사 보유 CSM 막대그래프">';
    [0, 5, 10, 15].forEach(function (t) {
      var y = base - (t / maxV) * 130;
      svg += '<line class="gridline" x1="34" x2="' + (W - 8) + '" y1="' + y + '" y2="' + y + '"/>' +
        '<text x="26" y="' + (y + 3) + '" text-anchor="end">' + t + '</text>';
    });
    bars.forEach(function (b, i) {
      var h = (b.v / maxV) * 130;
      var x = 52 + i * (bw + gap);
      svg += '<rect class="bar' + (i === 0 ? ' alt' : '') + '" x="' + x + '" y="' + (base - h) + '" width="' + bw +
        '" height="' + h + '" rx="1"/>' +
        '<text x="' + (x + bw / 2) + '" y="' + (base + 15) + '" text-anchor="middle">' + b.n + '</text>' +
        '<text x="' + (x + bw / 2) + '" y="' + (base - h - 8) + '" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--ink)">' +
        b.v.toFixed(1) + '</text>';
    });
    svg += '<line class="axis" x1="34" x2="' + (W - 8) + '" y1="' + base + '" y2="' + base + '"/></svg>';

    $('#dfGrid').innerHTML =
      '<div class="df-main"><p class="df-kicker">DATA BRIEF · 2026.3Q</p>' +
      '<h2>보유 CSM 61조원,<br>그러나 신계약은 10% 줄었다</h2>' +
      '<p>5대 손해보험사의 9월 말 보유 CSM은 61조2,013억원으로 사상 최대다. 반면 1~3분기 신계약 CSM은 7조4,660억원으로 전년 동기보다 10.4% 감소했다. 실적의 양과 질이 엇갈리는 국면을 막대그래프로 정리했다.</p>' +
      svg + '</div>' +
      '<div class="df-side"><p class="df-kicker">KEY NUMBERS</p>' +
      '<ul class="df-list">' +
      '<li><span>보유 CSM 합계</span><b>61조 2,013억</b></li>' +
      '<li><span>신계약 CSM</span><b>7조 4,660억</b></li>' +
      '<li><span>누적 보험손익</span><b>5조 4,152억</b></li>' +
      '<li><span>누적 순이익</span><b>5조 8,406억</b></li>' +
      '<li><span>삼성화재 K-ICS</span><b>280.8%</b></li>' +
      '</ul>' +
      '<div class="df-mini"><div><span>실손보험 손해율</span><b>118.3%</b></div><div><span>퇴직연금 적립금</span><b>558조원</b></div></div>' +
      '<p class="df-note">자료: 각 사 3분기 경영실적 공시(별도 기준). CSM 단위 조원은 소수 둘째 자리 반올림.</p>' +
      '<button class="btn-read" type="button" data-open="data-csm" style="margin-top:16px">인포그래픽 기사로 보기' +
      ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>';
  }

  /* ---------------- reader ---------------- */
  function relatedFor(a) {
    var same = ART.filter(function (x) { return x.id !== a.id && x.cat === a.cat; });
    var others = ART.filter(function (x) { return x.id !== a.id && x.cat !== a.cat; });
    var tagMatch = ART.filter(function (x) {
      return x.id !== a.id && x.tags.some(function (t) { return a.tags.indexOf(t) > -1; });
    });
    var out = [];
    [same, tagMatch, others].forEach(function (arr) {
      arr.forEach(function (x) { if (out.indexOf(x) < 0 && out.length < 3) out.push(x); });
    });
    return out;
  }

  function openReader(id, push) {
    var a = byId(id); if (!a) return;
    state.current = a;
    var rel = relatedFor(a);
    $('#readerInner').innerHTML =
      '<span class="r-cat">' + esc(a.cat) + '</span>' +
      '<h1 class="r-title">' + esc(a.title) + '</h1>' +
      '<p class="r-dek">' + esc(a.dek) + '</p>' +
      '<div class="r-byline"><b>' + esc(a.author) + '</b><span class="sp"></span><span>' + esc(a.authorRole) + '</span>' +
      '<span class="sp"></span><span>2026.11.23 ' + esc(a.time) + ' 입력</span><span class="sp"></span><span>읽기 4분</span></div>' +
      (a.img ? '<figure class="r-cover"><img src="' + a.img + '" alt="' + esc(a.imgAlt || '') + '"></figure>' +
        (a.imgCap ? '<p class="r-cap">' + esc(a.imgCap) + '</p>' : '<p class="r-cap">ⓒ 인슈어데일리</p>') : '') +
      '<div class="r-summary"><b>3줄 핵심</b><ul>' + a.summary.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="article-body">' + a.body + '</div>' +
      '<div class="r-tags">' + a.tags.map(function (t) { return '<a href="#" data-tag="' + esc(t) + '">#' + esc(t) + '</a>'; }).join('') + '</div>' +
      '<div class="r-share"><span>공유</span>' +
      '<button type="button" data-share="copy">링크 복사</button>' +
      '<button type="button" data-share="x">X</button>' +
      '<button type="button" data-share="fb">페이스북</button>' +
      '<button type="button" data-share="mail">메일</button></div>' +
      '<div class="r-related"><h3>관련 기사</h3><ul class="rel-list">' + rel.map(function (x) {
        return '<li><a href="#/article/' + x.id + '" data-open="' + x.id + '"><span class="t">' + esc(x.title) +
          '</span><span class="m">' + esc(x.cat) + ' · ' + esc(x.time) + '</span></a></li>';
      }).join('') + '</ul></div>';

    var reader = $('#reader');
    reader.classList.add('open');
    document.body.style.overflow = 'hidden';
    reader.scrollTop = 0;
    $('#rProgress').style.width = '0%';
    updateBookmark();
    document.title = a.title + ' | 인슈어데일리';
    if (push && location.hash !== '#/article/' + a.id) history.pushState({ id: a.id }, '', '#/article/' + a.id);
    var closeBtn = $('#readerClose');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeReader(push) {
    $('#reader').classList.remove('open');
    document.body.style.overflow = '';
    state.current = null;
    document.title = '인슈어데일리 | INSURE DAILY — 보험·금융 전문 일간지';
    if (push && location.hash.indexOf('#/article/') === 0) history.pushState({}, '', location.pathname + location.search);
  }

  function updateBookmark() {
    if (!state.current) return;
    var saved = JSON.parse(localStorage.getItem('id_bookmarks') || '[]');
    var on = saved.indexOf(state.current.id) > -1;
    $('#rBookmark').setAttribute('aria-pressed', String(on));
    $('#rBookmark').querySelector('span').textContent = on ? '저장됨' : '북마크';
  }

  function toggleBookmark() {
    if (!state.current) return;
    var saved = JSON.parse(localStorage.getItem('id_bookmarks') || '[]');
    var i = saved.indexOf(state.current.id);
    if (i > -1) { saved.splice(i, 1); toast('북마크에서 삭제했습니다'); }
    else { saved.push(state.current.id); toast('북마크에 저장했습니다'); }
    localStorage.setItem('id_bookmarks', JSON.stringify(saved));
    updateBookmark();
  }

  function share(kind) {
    if (!state.current) return;
    var a = state.current;
    var url = location.origin + location.pathname + '#/article/' + a.id;
    var title = a.title + ' | 인슈어데일리';
    if (kind === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('기사 링크를 복사했습니다'); },
          function () { toast(url); });
      } else { toast(url); }
    } else if (kind === 'x') {
      window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(a.title) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
    } else if (kind === 'fb') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener');
    } else if (kind === 'mail') {
      location.href = 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url);
    }
  }

  /* ---------------- search ---------------- */
  function searchAll(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return ART.filter(function (a) {
      return (a.title + ' ' + a.dek + ' ' + a.author + ' ' + a.tags.join(' ') + ' ' + a.cat).toLowerCase().indexOf(q) > -1;
    });
  }

  function openSearch(term) {
    $('#searchPanel').classList.add('open');
    var inp = $('#spInput');
    inp.value = term || '';
    renderSearchResults(inp.value);
    setTimeout(function () { inp.focus(); }, 40);
  }
  function closeSearch() { $('#searchPanel').classList.remove('open'); }

  function renderSearchResults(q) {
    var box = $('#spResults');
    if (!q.trim()) {
      box.innerHTML = '<p class="none">제목·키워드·기자명으로 검색하거나, 위의 추천 키워드를 눌러보세요.</p>';
      return;
    }
    var res = searchAll(q).slice(0, 8);
    box.innerHTML = res.length ? res.map(function (a) {
      return '<a href="#/article/' + a.id + '" data-open="' + a.id + '"><span class="c">' + esc(a.cat) + '</span>' +
        '<div class="t">' + esc(a.title) + '</div></a>';
    }).join('') : '<p class="none">검색 결과가 없습니다.</p>';
  }

  function applySearch(q) {
    state.q = q.trim();
    state.shown = 9;
    if (state.q) state.cat = '종합';
    $$('.nav-link').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.cat === state.cat)); });
    renderGrid();
    var y = $('#latest').getBoundingClientRect().top + window.pageYOffset - 70;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  function clearSearch() {
    state.q = '';
    var n = $('#navSearch'); if (n) n.value = '';
    var s = $('#spInput'); if (s) s.value = '';
    renderGrid();
  }

  /* ---------------- modal / drawer / theme ---------------- */
  function openSub() {
    var m = $('#subModal');
    m.classList.remove('done');
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var e = $('#subEmail'); if (e) e.focus(); }, 60);
  }
  function closeSub() {
    $('#subModal').classList.remove('open');
    document.body.style.overflow = $('#reader').classList.contains('open') ? 'hidden' : '';
  }
  function openDrawer() {
    $('#drawer').classList.add('open');
    $('#burger').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    $('#drawer').classList.remove('open');
    $('#burger').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = $('#reader').classList.contains('open') ? 'hidden' : '';
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('id_theme', t);
    var label = t === 'dark' ? '라이트 모드' : '다크 모드';
    $$('#themeBtn, #themeTop').forEach(function (b) {
      var sp = b.querySelector('span');
      if (sp) sp.textContent = label;
      b.setAttribute('aria-label', label + ' 전환');
    });
  }
  function toggleTheme() {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  var toastT;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------------- events ---------------- */
  function bind() {
    document.addEventListener('click', function (e) {
      var openEl = e.target.closest('[data-open]');
      if (openEl) {
        e.preventDefault();
        var id = openEl.getAttribute('data-open');
        if (openEl.closest('#reader')) {
          openReader(id, true);
        } else {
          openReader(id, true);
        }
        return;
      }
      var catEl = e.target.closest('[data-cat]');
      if (catEl) {
        e.preventDefault();
        closeDrawer();
        setCat(catEl.dataset.cat, true);
        return;
      }
      var jump = e.target.closest('[data-cat-jump]');
      if (jump) {
        e.preventDefault();
        setCat(jump.dataset.catJump, true);
        return;
      }
      var tag = e.target.closest('[data-tag]');
      if (tag) {
        e.preventDefault();
        closeReader(true);
        applySearch(tag.dataset.tag);
        return;
      }
      var sh = e.target.closest('[data-share]');
      if (sh) { share(sh.dataset.share); return; }
      if (e.target.closest('[data-open-sub]')) { openSub(); return; }
      if (e.target.closest('[data-close-drawer]')) { closeDrawer(); return; }
      if (e.target.id === 'searchPanel') { closeSearch(); }
      if (e.target.id === 'subModal') { closeSub(); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('#searchPanel').classList.contains('open')) closeSearch();
        else if ($('#subModal').classList.contains('open')) closeSub();
        else if ($('#drawer').classList.contains('open')) closeDrawer();
        else if ($('#reader').classList.contains('open')) closeReader(true);
      }
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement &&
        document.activeElement.classList.contains('card')) {
        e.preventDefault();
        openReader(document.activeElement.getAttribute('data-open'), true);
      }
    });

    $('#openSearch').addEventListener('click', function () { openSearch(''); });
    $('#openSearchTop').addEventListener('click', function () { openSearch(''); });
    $('#spClose').addEventListener('click', closeSearch);
    $('#spInput').addEventListener('input', function (e) { renderSearchResults(e.target.value); });
    $('#spInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { applySearch(e.target.value); closeSearch(); }
    });
    $('#spHint').addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]');
      if (b) { $('#spInput').value = b.dataset.q; renderSearchResults(b.dataset.q); $('#spInput').focus(); }
    });
    $('#navSearch').addEventListener('input', function (e) {
      state.q = e.target.value;
      state.shown = 9;
      if (state.q) { state.cat = '종합'; $$('.nav-link').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.cat === '종합')); }); }
      renderGrid();
    });
    $('#navSearch').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { applySearch(e.target.value); }
    });

    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#themeTop').addEventListener('click', toggleTheme);

    $('#readerBack').addEventListener('click', function () { closeReader(true); });
    $('#readerClose').addEventListener('click', function () { closeReader(true); });
    $('#rBookmark').addEventListener('click', toggleBookmark);
    $('#rShare').addEventListener('click', function () {
      if (state.current) {
        var url = location.origin + location.pathname + '#/article/' + state.current.id;
        if (navigator.share) {
          navigator.share({ title: state.current.title, url: url }).catch(function () { share('copy'); });
        } else { share('copy'); }
      }
    });
    $$('.r-fs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#reader').setAttribute('data-fs', b.dataset.fs);
        $$('.r-fs button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
    $('#reader').addEventListener('scroll', function () {
      var el = $('#reader');
      var max = el.scrollHeight - el.clientHeight;
      var p = max > 0 ? (el.scrollTop / max) * 100 : 0;
      $('#rProgress').style.width = p + '%';
    });

    $('#moreBtn').addEventListener('click', function () { state.shown += 6; renderGrid(); });

    $('#burger').addEventListener('click', openDrawer);
    $$('[data-close-drawer]').forEach(function (b) { b.addEventListener('click', closeDrawer); });

    $('#subClose').addEventListener('click', closeSub);
    $('#subForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#subEmail').value.trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      var agree = $('#subAgree').checked;
      if (!ok) { toast('이메일 주소를 정확히 입력해 주세요'); $('#subEmail').focus(); return; }
      if (!agree) { toast('개인정보 수집·이용 동의가 필요합니다'); return; }
      $('#subDoneMsg').textContent = email + ' 주소로 구독 안내를 보내드렸습니다. 내일 아침 7시에 첫 브리핑이 도착합니다.';
      $('#subModal').classList.add('done');
      setTimeout(function () { $('#subForm').reset(); }, 200);
    });

    $('#nlForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#nlEmail').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast('이메일 주소를 확인해 주세요'); return; }
      openSub();
      $('#subEmail').value = email;
    });
  }

  /* ---------------- boot ---------------- */
  function route() {
    var m = location.hash.match(/^#\/article\/(.+)$/);
    if (m && byId(m[1])) {
      openReader(m[1], false);
    } else if ($('#reader').classList.contains('open')) {
      closeReader(false);
    }
  }

  function init() {
    var savedTheme = localStorage.getItem('id_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    renderTicker(); renderNav(); renderHero(); renderSpecial(); renderGrid();
    renderOpinion(); renderDataFeature();
    bind();
    route();
    window.addEventListener('popstate', route);
    window.addEventListener('hashchange', route);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
