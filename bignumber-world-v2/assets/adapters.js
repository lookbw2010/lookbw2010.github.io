/* ══════════════════════════════════════════════════════════
   빅넘버월드 V2 · adapters.js
   ──────────────────────────────────────────────────────────
   데이터·기록·리드(제휴 문의)를 서로 다른 저장소에 붙일 수 있게
   어댑터 경계를 분리했습니다.

     PackRepository   Static(JSON) · Remote(Sheets/Supabase/REST)
     ScoreStore       Local(localStorage) · Remote(API)
     LeadRepository   Local(localStorage) · Webhook(POST)

   전환은 data/config.json 의 이름만 바꾸면 됩니다.
     { "repository": "rest", "apiBase": "https://api.example.com/bnw" }
   ══════════════════════════════════════════════════════════ */
(function (BNW) {
  'use strict';

  var BUNDLE = window.BNW_V2_BUNDLE || {};
  var util = BNW.util;

  var DEFAULT_CONFIG = {
    repository: 'static',
    scoreStore: 'local',
    leadRepository: 'local',
    apiBase: null,
    sheetsBase: null,
    leadEndpoint: null,
    features: { brandWhitelabel: true, sheetBuilder: true, modePreview: true }
  };

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' · ' + url);
      return r.json();
    });
  }

  /* ── 팩 저장소: 정적 JSON ───────────────────────────────── */
  function StaticPackRepository(config) {
    this.config = config || {};
    this.index = null;
    this.brandIndex = { brands: [] };
    this._packs = new Map();
    this._brands = new Map();
    this.kind = 'static';
  }
  StaticPackRepository.prototype.init = function () {
    var self = this;
    return Promise.all([
      getJSON('data/packs.json').catch(function () { return BUNDLE.index || null; }),
      getJSON('data/brands.json').catch(function () { return BUNDLE.brands || { brands: [] }; })
    ]).then(function (res) {
      if (!res[0]) throw new Error('팩 인덱스를 불러오지 못했습니다');
      self.index = res[0];
      self.brandIndex = res[1] || { brands: [] };
      /* 모든 팩을 미리 읽어 두면 모드 전환이 즉시 됩니다. 실패한 팩은 건너뜁니다. */
      return Promise.all(self.index.packs.map(function (p) {
        return self.loadPack(p.id).catch(function () { return null; });
      }));
    });
  };
  StaticPackRepository.prototype.loadPack = function (id) {
    var self = this;
    if (this._packs.has(id)) return Promise.resolve(this._packs.get(id));
    var meta = (this.index.packs || []).filter(function (p) { return p.id === id; })[0];
    if (!meta) return Promise.reject(new Error('없는 팩: ' + id));
    return getJSON(meta.file).catch(function () {
      return (BUNDLE.packs || {})[id] || null;
    }).then(function (body) {
      if (!body) throw new Error('팩 데이터 없음: ' + id);
      self._packs.set(id, body);
      return body;
    });
  };
  StaticPackRepository.prototype.packs = function () {
    var self = this;
    return (this.index ? this.index.packs : []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    }).map(function (p) {
      var loaded = self._packs.get(p.id);
      return Object.assign({}, p, { count: loaded ? loaded.questions.length : p.count });
    });
  };
  StaticPackRepository.prototype.pack = function (id) {
    var body = this._packs.get(id);
    return body || null;
  };
  StaticPackRepository.prototype.packQuestions = function (id) {
    var p = this.pack(id);
    return p ? p.questions : [];
  };
  StaticPackRepository.prototype.allQuestions = function () {
    var out = [];
    this._packs.forEach(function (p) { out = out.concat(p.questions); });
    return out;
  };
  StaticPackRepository.prototype.meta = function () {
    return this.index ? this.index.meta : {};
  };
  StaticPackRepository.prototype.brands = function () {
    return (this.brandIndex.brands || []).slice();
  };
  StaticPackRepository.prototype.brand = function (id) {
    var self = this;
    if (this._brands.has(id)) return Promise.resolve(this._brands.get(id));
    var meta = (this.brandIndex.brands || []).filter(function (b) { return b.id === id; })[0];
    if (!meta) return Promise.reject(new Error('없는 브랜드: ' + id));
    return getJSON(meta.file).catch(function () {
      return (BUNDLE.brandData || {})[id] || null;
    }).then(function (body) {
      if (!body) throw new Error('브랜드 데이터 없음: ' + id);
      self._brands.set(id, body);
      return body;
    });
  };

  /* ── 팩 저장소: 원격(구글 시트 게시 JSON · Supabase · 자체 API) ── */
  /* 같은 파일 구조(packs.json + packs/<id>.json)를 원격 base 아래에서 읽습니다.
     구글 시트는 "웹에 게시"한 JSON/CSV를 중간 서버에서 같은 경로로 노출하면 그대로 붙습니다. */
  function RemotePackRepository(config) {
    StaticPackRepository.call(this, config);
    this.base = String(config.apiBase || config.sheetsBase || '').replace(/\/$/, '');
    this.kind = config.repository || 'remote';
    if (!this.base) throw new Error('원격 저장소 주소(apiBase/sheetsBase)가 없습니다');
  }
  RemotePackRepository.prototype = Object.create(StaticPackRepository.prototype);
  RemotePackRepository.prototype.constructor = RemotePackRepository;
  RemotePackRepository.prototype._url = function (path) { return this.base + '/' + path; };
  RemotePackRepository.prototype.init = function () {
    var self = this;
    return Promise.all([
      getJSON(this._url('packs.json')).catch(function () { return BUNDLE.index || null; }),
      getJSON(this._url('brands.json')).catch(function () { return BUNDLE.brands || { brands: [] }; })
    ]).then(function (res) {
      if (!res[0]) throw new Error('원격 팩 인덱스를 불러오지 못했습니다');
      self.index = res[0];
      self.brandIndex = res[1] || { brands: [] };
      return Promise.all(self.index.packs.map(function (p) { return self.loadPack(p.id).catch(function () { return null; }); }));
    });
  };
  RemotePackRepository.prototype.loadPack = function (id) {
    var self = this;
    if (this._packs.has(id)) return Promise.resolve(this._packs.get(id));
    return getJSON(this._url('packs/' + id + '.json')).then(function (body) {
      self._packs.set(id, body);
      return body;
    });
  };
  RemotePackRepository.prototype.brand = function (id) {
    var self = this;
    if (this._brands.has(id)) return Promise.resolve(this._brands.get(id));
    return getJSON(this._url('brands/' + id + '.json')).then(function (body) {
      self._brands.set(id, body);
      return body;
    });
  };

  /* ── 점수 저장소 ────────────────────────────────────────── */
  function LocalScoreStore(prefix) {
    this.prefix = prefix || 'bnw2';
    this.kind = 'local';
  }
  LocalScoreStore.prototype._key = function (kind) { return this.prefix + '.' + kind; };
  LocalScoreStore.prototype.list = function (kind) {
    return util.store.get(this._key(kind), []) || [];
  };
  LocalScoreStore.prototype.save = function (kind, record) {
    var list = this.list(kind);
    var rec = Object.assign({ at: Date.now() }, record);
    list.push(rec);
    while (list.length > 60) list.shift();
    util.store.set(this._key(kind), list);
    return Promise.resolve(rec);
  };
  LocalScoreStore.prototype.best = function (kind, field) {
    field = field || 'score';
    var list = this.list(kind);
    if (!list.length) return null;
    return list.reduce(function (a, b) { return (b[field] || 0) > (a[field] || 0) ? b : a; });
  };
  LocalScoreStore.prototype.latest = function (kind) {
    var list = this.list(kind);
    return list.length ? list[list.length - 1] : null;
  };

  function RemoteScoreStore(config) {
    this.base = String(config.apiBase || '').replace(/\/$/, '');
    this.kind = 'remote';
  }
  RemoteScoreStore.prototype.list = function () { return []; };
  RemoteScoreStore.prototype.best = function () { return null; };
  RemoteScoreStore.prototype.latest = function () { return null; };
  RemoteScoreStore.prototype.save = function (kind, record) {
    if (!this.base) return Promise.reject(new Error('apiBase 없음'));
    return fetch(this.base + '/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, record: record })
    }).then(function (r) {
      if (!r.ok) throw new Error('점수 저장 실패');
      return r.json().catch(function () { return record; });
    });
  };

  /* ── 제휴 문의(리드) 저장소 ─────────────────────────────── */
  function LocalLeadRepository(prefix) {
    this.prefix = prefix || 'bnw2';
    this.kind = 'local';
  }
  LocalLeadRepository.prototype.submit = function (lead) {
    var list = util.store.get(this.prefix + '.leads', []) || [];
    var rec = Object.assign({}, lead, { at: Date.now() });
    rec.id = rec.id || ('BNW2-' + util.todayKey().replace(/-/g, '').slice(2) + '-' + String(Math.floor(Math.random() * 900) + 100));
    list.push(rec);
    util.store.set(this.prefix + '.leads', list);
    return Promise.resolve({ ok: true, id: rec.id });
  };

  function WebhookLeadRepository(config) {
    this.endpoint = config.leadEndpoint || '';
    this.kind = 'webhook';
  }
  WebhookLeadRepository.prototype.submit = function (lead) {
    if (!this.endpoint) return Promise.reject(new Error('leadEndpoint 없음'));
    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    }).then(function (r) {
      if (!r.ok) throw new Error('리드 전송 실패');
      return { ok: true, id: lead.id || null };
    });
  };

  async function create(overrides) {
    var fileCfg = null;
    try { fileCfg = await getJSON('data/config.json'); } catch (e) { fileCfg = null; }
    var config = Object.assign({}, DEFAULT_CONFIG, BUNDLE.config || {}, fileCfg || {}, overrides || {});

    var repo;
    if (config.repository === 'rest' && config.apiBase) repo = new RemotePackRepository(config);
    else if (config.repository === 'sheets' && config.sheetsBase) {
      repo = new RemotePackRepository(Object.assign({}, config, { apiBase: config.sheetsBase }));
    } else repo = new StaticPackRepository(config);

    await repo.init();

    var scores = (config.scoreStore === 'remote' && config.apiBase)
      ? new RemoteScoreStore(config) : new LocalScoreStore('bnw2');
    var leads = (config.leadRepository === 'webhook' && config.leadEndpoint)
      ? new WebhookLeadRepository(config) : new LocalLeadRepository('bnw2');

    return { repo: repo, scores: scores, leads: leads, config: config };
  }

  BNW.adapters = {
    create: create,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    StaticPackRepository: StaticPackRepository,
    RemotePackRepository: RemotePackRepository,
    SheetsPackRepository: RemotePackRepository,
    LocalScoreStore: LocalScoreStore,
    RemoteScoreStore: RemoteScoreStore,
    LocalLeadRepository: LocalLeadRepository,
    WebhookLeadRepository: WebhookLeadRepository
  };
})(window.BNW);
