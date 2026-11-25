/* ------------------------------------------------------------------
   Kinlo — app logic
   Vanilla JS. State persists in localStorage under kinlo.state.v1.
   ------------------------------------------------------------------ */

(function () {
  "use strict";

  var STORE_KEY = "kinlo.state.v1";
  var MY = { ko: "김", en: "K", ja: "キ" };
  var LOCALE_TAG = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };
  var LANG_CYCLE = ["ko", "en", "ja"];

  /* UI strings introduced with the magazine layout.
     Everything else lives in i18n.js. */
  var UI = {
    ko: {
      tabs: { all: "전체", walk: "산책", meal: "밥상", flower: "풍경", thought: "생각" },
      tabsLong: { all: "전체 보기", walk: "산책·등산", meal: "오늘의 밥상", flower: "꽃·풍경", thought: "소소한 생각" },
      dock: { feed: "피드", clubs: "모임", write: "기록", mine: "내 기록", settings: "설정" },
      storyCount: "오늘의 이야기 {n}편",
      tagline: "걷고, 짓고, 적는 사람들의 오늘. 사진 한 장과 짧은 글.",
      fontToast: "글자 크기 · {v}",
      settingsSub: "글자 크기와 언어는 여기서도 바꿀 수 있어요.",
      myCount: "{n}편",
      clubMeta: "{n}개의 모임 · 마음에 드는 곳부터",
      qNo: "Q · {n}",
      profileKicker: "Profile · 나의 킨로",
      myKicker: "My Kinlo",
      postNo: "이야기 {n}",
      totalNo: "{n}편 중",
      langToast: "언어 · {v}"
    },
    en: {
      tabs: { all: "All", walk: "Walks", meal: "Table", flower: "Scenes", thought: "Thoughts" },
      tabsLong: { all: "Everything", walk: "Walks & hikes", meal: "Today's table", flower: "Flowers & views", thought: "Small thoughts" },
      dock: { feed: "Feed", clubs: "Clubs", write: "Record", mine: "My log", settings: "Settings" },
      storyCount: "{n} stories today",
      tagline: "A photo and a short line from people who walk, cook and write.",
      fontToast: "Text size · {v}",
      settingsSub: "You can also change text size and language here.",
      myCount: "{n} posts",
      clubMeta: "{n} clubs · start where you like",
      qNo: "Q · {n}",
      profileKicker: "Profile · My Kinlo",
      myKicker: "My Kinlo",
      postNo: "Story {n}",
      totalNo: "of {n}",
      langToast: "Language · {v}"
    },
    ja: {
      tabs: { all: "すべて", walk: "散歩", meal: "食卓", flower: "景色", thought: "想い" },
      tabsLong: { all: "すべて見る", walk: "散歩・山歩き", meal: "今日の食卓", flower: "花と景色", thought: "ちょっとした想い" },
      dock: { feed: "フィード", clubs: "集い", write: "記録", mine: "マイ記録", settings: "設定" },
      storyCount: "今日の話 {n}話",
      tagline: "歩き、作り、綴る人たちの今日。写真一枚と短い言葉。",
      fontToast: "文字の大きさ · {v}",
      settingsSub: "文字の大きさと言語はここでも変えられます。",
      myCount: "{n}件",
      clubMeta: "{n}の集い · 気になるものから",
      qNo: "Q · {n}",
      profileKicker: "Profile · 私のキンロ",
      myKicker: "My Kinlo",
      postNo: "話 {n}",
      totalNo: "{n}件中",
      langToast: "言語 · {v}"
    }
  };

  /* ---------------- state ---------------- */
  var defaults = {
    lang: "ko",
    font: 0,
    filter: "all",
    reactions: {},   // postId -> {0:true,...}
    comments: {},    // postId -> [{author,text}]
    myPosts: [],     // [{id,cat,img,text,ts,counts}]
    answer: null,    // {text,ts,counts:[]}
    clubs: {},       // clubId -> true
    draft: { text: "", cat: "thought", photo: null }
  };

  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaults));
      var saved = JSON.parse(raw);
      var s = JSON.parse(JSON.stringify(defaults));
      Object.keys(s).forEach(function (k) {
        if (saved[k] !== undefined && saved[k] !== null) s[k] = saved[k];
      });
      if (LOCALES.indexOf(s.lang) < 0) s.lang = "ko";
      if (!(s.font >= 0 && s.font <= 2)) s.font = 0;
      if (!s.draft) s.draft = { text: "", cat: "thought", photo: null };
      return s;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------------- helpers ---------------- */
  function t(path) {
    var node = I18N[state.lang];
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      node = node && node[parts[i]];
    }
    return node === undefined ? path : node;
  }

  function ui(path) {
    var node = UI[state.lang] || UI.ko;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      node = node && node[parts[i]];
    }
    return node === undefined ? path : node;
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function myName() {
    return { ko: "김 선생님", en: "Mr. Kim", ja: "キムさん" }[state.lang];
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function isoWeek(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  var openComments = {};
  var toastTimer = null;
  var currentTab = "feed";

  function toast(msg) {
    var box = $("#toast");
    box.textContent = msg;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove("show"); }, 2200);
  }

  /* ---------------- chrome ---------------- */
  function applyStatic() {
    document.title = t("title");
    document.documentElement.lang = I18N[state.lang].htmlLang;
    document.documentElement.setAttribute("data-fs", String(state.font));

    $$("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    $$("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    $$("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
    $$("[data-ui]").forEach(function (el) {
      el.textContent = ui(el.getAttribute("data-ui"));
    });

    $("#langLabel").textContent = state.lang.toUpperCase();
    $("#langBtn").setAttribute("aria-label", t("mine.language") + " · " + state.lang.toUpperCase());
    $("#fontBtn").setAttribute("aria-label", t("ui.fontLabel") + " · " + t("ui." + ["fontSmall", "fontLarge", "fontXLarge"][state.font]));
    $("#dockMic").setAttribute("aria-label", t("write.voice"));
    $("#settingsSub").textContent = ui("settingsSub");

    renderMasthead();
    renderTabs();
    renderQuestion();
    renderFeed();
    renderClubs();
    renderMine();
    renderSettings();
    syncControls();
    renderWriteControls();
  }

  function renderMasthead() {
    var now = new Date();
    $("#feedDate").innerHTML = pad(now.getMonth() + 1) + "<i>.</i>" + pad(now.getDate());
    $("#feedWeek").textContent = new Intl.DateTimeFormat(LOCALE_TAG[state.lang], {
      month: "long", day: "numeric", weekday: "long"
    }).format(now).replace(/\s/g, " ");
    var total = myItems().length + I18N[state.lang].posts.length;
    $("#feedCount").textContent = ui("storyCount").replace("{n}", total);
    $("#issueNo").textContent = "ISSUE " + pad(isoWeek(now)) + " · " + pad(now.getFullYear()).slice(2);
    $("#mastTag").textContent = ui("tagline");
  }

  function renderTabs() {
    var keys = ["all", "walk", "meal", "flower", "thought"];
    $("#tabs").innerHTML = keys.map(function (k) {
      var on = state.filter === k;
      return '<button type="button" class="tab' + (on ? " on" : "") + '" role="tab" data-filter="' + k +
        '" aria-selected="' + on + '" aria-label="' + esc(ui("tabsLong." + k)) + '">' +
        esc(ui("tabs." + k)) + "</button>";
    }).join("");
  }

  function syncControls() {
    $$("[data-font]").forEach(function (b) {
      var on = Number(b.getAttribute("data-font")) === state.font;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$("[data-lang]").forEach(function (b) {
      var on = b.getAttribute("data-lang") === state.lang;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$("#fontBars i").forEach(function (bar, i) {
      bar.classList.toggle("on", i <= state.font);
    });
    $$(".tab", $("#tabs")).forEach(function (b) {
      var on = b.getAttribute("data-filter") === state.filter;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".dock-b").forEach(function (b) {
      var on = b.getAttribute("data-tab") === currentTab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  /* ---------------- feed ---------------- */
  function renderQuestion() {
    var box = $("#questionCard");
    var q = t("feed.question");

    if (state.answer) {
      box.innerHTML =
        '<section class="question answered">' +
          '<div class="q-top">' +
            '<p class="q-label">' + esc(q.label) + "</p>" +
            '<span class="q-no">' + esc(ui("qNo").replace("{n}", pad(new Date().getDate()))) + "</span>" +
          "</div>" +
          '<p class="q-text">' + esc(q.q) + "</p>" +
          '<div class="q-answered">' +
            '<span class="q-answer-label">' + esc(q.yours) + "</span>" +
            "<p>" + esc(state.answer.text) + "</p>" +
          "</div>" +
          '<button type="button" class="q-edit" id="qEdit">' + esc(q.edit) + "</button>" +
        "</section>";
      return;
    }

    box.innerHTML =
      '<section class="question">' +
        '<div class="q-top">' +
          '<p class="q-label">' + esc(q.label) + "</p>" +
          '<span class="q-no">' + esc(ui("qNo").replace("{n}", pad(new Date().getDate()))) + "</span>" +
        "</div>" +
        '<p class="q-text">' + esc(q.q) + "</p>" +
        '<div class="q-form">' +
          '<input type="text" id="qInput" maxlength="120" placeholder="' + esc(q.placeholder) + '" aria-label="' + esc(q.label) + '">' +
          '<button type="button" class="q-btn" id="qSend">' + esc(q.submit) + "</button>" +
        "</div>" +
      "</section>";
  }

  function myItems() {
    var lang = state.lang;
    var out = [];
    if (state.answer) {
      out.push({
        id: "answer", type: "answer", cat: "thought", text: state.answer.text,
        author: myName(), initial: MY[lang], ago: t("feed.justNow"), counts: [0, 0, 0], comments: []
      });
    }
    state.myPosts.forEach(function (p) {
      out.push({
        id: p.id, type: "mine", cat: p.cat, img: p.img, text: p.text,
        author: myName(), initial: MY[lang], ago: t("feed.justNow"),
        counts: [0, 0, 0], comments: []
      });
    });
    return out;
  }

  function feedItems() {
    var items = myItems().concat(I18N[state.lang].posts.map(function (p) { return Object.assign({ type: "seed" }, p); }));
    if (state.filter !== "all") {
      items = items.filter(function (i) { return i.cat === state.filter; });
    }
    return items;
  }

  function postCard(item, idx, total) {
    var rx = state.reactions[item.id] || {};
    var all = (item.comments || []).concat(state.comments[item.id] || []);
    var base = item.counts || [0, 0, 0];
    var lang = state.lang;

    var badge = "";
    if (item.type === "mine") badge = '<span class="badge">' + esc(t("feed.mineBadge")) + "</span>";
    if (item.type === "answer") badge = '<span class="badge">' + esc(t("feed.answerBadge")) + "</span>";

    var cat = ui("tabs." + item.cat);
    var ago = item.ago;
    var photo = "";
    if (item.img) {
      var alt = (PHOTO_ALT[lang] && PHOTO_ALT[lang][item.img]) || "";
      photo = '<figure class="post-photo">' +
        '<img src="assets/' + esc(item.img) + '.jpg" alt="' + esc(alt) + '" loading="lazy">' +
        '<figcaption class="photo-idx"><b>' + pad(idx + 1) + "</b><span>/ " + pad(total) + "</span></figcaption>" +
        "</figure>";
    }

    var age = item.type === "seed" ? '<span class="by-age">' + esc(t("feed.age").replace("{n}", item.age)) + "</span>" : "";

    var rxKeys = [["0", "👏", "wow"], ["1", "☕", "with"], ["2", "💐", "cheer"]];
    var rxHtml = rxKeys.map(function (r) {
      var on = !!rx[r[0]];
      var count = (base[Number(r[0])] || 0) + (on ? 1 : 0);
      return '<button type="button" class="rx' + (on ? " on" : "") + '" data-rx="' + r[0] + '" data-id="' +
        esc(item.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t("feed.react." + r[2])) + ' ' + count + '">' +
        '<span class="rx-e" aria-hidden="true">' + r[1] + "</span>" +
        '<span class="rx-l">' + esc(t("feed.react." + r[2])) + "</span>" +
        '<span class="rx-c">' + count + "</span></button>";
    }).join("");

    var cmOpen = !!openComments[item.id];
    var list = all.length
      ? '<ul class="cm-list">' + all.map(function (c) {
          return "<li><strong>" + esc(c.author) + "</strong>" + esc(c.text) + "</li>";
        }).join("") + "</ul>"
      : "";

    return '<article class="post' + (item.img ? "" : " post--text") + '" data-post="' + esc(item.id) + '">' +
      photo +
      '<div class="post-copy">' +
        '<div class="post-head">' +
          '<span class="post-cat">' + esc(cat) + "</span>" +
          '<span class="post-sep" aria-hidden="true"></span>' +
          "<span>" + esc(ago) + "</span>" +
        "</div>" +
        '<p class="post-text">' + esc(item.text) + "</p>" +
        '<div class="post-by">' +
          '<span class="avatar" aria-hidden="true">' + esc(item.initial) + "</span>" +
          "<span><span class=\"by-name\">" + esc(item.author) + "</span>" + age + "</span>" +
          badge +
        "</div>" +
      "</div>" +
      '<div class="post-actions">' + rxHtml + "</div>" +
      '<button type="button" class="cm-toggle" data-cm="' + esc(item.id) + '" aria-expanded="' + cmOpen + '">' +
        esc(t("feed.comment.count")) + ' <b>' + all.length + "</b>" +
        '<svg class="cm-chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      "</button>" +
      '<div class="cm-body"' + (cmOpen ? "" : " hidden") + ">" +
        list +
        '<div class="cm-form">' +
          '<input type="text" maxlength="120" data-cm-input="' + esc(item.id) + '" placeholder="' +
            esc(t("feed.comment.placeholder")) + '" aria-label="' + esc(t("feed.comment.placeholder")) + '">' +
          '<button type="button" class="cm-send" data-cm-send="' + esc(item.id) + '">' +
            esc(t("feed.comment.submit")) + "</button>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function renderFeed() {
    var list = $("#postList");
    var items = feedItems();
    list.innerHTML = items.map(function (item, i) { return postCard(item, i, items.length); }).join("");
    $("#feedEnd").hidden = items.length === 0;
  }

  /* ---------------- clubs ---------------- */
  var CLUB_COVER = { c1: "walk-morning", c2: "home-meal", c3: "balcony-flowers", c4: null };

  function renderClubs() {
    var data = I18N[state.lang].clubs;
    $("#clubMeta").textContent = ui("clubMeta").replace("{n}", data.items.length);
    $("#clubList").innerHTML = data.items.map(function (c, i) {
      var cover = CLUB_COVER[c.id];
      var joined = !!state.clubs[c.id];
      var no = '<span class="tile-no">' + pad(i + 1) + "</span>";
      var top = cover
        ? '<div class="tile-cover"><img src="assets/' + cover + '.jpg" alt="" loading="lazy">' + no + "</div>"
        : '<div class="tile-cover tile-cover--type"><span class="tile-glyph" aria-hidden="true">' + c.icon + "</span>" + no + "</div>";
      return '<article class="club-tile">' +
        top +
        '<button type="button" class="tile-hit" data-notice="' + c.id + '" aria-label="' + esc(c.name + " — " + data.notice) + '"></button>' +
        '<div class="tile-body">' +
          "<h3>" + esc(c.name) + "</h3>" +
          '<p class="tile-meta">' + esc(c.members) + "</p>" +
          '<button type="button" class="tile-join' + (joined ? " joined" : "") + '" data-join="' + c.id +
            '" aria-pressed="' + joined + '">' + esc(joined ? data.joined : data.join) + "</button>" +
        "</div>" +
      "</article>";
    }).join("");
  }

  function openClubModal(id) {
    var data = I18N[state.lang].clubs;
    var c = data.items.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var joined = !!state.clubs[c.id];
    $("#modalBody").innerHTML =
      '<span class="modal-kicker">' + esc(data.title) + "</span>" +
      '<h2 class="modal-title" id="modalTitle">' + esc(c.name) + "</h2>" +
      '<p class="modal-meta">' + esc(c.members) + " · " + esc(c.ago) + "</p>" +
      '<p class="modal-desc">' + esc(c.desc) + "</p>" +
      '<div class="modal-notice">' + c.notice.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
      '<button type="button" class="modal-join' + (joined ? " joined" : "") + '" data-join="' + c.id +
        '" aria-pressed="' + joined + '">' + esc(joined ? data.detailJoined : data.detailJoin) + "</button>";
    openModal();
  }

  /* ---------------- mine ---------------- */
  function renderMine() {
    var m = I18N[state.lang].mine;
    var mine = myItems();
    var cheers = 0;
    mine.forEach(function (p) {
      var rx = state.reactions[p.id] || {};
      cheers += Object.keys(rx).filter(function (k) { return rx[k]; }).length;
    });
    var joinedCount = Object.keys(state.clubs).filter(function (k) { return state.clubs[k]; }).length;

    $("#profileCard").innerHTML =
      '<div class="profile">' +
        '<span class="kicker">' + esc(ui("profileKicker")) + "</span>" +
        '<h1 class="profile-name">' + esc(m.hello) + "</h1>" +
        '<p class="profile-sub">' + esc(m.sub) + "</p>" +
        '<p class="profile-since">' + esc(m.since) + "</p>" +
        '<div class="stats">' +
          '<div class="stat"><strong>' + mine.length + "</strong><span>" + esc(m.statPosts) + "</span></div>" +
          '<div class="stat"><strong>' + cheers + "</strong><span>" + esc(m.statCheers) + "</span></div>" +
          '<div class="stat"><strong>' + joinedCount + "</strong><span>" + esc(m.statClubs) + "</span></div>" +
        "</div>" +
        '<div class="glow">' +
          '<div class="glow-head"><span>' + esc(m.glowLabel) + "</span><b>" + esc(m.glowNote) + "</b></div>" +
          '<div class="glow-val">82<em>' + esc(m.glowUnit) + "</em></div>" +
          '<div class="glow-bar"><i style="width:82%"></i></div>' +
        "</div>" +
      "</div>";

    $("#myCount").textContent = ui("myCount").replace("{n}", mine.length);

    var box = $("#myPosts");
    if (!mine.length) {
      box.innerHTML = '<p class="empty">' + esc(m.empty) + "</p>";
    } else {
      box.innerHTML = mine.map(function (p) {
        var rx = state.reactions[p.id] || {};
        var count = Object.keys(rx).filter(function (k) { return rx[k]; }).length;
        var catName = ui("tabs." + p.cat);
        var thumb = p.img
          ? '<img class="mypost-thumb" src="assets/' + esc(p.img) + '.jpg" alt="" loading="lazy">'
          : "";
        return '<article class="mypost">' +
          '<div class="mypost-main">' +
            '<span class="mypost-cat">' + esc(catName) + "</span>" +
            '<p class="mypost-text">' + esc(p.text) + "</p>" +
            '<p class="mypost-foot">' + esc(p.ago) + " · 👏 " + count + "</p>" +
          "</div>" +
          thumb +
        "</article>";
      }).join("");
    }
  }

  /* ---------------- settings ---------------- */
  function renderSettings() {
    $("#fontRow").innerHTML = [0, 1, 2].map(function (i) {
      return '<button type="button" data-font="' + i + '" class="' + (state.font === i ? "on" : "") +
        '" aria-pressed="' + (state.font === i) + '">' +
        esc(t("ui." + ["fontSmall", "fontLarge", "fontXLarge"][i])) + "</button>";
    }).join("");

    var langName = { ko: "한국어", en: "English", ja: "日本語" };
    $("#langRow").innerHTML = LANG_CYCLE.map(function (code) {
      return '<button type="button" data-lang="' + code + '" class="' + (state.lang === code ? "on" : "") +
        '" aria-pressed="' + (state.lang === code) + '">' + esc(langName[code]) + "</button>";
    }).join("");
  }

  /* ---------------- write studio ---------------- */
  function renderWriteControls() {
    var cats = ["walk", "meal", "flower", "thought"];
    $("#writeChips").innerHTML = cats.map(function (k) {
      return '<button type="button" class="topic' + (state.draft.cat === k ? " on" : "") +
        '" data-wcat="' + k + '" aria-pressed="' + (state.draft.cat === k) + '">' +
        esc(t("feed.chips." + k)) + "</button>";
    }).join("");

    renderPhotoRow();
    $("#writeText").value = state.draft.text || "";
    $("#voiceStatus").textContent = t("write.voiceHint");
    $("#voiceText").textContent = t("write.voice");
    $("#voiceDemo").textContent = t("write.demo");
  }

  function renderPhotoRow() {
    var row = $("#photoRow");
    var noneSelected = !state.draft.photo;
    var html = '<button type="button" class="photo none' + (noneSelected ? " on" : "") +
      '" data-photo="" aria-pressed="' + noneSelected + '"><span>' + esc(t("write.noPhoto")) + "</span></button>";
    html += PHOTOS.map(function (p) {
      var on = state.draft.photo === p.key;
      var alt = PHOTO_ALT[state.lang][p.key];
      return '<button type="button" class="photo' + (on ? " on" : "") + '" data-photo="' + p.key +
        '" aria-pressed="' + on + '" aria-label="' + esc(alt) + '"><img src="' + p.file + '" alt="' + esc(alt) + '"></button>';
    }).join("");
    row.innerHTML = html;
  }

  function openWrite() {
    renderWriteControls();
    $("#writeWrap").classList.add("open");
    $("#writeWrap").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
  }

  function closeWrite() {
    stopVoice(true);
    state.draft.text = $("#writeText").value;
    save();
    $("#writeWrap").classList.remove("open");
    $("#writeWrap").setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    setVoiceIdle();
  }

  function submitPost() {
    var text = $("#writeText").value.trim();
    if (!text) { toast(t("write.needText")); $("#writeText").focus(); return; }
    var post = {
      id: "m" + Date.now(),
      cat: state.draft.cat || "thought",
      img: state.draft.photo || null,
      text: text,
      ts: Date.now()
    };
    state.myPosts.unshift(post);
    state.draft = { text: "", cat: "thought", photo: null };
    state.filter = "all";
    $("#writeText").value = "";
    save();
    closeWrite();
    switchTab("feed", true);
    renderFeed();
    renderMine();
    syncControls();
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast(t("write.posted"));
  }

  /* ---------------- voice ---------------- */
  var rec = null;
  var voiceSession = 0;
  var voiceTimer = null;
  var demoInterval = null;

  function setWave(on) {
    $("#wave").classList.toggle("on", !!on);
    $("#micStage").classList.toggle("live", !!on);
  }

  function setVoiceIdle() {
    setWave(false);
    $("#voiceText").textContent = t("write.voice");
  }

  function setVoiceListening() {
    setWave(true);
    $("#voiceText").textContent = t("write.stop");
    $("#voiceStatus").textContent = t("write.listening");
  }

  function stopVoice(silent) {
    voiceSession++;
    clearTimeout(voiceTimer);
    if (demoInterval) { clearInterval(demoInterval); demoInterval = null; }
    if (rec) { try { rec.abort(); } catch (e) {} rec = null; }
    setVoiceIdle();
    if (!silent) $("#voiceStatus").textContent = t("write.voiceHint");
  }

  function typeInto(text, done) {
    var ta = $("#writeText");
    var base = ta.value.trim();
    var i = 0;
    voiceSession++;
    var mySession = voiceSession;
    setWave(true);
    $("#voiceText").textContent = t("write.stop");
    $("#voiceStatus").textContent = t("write.demoOn");
    demoInterval = setInterval(function () {
      if (mySession !== voiceSession) { clearInterval(demoInterval); demoInterval = null; return; }
      i += 1;
      ta.value = (base ? base + " " : "") + text.slice(0, i);
      ta.scrollTop = ta.scrollHeight;
      if (i >= text.length) {
        clearInterval(demoInterval);
        demoInterval = null;
        setVoiceIdle();
        $("#voiceStatus").textContent = done || t("write.demoDone");
        state.draft.text = ta.value;
        save();
      }
    }, 45);
  }

  function runDemo(note) {
    var mySession = ++voiceSession;
    if (rec) { try { rec.abort(); } catch (e) {} rec = null; }
    setTimeout(function () {
      if (mySession !== voiceSession) return;
      typeInto(t("write.demoText"), note);
    }, 350);
  }

  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { runDemo(t("write.denied")); return; }

    stopVoice(true);
    var mySession = voiceSession;
    var got = false;
    var base = $("#writeText").value.trim();

    try {
      rec = new SR();
      rec.lang = SPEECH_LANG[state.lang];
      rec.interimResults = true;
      rec.continuous = false;

      rec.onstart = function () {
        if (mySession !== voiceSession) return;
        setVoiceListening();
      };
      rec.onresult = function (e) {
        if (mySession !== voiceSession) return;
        got = true;
        clearTimeout(voiceTimer);
        var text = "";
        for (var i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        var ta = $("#writeText");
        ta.value = (base ? base + " " : "") + text;
        $("#voiceStatus").textContent = t("write.listening");
      };
      rec.onerror = function () {
        if (mySession !== voiceSession) return;
        runDemo(t("write.denied"));
      };
      rec.onend = function () {
        if (mySession !== voiceSession) return;
        if (got) {
          rec = null;
          setVoiceIdle();
          $("#voiceStatus").textContent = t("write.done");
          state.draft.text = $("#writeText").value;
          save();
        } else {
          runDemo(t("write.denied"));
        }
      };

      rec.start();
      setVoiceListening();
      voiceTimer = setTimeout(function () {
        if (mySession === voiceSession && !got) {
          try { rec && rec.abort(); } catch (e) {}
          runDemo(t("write.denied"));
        }
      }, 4000);
    } catch (e) {
      runDemo(t("write.denied"));
    }
  }

  function onVoiceClick() {
    var listening = $("#micStage").classList.contains("live");
    if (listening) {
      stopVoice(true);
      $("#voiceStatus").textContent = t("write.voiceHint");
      return;
    }
    startVoice();
  }

  /* ---------------- modal / tabs ---------------- */
  function openModal() {
    $("#modalWrap").classList.add("open");
    $("#modalWrap").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
  }

  function closeModal() {
    $("#modalWrap").classList.remove("open");
    $("#modalWrap").setAttribute("aria-hidden", "true");
    if (!$("#writeWrap").classList.contains("open")) document.body.classList.remove("lock");
  }

  function switchTab(tab, keepScroll) {
    currentTab = tab;
    $$(".view").forEach(function (v) { v.hidden = v.id !== "view-" + tab; });
    syncControls();
    if (!keepScroll) window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- language / font ---------------- */
  function setLang(lang) {
    if (LOCALES.indexOf(lang) < 0) return;
    stopVoice(true);
    state.lang = lang;
    save();
    applyStatic();
    switchTab(currentTab, true);
    toast(ui("langToast").replace("{v}", { ko: "한국어", en: "English", ja: "日本語" }[lang]));
  }

  function cycleLang() {
    var i = LANG_CYCLE.indexOf(state.lang);
    setLang(LANG_CYCLE[(i + 1) % LANG_CYCLE.length]);
  }

  function setFont(n) {
    state.font = Number(n);
    if (!(state.font >= 0 && state.font <= 2)) state.font = 0;
    document.documentElement.style.setProperty("--fs", FONT_SCALES[state.font]);
    document.documentElement.setAttribute("data-fs", String(state.font));
    save();
    syncControls();
    toast(ui("fontToast").replace("{v}", t("ui." + ["fontSmall", "fontLarge", "fontXLarge"][state.font])));
  }

  function cycleFont() {
    setFont((state.font + 1) % 3);
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest(
      "[data-filter],[data-wcat],[data-rx],[data-cm],[data-cm-send],[data-join],[data-notice],[data-photo]," +
      "[data-close-write],[data-close-modal],#langBtn,#fontBtn,#dockMic,#voiceBtn,#voiceDemo,#qSend,#qEdit,#submitPost,[data-tab]," +
      "#langRow [data-lang],#fontRow [data-font]"
    ) : null;
    if (!el) return;

    /* dock tabs */
    if (el.hasAttribute("data-tab")) { switchTab(el.getAttribute("data-tab")); return; }

    /* language / font */
    if (el.id === "langBtn") { cycleLang(); return; }
    if (el.id === "fontBtn") { cycleFont(); return; }
    if (el.hasAttribute("data-lang")) { setLang(el.getAttribute("data-lang")); return; }
    if (el.hasAttribute("data-font") && el.closest("#fontRow")) { setFont(el.getAttribute("data-font")); return; }

    /* filters */
    if (el.hasAttribute("data-filter")) {
      state.filter = el.getAttribute("data-filter");
      save();
      renderTabs();
      renderFeed();
      syncControls();
      return;
    }
    if (el.hasAttribute("data-wcat")) {
      state.draft.cat = el.getAttribute("data-wcat");
      save();
      renderWriteControls();
      return;
    }
    if (el.hasAttribute("data-photo")) {
      var key = el.getAttribute("data-photo");
      state.draft.photo = key || null;
      save();
      renderPhotoRow();
      return;
    }

    /* reactions */
    if (el.hasAttribute("data-rx")) {
      var pid = el.getAttribute("data-id");
      var ridx = el.getAttribute("data-rx");
      var map = state.reactions[pid] || {};
      map[ridx] = !map[ridx];
      state.reactions[pid] = map;
      save();
      var item = feedItems().filter(function (x) { return x.id === pid; })[0];
      var base = item && item.counts ? item.counts[Number(ridx)] || 0 : 0;
      el.classList.toggle("on", !!map[ridx]);
      el.setAttribute("aria-pressed", !!map[ridx]);
      $(".rx-c", el).textContent = base + (map[ridx] ? 1 : 0);
      if (pid === "answer" || pid.indexOf("m") === 0) renderMine();
      return;
    }

    /* comments */
    if (el.hasAttribute("data-cm")) {
      var cid = el.getAttribute("data-cm");
      openComments[cid] = !openComments[cid];
      var body = el.parentNode.querySelector(".cm-body");
      body.hidden = !openComments[cid];
      el.setAttribute("aria-expanded", openComments[cid] ? "true" : "false");
      return;
    }
    if (el.hasAttribute("data-cm-send")) {
      sendComment(el.getAttribute("data-cm-send"));
      return;
    }

    /* clubs */
    if (el.hasAttribute("data-join")) {
      var id = el.getAttribute("data-join");
      state.clubs[id] = !state.clubs[id];
      save();
      renderClubs();
      renderMine();
      var stillOpen = $("#modalWrap").classList.contains("open");
      if (stillOpen) {
        var jb = $("#modalBody .modal-join");
        if (jb) {
          var cdata = I18N[state.lang].clubs;
          jb.classList.toggle("joined", !!state.clubs[id]);
          jb.setAttribute("aria-pressed", !!state.clubs[id]);
          jb.textContent = state.clubs[id] ? cdata.detailJoined : cdata.detailJoin;
        }
      }
      toast(state.clubs[id] ? t("clubs.joinedToast") : t("clubs.leftToast"));
      return;
    }
    if (el.hasAttribute("data-notice")) { openClubModal(el.getAttribute("data-notice")); return; }

    /* write studio */
    if (el.id === "dockMic") { openWrite(); return; }
    if (el.hasAttribute("data-close-write")) { closeWrite(); return; }
    if (el.hasAttribute("data-close-modal")) { closeModal(); return; }
    if (el.id === "voiceBtn") { onVoiceClick(); return; }
    if (el.id === "voiceDemo") { runDemo(t("write.demoDone")); return; }
    if (el.id === "submitPost") { submitPost(); return; }

    /* question */
    if (el.id === "qSend") {
      var input = $("#qInput");
      var val = input.value.trim();
      if (!val) { input.focus(); return; }
      state.answer = { text: val, ts: Date.now(), counts: [0, 0, 0] };
      save();
      renderQuestion();
      renderFeed();
      renderMine();
      renderMasthead();
      toast(t("feed.question.posted"));
      return;
    }
    if (el.id === "qEdit") {
      state.answer = null;
      save();
      renderQuestion();
      renderFeed();
      renderMine();
      renderMasthead();
      var qi = $("#qInput");
      if (qi) qi.focus();
      return;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if ($("#modalWrap").classList.contains("open")) closeModal();
      else if ($("#writeWrap").classList.contains("open")) closeWrite();
    }
    if (e.key === "Enter" && e.target.id === "qInput") {
      e.preventDefault();
      var btn = $("#qSend");
      if (btn) btn.click();
    }
    if (e.key === "Enter" && e.target.hasAttribute && e.target.hasAttribute("data-cm-input")) {
      e.preventDefault();
      sendComment(e.target.getAttribute("data-cm-input"));
    }
  });

  function sendComment(pid) {
    var input = document.querySelector('[data-cm-input="' + pid + '"]');
    if (!input) return;
    var val = input.value.trim();
    if (!val) { input.focus(); return; }
    state.comments[pid] = state.comments[pid] || [];
    state.comments[pid].push({ author: myName(), text: val });
    save();
    openComments[pid] = true;
    var y = window.scrollY;
    renderFeed();
    window.scrollTo(0, y);
    var again = document.querySelector('[data-cm-input="' + pid + '"]');
    if (again) again.focus();
    renderMine();
    toast(t("feed.comment.added"));
  }

  /* ---------------- boot ---------------- */
  document.documentElement.style.setProperty("--fs", FONT_SCALES[state.font]);
  applyStatic();
  switchTab("feed", true);

  $("#writeText").addEventListener("input", function () {
    state.draft.text = this.value;
    save();
  });
})();
