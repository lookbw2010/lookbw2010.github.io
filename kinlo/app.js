/* ------------------------------------------------------------------
   Kinlo — app logic
   Vanilla JS. State persists in localStorage under kinlo.state.v1.
   ------------------------------------------------------------------ */

(function () {
  "use strict";

  var STORE_KEY = "kinlo.state.v1";
  var MY = { ko: "김", en: "K", ja: "キ" };
  var LOCALE_TAG = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

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

  var openComments = {};
  var toastTimer = null;

  function toast(msg) {
    var box = $("#toast");
    box.textContent = msg;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove("show"); }, 2400);
  }

  /* ---------------- static chrome ---------------- */
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

    $("#feedDate").textContent = new Intl.DateTimeFormat(LOCALE_TAG[state.lang], {
      month: "long", day: "numeric", weekday: "long"
    }).format(new Date());

    syncButtons();
    renderFeed();
    renderClubs();
    renderMine();
    renderWriteControls();
  }

  function syncButtons() {
    $$("[data-font]").forEach(function (b) {
      b.classList.toggle("on", Number(b.getAttribute("data-font")) === state.font);
      b.setAttribute("aria-pressed", Number(b.getAttribute("data-font")) === state.font ? "true" : "false");
    });
    $$("[data-lang]").forEach(function (b) {
      var on = b.getAttribute("data-lang") === state.lang;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---------------- feed ---------------- */
  function chipKeys() { return ["all", "walk", "meal", "flower", "thought"]; }

  function renderChips() {
    var box = $("#chips");
    box.innerHTML = chipKeys().map(function (k) {
      return '<button type="button" class="chip' + (state.filter === k ? " on" : "") +
        '" data-filter="' + k + '" aria-pressed="' + (state.filter === k) + '">' +
        esc(t("feed.chips." + k)) + "</button>";
    }).join("");

    var w = $("#writeChips");
    var cats = ["walk", "meal", "flower", "thought"];
    w.innerHTML = cats.map(function (k) {
      return '<button type="button" class="chip' + (state.draft.cat === k ? " on" : "") +
        '" data-wcat="' + k + '" aria-pressed="' + (state.draft.cat === k) + '">' +
        esc(t("feed.chips." + k)) + "</button>";
    }).join("");
  }

  function renderQuestion() {
    var box = $("#questionCard");
    var q = t("feed.question");

    if (state.answer) {
      box.innerHTML =
        '<section class="question answered">' +
          '<p class="q-label">' + esc(q.label) + "</p>" +
          '<p class="q-text">' + esc(q.q) + "</p>" +
          '<div class="q-answer">' +
            '<span class="q-answer-label">' + esc(q.yours) + "</span>" +
            '<p class="q-answer-text">' + esc(state.answer.text) + "</p>" +
          "</div>" +
          '<button type="button" class="q-edit" data-qedit>' + esc(q.edit) + "</button>" +
        "</section>";
      return;
    }

    box.innerHTML =
      '<section class="question">' +
        '<p class="q-label">' + esc(q.label) + "</p>" +
        '<p class="q-text">' + esc(q.q) + "</p>" +
        '<div class="q-form">' +
          '<input type="text" id="qInput" maxlength="120" placeholder="' + esc(q.placeholder) + '" aria-label="' + esc(q.label) + '">' +
          '<button type="button" class="q-btn" id="qSend">' + esc(q.cta) + "</button>" +
        "</div>" +
      "</section>";
  }

  function seedPosts() {
    return I18N[state.lang].posts;
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
    var items = myItems().concat(seedPosts().map(function (p) { return Object.assign({ type: "seed" }, p); }));
    if (state.filter !== "all") {
      items = items.filter(function (i) { return i.cat === state.filter; });
    }
    return items;
  }

  function postCard(item) {
    var rx = state.reactions[item.id] || {};
    var all = (item.comments || []).concat(state.comments[item.id] || []);
    var base = item.counts || [0, 0, 0];
    var lang = state.lang;

    var badge = "";
    if (item.type === "mine") badge = '<span class="badge">' + esc(t("feed.mineBadge")) + "</span>";
    if (item.type === "answer") badge = '<span class="badge terra">' + esc(t("feed.answerBadge")) + "</span>";

    var meta = item.type === "seed"
      ? esc(t("feed.age").replace("{n}", item.age)) + " · " + esc(item.ago)
      : esc(item.ago);

    var img = "";
    if (item.img) {
      var alt = (PHOTO_ALT[lang] && PHOTO_ALT[lang][item.img]) || "";
      img = '<div class="post-img"><img src="assets/' + esc(item.img) + '.jpg" alt="' + esc(alt) +
        '" loading="lazy"></div>';
    }

    var rxKeys = [["0", "👏", "wow"], ["1", "☕", "with"], ["2", "💐", "cheer"]];
    var rxHtml = rxKeys.map(function (r) {
      var on = !!rx[r[0]];
      var count = (base[Number(r[0])] || 0) + (on ? 1 : 0);
      return '<button type="button" class="rx' + (on ? " on" : "") + '" data-rx="' + r[0] + '" data-id="' +
        esc(item.id) + '" aria-pressed="' + on + '">' +
        '<span class="rx-e" aria-hidden="true">' + r[1] + "</span>" +
        '<span class="rx-l">' + esc(t("feed.react." + r[2])) + "</span>" +
        '<span class="rx-c">' + count + "</span></button>";
    }).join("");

    var cmOpen = !!openComments[item.id];
    var list = all.length
      ? '<ul class="cm-list">' + all.map(function (c) {
          return "<li><strong>" + esc(c.author) + "</strong> " + esc(c.text) + "</li>";
        }).join("") + "</ul>"
      : '<p class="cm-empty"></p>';

    return '<article class="post" data-post="' + esc(item.id) + '">' +
      '<header class="post-head">' +
        '<div class="avatar" aria-hidden="true">' + esc(item.initial) + "</div>" +
        '<div class="post-who">' +
          '<div class="post-name">' + esc(item.author) + badge + "</div>" +
          '<div class="post-meta">' + meta + "</div>" +
        "</div>" +
      "</header>" +
      '<p class="post-text">' + esc(item.text) + "</p>" +
      img +
      '<div class="rx-row">' + rxHtml + "</div>" +
      '<div class="cm">' +
        '<button type="button" class="cm-toggle" data-cm="' + esc(item.id) + '" aria-expanded="' + cmOpen + '">' +
          esc(t("feed.comment.count")) + " " + all.length +
          '<svg viewBox="0 0 24 24" aria-hidden="true" class="cm-chev' + (cmOpen ? " up" : "") + '"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button>" +
        '<div class="cm-body"' + (cmOpen ? "" : " hidden") + ">" +
          list +
          '<div class="cm-form">' +
            '<input type="text" maxlength="120" data-cm-input="' + esc(item.id) + '" placeholder="' +
              esc(t("feed.comment.placeholder")) + '" aria-label="' + esc(t("feed.comment.count")) + '">' +
            '<button type="button" class="cm-send" data-cm-send="' + esc(item.id) + '">' +
              esc(t("feed.comment.submit")) + "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function renderFeed() {
    renderChips();
    renderQuestion();
    var list = $("#postList");
    var items = feedItems();
    list.innerHTML = items.map(postCard).join("");
    $("#feedEnd").hidden = items.length === 0;
  }

  /* ---------------- clubs ---------------- */
  function renderClubs() {
    var data = I18N[state.lang].clubs;
    $("#clubList").innerHTML = data.items.map(function (c) {
      var joined = !!state.clubs[c.id];
      return '<article class="club">' +
        '<div class="club-top">' +
          '<div class="club-icon tint-' + c.tint + '" aria-hidden="true">' + c.icon + "</div>" +
          '<div class="club-copy"><h3>' + esc(c.name) + "</h3><p>" + esc(c.desc) + "</p></div>" +
        "</div>" +
        '<div class="club-meta"><span class="club-members">' + esc(c.members) + "</span>" +
          '<span class="dot" aria-hidden="true">·</span><span>' + esc(c.ago) + "</span></div>" +
        '<div class="club-actions">' +
          '<button type="button" class="join' + (joined ? " joined" : "") + '" data-join="' + c.id + '" aria-pressed="' + joined + '">' +
            esc(joined ? data.joined : data.join) + "</button>" +
          '<button type="button" class="ghost" data-notice="' + c.id + '">' + esc(data.notice) + "</button>" +
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
      '<div class="club-icon big tint-' + c.tint + '" aria-hidden="true">' + c.icon + "</div>" +
      '<h2 class="modal-title" id="modalTitle">' + esc(c.name) + "</h2>" +
      '<p class="modal-meta">' + esc(c.members) + " · " + esc(c.ago) + "</p>" +
      '<p class="modal-desc">' + esc(c.desc) + "</p>" +
      '<div class="modal-notice">' + c.notice.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
      '<button type="button" class="btn-primary modal-join' + (joined ? " joined" : "") + '" data-join="' + c.id + '" aria-pressed="' + joined + '">' +
        esc(joined ? data.detailJoined : data.detailJoin) + "</button>";
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
      '<section class="profile-card">' +
        '<div class="profile-top">' +
          '<div class="avatar xl" aria-hidden="true">' + esc(MY[state.lang]) + "</div>" +
          "<div>" +
            '<h1 class="profile-name">' + esc(m.hello) + "</h1>" +
            '<p class="profile-sub">' + esc(m.sub) + "</p>" +
            '<p class="profile-since">' + esc(m.since) + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="glow">' +
          "<div>" +
            '<span class="glow-label">' + esc(m.glowLabel) + "</span>" +
            '<span class="glow-note">' + esc(m.glowNote) + "</span>" +
          "</div>" +
          '<div class="glow-value">82<em>' + esc(m.glowUnit) + "</em></div>" +
        "</div>" +
        '<div class="stats">' +
          "<div><strong>" + mine.length + "</strong><span>" + esc(m.statPosts) + "</span></div>" +
          "<div><strong>" + cheers + "</strong><span>" + esc(m.statCheers) + "</span></div>" +
          "<div><strong>" + joinedCount + "</strong><span>" + esc(m.statClubs) + "</span></div>" +
        "</div>" +
      "</section>";

    var box = $("#myPosts");
    if (!mine.length) {
      box.innerHTML = '<p class="empty">' + esc(m.empty) + "</p>";
    } else {
      box.innerHTML = mine.map(function (p) {
        var rx = state.reactions[p.id] || {};
        var count = Object.keys(rx).filter(function (k) { return rx[k]; }).length;
        var catName = t("feed.chips." + p.cat);
        return '<article class="mini-post">' +
          '<div class="mini-meta"><span class="badge mini">' + esc(catName) + "</span><span>" + esc(p.ago) + "</span></div>" +
          '<p class="mini-text">' + esc(p.text) + "</p>" +
          '<div class="mini-foot">👏 ' + count + "</div>" +
        "</article>";
      }).join("");
    }
  }

  /* ---------------- write sheet ---------------- */
  function renderWriteControls() {
    renderChips();
    renderPhotoRow();
    $("#writeText").value = state.draft.text || "";
    $("#voiceStatus").textContent = t("write.voiceHint");
    $("#voiceText").textContent = t("write.voice");
    $("#voiceDemo").textContent = t("write.demo");
  }

  function renderPhotoRow() {
    var row = $("#photoRow");
    var noneSelected = !state.draft.photo;
    var html = '<button type="button" class="photo-tile none' + (noneSelected ? " on" : "") +
      '" data-photo="" aria-pressed="' + noneSelected + '"><span>' + esc(t("write.noPhoto")) + "</span></button>";
    html += PHOTOS.map(function (p) {
      var on = state.draft.photo === p.key;
      return '<button type="button" class="photo-tile' + (on ? " on" : "") + '" data-photo="' + p.key +
        '" aria-pressed="' + on + '" aria-label="' + esc(PHOTO_ALT[state.lang][p.key]) + '"><img src="' + p.file + '" alt="' + esc(PHOTO_ALT[state.lang][p.key]) + '"></button>';
    }).join("");
    row.innerHTML = html;
  }

  function openWrite() {
    renderWriteControls();
    $("#writeText").value = state.draft.text || "";
    $("#writeWrap").classList.add("open");
    $("#writeWrap").setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    setTimeout(function () { $("#writeText").focus(); }, 250);
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
    $("#writeText").value = "";
    save();
    closeWrite();
    switchTab("feed");
    state.filter = "all";
    save();
    renderFeed();
    renderMine();
    $("#chips").scrollIntoView({ block: "start", behavior: "smooth" });
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
    $("#voiceBox").classList.toggle("live", !!on);
  }

  function setVoiceIdle() {
    setWave(false);
    $("#voiceText").textContent = t("write.voice");
    $("#voiceBtn").classList.remove("stop");
  }

  function setVoiceListening() {
    setWave(true);
    $("#voiceText").textContent = t("write.stop");
    $("#voiceBtn").classList.add("stop");
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
    $("#voiceBtn").classList.add("stop");
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
    var listening = $("#voiceBox").classList.contains("live") || $("#voiceBtn").classList.contains("stop");
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

  var currentTab = "feed";

  function switchTab(tab) {
    currentTab = tab;
    $$(".view", document).forEach(function (v) { v.hidden = v.id !== "view-" + tab; });
    $$(".tab").forEach(function (b) {
      var on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-filter],[data-wcat],[data-rx],[data-cm],[data-cm-send],[data-join],[data-notice],[data-photo],[data-close-write],[data-close-modal],#fab,#voiceBtn,#voiceDemo,#voiceStop,#qSend,#qEdit,#submitPost,[data-tab],#langSwitch [data-lang],#langSwitch2 [data-lang],[data-font]") : null;
    if (!el) return;

    /* tabs */
    if (el.hasAttribute("data-tab")) { switchTab(el.getAttribute("data-tab")); return; }

    /* language */
    if (el.hasAttribute("data-lang")) {
      setLang(el.getAttribute("data-lang"));
      return;
    }

    /* font */
    if (el.hasAttribute("data-font")) {
      state.font = Number(el.getAttribute("data-font"));
      document.documentElement.style.setProperty("--fs", FONT_SCALES[state.font]);
      document.documentElement.setAttribute("data-fs", String(state.font));
      save();
      syncButtons();
      return;
    }

    /* filters */
    if (el.hasAttribute("data-filter")) {
      state.filter = el.getAttribute("data-filter");
      save();
      renderFeed();
      return;
    }
    if (el.hasAttribute("data-wcat")) {
      state.draft.cat = el.getAttribute("data-wcat");
      save();
      renderChips();
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
      var idx = el.getAttribute("data-rx");
      var map = state.reactions[pid] || {};
      map[idx] = !map[idx];
      state.reactions[pid] = map;
      save();
      var item = feedItems().filter(function (x) { return x.id === pid; })[0];
      var base = item && item.counts ? item.counts[Number(idx)] || 0 : 0;
      el.classList.toggle("on", !!map[idx]);
      el.setAttribute("aria-pressed", !!map[idx]);
      $(".rx-c", el).textContent = base + (map[idx] ? 1 : 0);
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
      $(".cm-chev", el).classList.toggle("up", !!openComments[cid]);
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
      var stillOpen = $("#modalWrap").classList.contains("open");
      if (stillOpen) {
        var body2 = $("#modalBody");
        var jb = body2.querySelector(".modal-join");
        if (jb) {
          var data = I18N[state.lang].clubs;
          jb.classList.toggle("joined", !!state.clubs[id]);
          jb.setAttribute("aria-pressed", !!state.clubs[id]);
          jb.textContent = state.clubs[id] ? data.detailJoined : data.detailJoin;
        }
      }
      renderMine();
      toast(state.clubs[id] ? t("clubs.joinedToast") : t("clubs.leftToast"));
      return;
    }
    if (el.hasAttribute("data-notice")) { openClubModal(el.getAttribute("data-notice")); return; }

    /* write sheet */
    if (el.id === "fab") { openWrite(); return; }
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
      renderFeed();
      renderMine();
      toast(t("feed.question.posted"));
      return;
    }
    if (el.id === "qEdit") {
      state.answer = null;
      save();
      renderFeed();
      renderMine();
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
    toast(t("feed.comment.added"));
  }

  /* ---------------- language ---------------- */
  function setLang(lang) {
    if (LOCALES.indexOf(lang) < 0) return;
    stopVoice(true);
    state.lang = lang;
    save();
    applyStatic();
    if (currentTab) switchTab(currentTab);
  }

  /* ---------------- boot ---------------- */
  document.documentElement.style.setProperty("--fs", FONT_SCALES[state.font]);
  applyStatic();
  switchTab("feed");

  // textarea mirror into draft so a reload keeps half-written words
  $("#writeText").addEventListener("input", function () {
    state.draft.text = this.value;
    save();
  });
})();
