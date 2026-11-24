/* ══════════════════════════════════════════════════════════
   빅넘버월드 V2 · core.js — 공통 유틸과 네임스페이스
   ══════════════════════════════════════════════════════════ */
window.BNW = window.BNW || {};
(function (BNW) {
  'use strict';

  BNW.version = '2.0.0';
  BNW.LVS = { 1: '입문', 2: '중수', 3: '고수', 4: '오타쿠' };
  BNW.SHARE_URL = 'https://lookbw2010.github.io/bignumber-world-v2/';

  var util = {};

  util.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  util.fmt = function (v, unit) {
    if (v == null || !isFinite(v)) return '—';
    var r = Math.round(v * 1000) / 1000;
    if (unit === '년') return String(r);
    if (Number.isInteger(r)) return r.toLocaleString('ko-KR');
    if (Math.abs(r) < 1) return String(Number(r.toFixed(3)));
    return r.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  };

  util.number = function (n) {
    return Number(n || 0).toLocaleString('ko-KR');
  };

  util.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* 날짜 문자열 시드 난수 — 오늘의 문제를 모두에게 동일하게 */
  util.seeded = function (seedStr) {
    var seed = 0;
    for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 2147483647;
    return function () {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  };

  util.pickSeed = function (arr, k, rnd) {
    var a = arr.slice(), out = [];
    while (out.length < k && a.length) {
      var j = Math.floor((rnd || Math.random)() * a.length);
      out.push(a.splice(j, 1)[0]);
    }
    return out;
  };

  util.todayKey = function (d) {
    d = d || new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };

  util.todayLabel = function (d) {
    d = d || new Date();
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + days[d.getDay()] + ')';
  };

  util.store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    del: function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
  };

  var toastTimer = null;
  util.toast = function (msg) {
    var box = document.getElementById('toast');
    if (!box) return;
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 2400);
  };

  util.copy = function (text, okMsg) {
    var done = function () { util.toast(okMsg || '복사했습니다'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { util.toast('복사가 지원되지 않습니다'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  };

  util.el = function (html) {
    var t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  };

  util.qs = function (sel, root) { return (root || document).querySelector(sel); };
  util.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  util.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  util.param = function (name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch (e) { return null; }
  };

  BNW.util = util;

  /* 아주 작은 이벤트 버스 — 뷰·모드·어댑터가 서로를 직접 부르지 않게 */
  var listeners = {};
  BNW.bus = {
    on: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
      return function () { BNW.bus.off(name, fn); };
    },
    off: function (name, fn) {
      var arr = listeners[name];
      if (!arr) return;
      var i = arr.indexOf(fn);
      if (i > -1) arr.splice(i, 1);
    },
    emit: function (name, payload) {
      (listeners[name] || []).forEach(function (fn) {
        try { fn(payload); } catch (e) { if (window.console) console.error(e); }
      });
    }
  };

  BNW.ready = function (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };
})(window.BNW);
