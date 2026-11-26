/* 1줄 거창하게 말하기 — 100% 프론트엔드 */
(() => {
'use strict';

const MAX = 40;

const $  = (s, r = document) => r.querySelector(s);

/* ───────── 테마 정의 ───────── */
const THEMES = [
  { id:'news', plain:'[속보] 9시 뉴스', tag:'LIVE', sub:'BREAKING NEWS',
    icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z"/></svg>' },
  { id:'trailer', plain:'영화 예고편', tag:'PREVIEW', sub:'A BLOCKBUSTER',
    icon:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 4v5M16 4v5M10.5 12.5l4 2.5-4 2.5z"/></svg>' },
  { id:'president', plain:'대통령 긴급담화', tag:'ORATION', sub:'ADDRESS',
    icon:'<svg viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5M5.5 10v8M10 10v8M14 10v8M18.5 10v8M3 20h18"/></svg>' },
  { id:'space', plain:'우주선 교신', tag:'SIGNAL', sub:'DEEP SPACE',
    icon:'<svg viewBox="0 0 24 24"><path d="M4 14a10 10 0 0 1 6-6l4 4-4 4z"/><path d="m10 12 4-4"/><path d="M14 10.5a5 5 0 0 1 2 6.5M17 7a9 9 0 0 1 2.5 12"/><circle cx="12" cy="12" r="1"/></svg>' }
];

const PRESETS = ['올 때 메로나 사와','야 돈 갚아','오늘 치킨?','칼퇴 선언','미안해'];

/* ───────── 분류 ───────── */
const CATS = {
  money:   /돈|빚|갚|입금|만원|월급|카드값|빌려|빌린|이자|송금|계좌|용돈|원 빌|갚아/,
  food:    /치킨|피자|메로나|아이스크림|라면|밥|먹|배고|커피|맥주|소주|과자|빵|김치|고기|야식|배달|떡볶이|초콜릿|아메리카노|간식|국밥|짜장|탕수육|마라탕|아이스|라떼/,
  work:    /칼퇴|퇴근|야근|회사|상사|사장|보고서|회의|출근|업무|프로젝트|팀장|과장|대리|부장|회식|워라밸|야근|동료/,
  sorry:   /미안|잘못|사과|용서|화내|섭섭|실수|늦었/,
  love:    /사랑|보고싶|좋아해|애인|여보|자기야|공주|첫사랑|설레|고백|그리워/,
  call:    /전화|연락|문자|답장|카톡|와줘|와봐|빨리 와|오라고|읽씹|톡해|전화해/,
  sleep:   /자러|잔다|잘게|졸려|피곤|수면|잠와|잠 온다|낮잠|눕자/,
  chore:   /청소|설거지|빨래|정리|숙제|분리수거|장보|장봐/,
  bring:   /사와|사줘|가져와|사다|사올|좀 사|챙겨/
};

function classify(text){
  for (const k of Object.keys(CATS)){
    const m = text.match(CATS[k]);
    if (m) return { cat:k, kw:m[0] };
  }
  return { cat:'generic', kw:null };
}

/* ───────── 카피 ───────── */
const NEWS = {
  food: {
    l2: ['긴급 *식량 조달* 요청… 인근 편의점 비상', '야식 *수급 대란*… 배달 앱 전면 마비', '국민 3명 중 2명 "*지금 당장*"… 식탁 비상'],
    tick: ['시민들 "{m}" 한마디에 SNS 지원 릴레이 이어져', '"한 끼의 사활"…전문가 "골든타임 30분"', '편의점 앞 대기줄…점주 "오늘만 세 배"'],
    cit: '시민들 "한 개만 사 오면 되는데"', tail: '식품'
  },
  money: {
    l2: ['*채권 회수* 작전 전면 돌입… 금융당국 비상', '미수금 추적팀 투입… "*오늘까지*"', '채무 불이행 경보… 여론 82% "*당연*"'],
    tick: ['채무자 "다음 주에"…채권자 "그 말 세 번째"', '금융권 "소액이라도 원칙"…상환 압박', '"돈 빌려준 사람이 더 미안해"…공감 폭발'],
    cit: '채권자 "다음 주는 없다"', tail: '경제'
  },
  work: {
    l2: ['*정시 퇴근* 선언… 사무실 공기 급변', '*노동계 대변혁* 예고… 상사들 긴급 회의', '"*오늘은 간다*"… 야근 문화 균열'],
    tick: ['직장인 91% "칼퇴는 권리"', '"눈치 보지 마"…퇴근길 인증 릴레이', '상사 "회의 있는데"…직원 "안 들려요"'],
    cit: '직장인 "오늘만큼은"', tail: '사회'
  },
  sorry: {
    l2: ['*역사적 화해* 모색… 관계 정상화 기대', '*사과* 한마디에 국면 전환… 긴장 완화', '"*미안하다*" 첫 언급… 전문가 "골든타임"'],
    tick: ['"늦었지만 진심"…누리꾼 "이 정도면 용서"', '갈등 3년 만의 접점…후속 조치 주목', '심리학계 "사과는 48시간 안에"'],
    cit: '관계자 "먼저 연락했다"', tail: '사회'
  },
  love: {
    l2: ['*심장 진동* 감지… 관계 당국 긴급 분석', '"*보고 싶다*" 신호 포착… SNS 반응 폭주', '*설렘 지수* 최고치… 기상청 "이례적"'],
    tick: ['"연락 기다린 지 3일"…네티즌 "그 마음 안다"', '연애 세포 재가동 신호…전문가 "지금이다"', '한 줄에 담긴 3년…감동 사연 확산'],
    cit: '누리꾼 "이건 운명"', tail: '생활'
  },
  call: {
    l2: ['*연락 두절* 3시간째… 수색 범위 확대', '발신 24건 기록… "*지금 전화 받아*"', '*통화 연결음* 47초… 긴장감 최고조'],
    tick: ['"문자 읽고도 답 없어"…억울함 호소', '통신사 "기지국은 정상"', '카톡 1 사라짐…"읽씹 논란"'],
    cit: '발신자 "세 번 울렸다"', tail: '사회'
  },
  sleep: {
    l2: ['*수면 부족* 경보… 전국적 졸음 확산', '"*5분만*" 외침… 의학계 "더는 안 된다"', '*눈꺼풀 하강*… 각성제 긴급 투입'],
    tick: ['"이불 밖은 위험해"…귀가 러시', '수면학회 "7시간은 지켜야"', '"눈 감으면 끝"…직장인 공감 1만'],
    cit: '전문가 "지금 자야"', tail: '생활'
  },
  chore: {
    l2: ['*가사 노동* 비상사태… 주방 마비 직전', '"*네가 해*" 통보… 가정 내 긴장 고조', '설거지 산 47개… 처리 인력 긴급 파견'],
    tick: ['"청소는 같이"…부부 협상 결렬', '분리수거의 날…아파트 비상회의', '"빨래는 누가"…여론조사 착수'],
    cit: '배우자 "안 한다고?"', tail: '생활'
  },
  bring: {
    l2: ['긴급 *조달 요청*… 귀가길 긴장 고조', '왕복 1.2km *수혈 작전*… 편의점 앞 대기', '퇴근길 *최대 미션*… 성공률 68%'],
    tick: ['시민들 "없으면 못 산다"…SNS 지원 릴레이', '"한 개만 사 와"…가족 협상 최종 국면', '편의점 재고 확인…점주 "있습니다"'],
    cit: '시민들 "편의점 있음"', tail: '생활'
  },
  generic: {
    l2: ['*전 국민* 관심 집중… 당국 "상황 예의주시"', '*한 줄*이 만든 파장… 전문가 "역대급"', '긴급 브리핑 예고… 발표문 초안 작성 중'],
    tick: ['"이 말은 반드시 전해져야"…확산 속도', '관계자 "더 이상 말할 것 없다"', '실시간 검색어 1위…진위 공방'],
    cit: '관계자 "예의주시 중"', tail: '종합'
  }
};

const GENRE = {
  food:'한 끼의 부탁. 도시 전체의 운명.',
  money:'빌린 것은 반드시 돌아온다.',
  work:'정시에, 그는 사무실을 떠난다.',
  sorry:'가장 어려운 말, 가장 늦은 고백.',
  love:'한 사람을 향한, 끝나지 않은 신호.',
  call:'전화 한 통이 모든 것을 바꾼다.',
  sleep:'잠들지 못한 자들의 도시.',
  chore:'집안의 질서가 무너진다.',
  bring:'단 하나의 심부름이 세상을 바꾼다.',
  generic:'평범한 한마디가 세상을 뒤집는다.'
};

const PRESIDENT_CLOSE = {
  food:'이것은 부탁이 아닙니다. 국민의 식탁을 지키기 위한 대통령의 약속입니다.',
  money:'대한민국은 채무 불이행을 용납하지 않습니다. 오늘 자로 회수에 착수합니다.',
  work:'정시 퇴근은 이제 특권이 아닙니다. 국민의 당연한 권리입니다.',
  sorry:'국가를 대표하여, 그리고 한 사람으로서, 진심으로 사과드립니다.',
  love:'사랑은 국경도, 시간도 초월합니다. 정부는 이를 전폭 지지합니다.',
  call:'지금 전화를 받지 않는 것은 국가적 손실입니다. 즉시 응답해 주십시오.',
  sleep:'충분한 수면은 국민의 권리입니다. 오늘 밤은 일찍 주무십시오.',
  chore:'집안일은 나누어야 합니다. 정부가 앞장서겠습니다.',
  bring:'필요한 것은 반드시 전달되어야 합니다. 이것이 국가의 기본입니다.',
  generic:'이 한마디는 국민께서 반드시 기억해 주셔야 합니다.'
};

const SPACE_CLOSE = {
  food:'보급선 도킹을 승인한다. 메뉴는 30분 내 확보되어야 한다.',
  money:'미수 채권 신호 확인. 회수 프로토콜을 가동한다.',
  work:'지상 근무 종료 신호 확인. 조기 귀환을 승인한다.',
  sorry:'궤도에서도 사과는 통한다. 신호를 전송하겠다.',
  love:'이 신호는 4광년을 건너왔다. 답신을 부탁한다.',
  call:'응답 없음. 재송신 3회. 즉시 응답 요망.',
  sleep:'승무원 수면 모드 진입. 교신은 내일 이어간다.',
  chore:'청소 로봇 파견 요청. 지상 지원 필요.',
  bring:'보급품 1건 미확인. 회수 경로 재계산 완료.',
  generic:'이 교신은 기록에 남는다. 인류 최초의 한 줄.'
};

/* ───────── 유틸 ───────── */
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, seed) => arr[seed % arr.length];
const bold = s => esc(s).replace(/\*([^*]+)\*/g, '<span class="hi">$1</span>');
const sizeCls = m => m.length > 26 ? ' len-l' : m.length > 15 ? ' len-m' : '';

function nowParts(){
  const d = new Date();
  const wd = ['일','월','화','수','목','금','토'];
  return {
    date:`${pad(d.getMonth()+1)}.${pad(d.getDate())} (${wd[d.getDay()]})`,
    time:`${pad(d.getHours())}:${pad(d.getMinutes())}`,
    stamp:`${d.getFullYear()}. ${pad(d.getMonth()+1)}. ${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())} KST`,
    month:d.getMonth()+1
  };
}
const SEASON = {1:0,2:2,3:8,4:15,5:20,6:24,7:27,8:28,9:23,10:16,11:9,12:2};
function temp(seed, month){
  const base = SEASON[month] ?? 12;
  return (base - 3 + (seed % 45) / 10).toFixed(1);
}

function highlight(text, kw){
  const e = esc(text);
  if (!kw) return e;
  const k = esc(kw);
  const i = e.indexOf(k);
  if (i < 0) return e;
  return e.slice(0, i) + '<span class="hi">' + k + '</span>' + e.slice(i + k.length);
}

/* ───────── 장면 렌더 ───────── */
function render(themeId, msg){
  const { cat, kw } = classify(msg);
  const seed = hash(msg + themeId);
  const t = nowParts();
  const data = NEWS[cat] || NEWS.generic;

  if (themeId === 'trailer'){
    return `
    <div class="t-bg"></div><div class="t-shade"></div>
    <div class="t-body">
      <p class="t-pres">ONE LINE PICTURES</p>
      <p class="t-kick">A BLOCKBUSTER IN ONE SENTENCE</p>
      <div class="t-hair"></div>
      <h2 class="t-title${sizeCls(msg)}"><span class="qt">「</span>${esc(msg)}<span class="qt">」</span></h2>
      <p class="t-tag">올겨울, 당신의 심장을 뛰게 할<br>단 하나의 미션</p>
      <p class="t-genre">${esc(GENRE[cat] || GENRE.generic)}</p>
    </div>
    <div class="t-foot">
      <div class="t-cs">COMING SOON</div>
      <div class="t-date">${t.date.slice(0,5)} 대개봉 · NOW SHOWING</div>
      <div class="t-credits">
        <span>감독 · 각본 — 당신 &nbsp;·&nbsp; 배급 — 1줄 거창하게 말하기</span>
        <span>음악 — 웅장한 베이스 드롭 &nbsp;·&nbsp; 관람등급 — 전체 관람가</span>
      </div>
    </div>
    <div class="t-letter top"></div><div class="t-letter bottom"></div>
    <div class="t-flicker"></div>
    <div class="grain"></div>`;
  }

  if (themeId === 'president'){
    return `
    <div class="p-bg"></div><div class="p-shade"></div>
    <div class="p-body">
      <div class="p-head"><span class="p-org">대통령실</span><span class="p-rule"></span><span class="p-kind">긴급 담화</span></div>
      <div class="p-mid">
        <svg class="p-seal" viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="50" cy="50" r="46" stroke-width="1.6"/>
          <circle cx="50" cy="50" r="39.5" stroke-width=".8" stroke-opacity=".5"/>
          <circle cx="50" cy="50" r="25" stroke-width=".8" stroke-opacity=".35"/>
          <path d="M50 30.5 54.4 42.2 66.8 42.9 57.1 50.9 60.4 62.9 50 56.1 39.6 62.9 42.9 50.9 33.2 42.9 45.6 42.2Z" fill="currentColor" stroke="none" opacity=".9"/>
        </svg>
        <p class="p-lead">존경하는 국민 여러분,<br>지금 이 시각부로 다음 사항을<br>엄중히 선포합니다.</p>
        <div class="p-quote${sizeCls(msg)}">「${esc(msg)}」</div>
        <p class="p-close">${esc(PRESIDENT_CLOSE[cat] || PRESIDENT_CLOSE.generic)}</p>
      </div>
      <div class="p-sign">
        <span class="p-date">${t.stamp}</span>
        <span class="p-name">대한민국 대통령</span>
      </div>
      <span class="p-parody">패러디 · 실존 인물·기관과 무관</span>
    </div>
    <div class="grain"></div>`;
  }

  if (themeId === 'space'){
    const freq = (14 + (seed % 900) / 1000).toFixed(3);
    const lat = (0.2 + (seed % 70) / 100).toFixed(2);
    const lock = (93 + (seed % 69) / 10).toFixed(1);
    const bars = Array.from({length: 30}, (_, i) =>
      `<i style="height:${18 + ((seed >> (i % 12)) % 82)}%;animation-delay:${(i * 0.07).toFixed(2)}s"></i>`).join('');
    return `
    <div class="s-bg"></div><div class="s-shade"></div>
    <div class="s-body">
      <div class="s-head">
        <span>DEEP SPACE NETWORK · 채널 7</span>
        <span class="s-lock"><i></i>SIGNAL LOCK ${lock}%</span>
      </div>
      <div class="s-main">
        <svg class="s-radar" viewBox="0 0 100 100" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="46" stroke="rgba(94,231,245,.22)"/>
          <circle cx="50" cy="50" r="31" stroke="rgba(94,231,245,.18)"/>
          <circle cx="50" cy="50" r="16" stroke="rgba(94,231,245,.14)"/>
          <path d="M50 50 L50 4" stroke="rgba(94,231,245,.6)" stroke-width=".8"/>
          <g class="spin"><path d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z" fill="url(#sweep)"/></g>
          <circle cx="66" cy="36" r="1.8" fill="#8CF7FF" opacity=".9"><animate attributeName="opacity" values=".2;1;.2" dur="2.4s" repeatCount="indefinite"/></circle>
          <circle cx="38" cy="62" r="1.4" fill="#8CF7FF" opacity=".7"><animate attributeName="opacity" values=".1;1;.1" dur="3.1s" repeatCount="indefinite"/></circle>
          <defs><linearGradient id="sweep" x1="50" y1="50" x2="82" y2="18" gradientUnits="userSpaceOnUse">
            <stop stop-color="#5EE7F5" stop-opacity=".45"/><stop offset="1" stop-color="#5EE7F5" stop-opacity="0"/>
          </linearGradient></defs>
        </svg>
        <div class="s-center">
          <div class="s-log">
            <p class="s-line b">휴스턴, 응답하라.<span class="s-cursor"></span></p>
            <p class="s-line c">궤도 외곽에서 중대 교신 수신 —</p>
            <p class="s-msg${sizeCls(msg)}">「<span class="b">${esc(msg)}</span>」</p>
            <p class="s-close">${esc(SPACE_CLOSE[cat] || SPACE_CLOSE.generic)}</p>
          </div>
        </div>
        <div class="s-wave">${bars}</div>
        <div class="s-tel">
          <span>FREQ ${freq} GHz</span><span>LATENCY ${lat}s</span><span>ORBIT 402km</span><span>ENC-7 SECURE</span>
        </div>
      </div>
    </div>
    <div class="grain"></div>`;
  }

  /* 뉴스 */
  const l2 = pick(data.l2, seed);
  const tick = data.tick.map(s => s.replace('{m}', msg));
  const tickAll = [`[속보] "${msg}" — ${data.cit.replace(/^[^"]*"/,'"')}`, ...tick, `${data.tail} · 이 시각 주요 뉴스`, '전국 대체로 맑음 · 미세먼지 보통'];
  const tickHtml = `<span>${tickAll.map(esc).join('  ◆  ')}</span>`.repeat(2);

  return `
  <div class="n-top">
    <div class="n-brand">뉴스TV <span class="n-live"><i></i>LIVE</span></div>
    <div class="n-clock"><b>서울 · 종로</b>${t.date} ${t.time}</div>
  </div>
  <div class="n-banner">
    <h2 class="n-big">긴급속보</h2>
    <div class="n-sub">BREAKING NEWS</div>
  </div>
  <div class="n-photo">
    <div class="n-feed"><i></i>현장 LIVE</div>
    <div class="n-livetag">LIVE</div>
    <span class="n-note">가상 연출 · 실존 인물·기관과 무관</span>
    <div class="n-pip">
      <div class="pip-rings"></div>
      <div class="pip-rec"><i></i>REC 00:12</div>
      <svg class="pip-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 5 14h5l-1 8 8-12h-5z"/></svg>
      <div class="pip-txt">현장 영상 · ${esc(data.tail)}</div>
    </div>
  </div>
  <div class="n-lower">
    <div class="n-l3">
      <div class="l3-tab">속보</div>
      <div class="l3-box">
        <p class="l3-1${sizeCls(msg)}">「${highlight(msg, kw)}」</p>
        <p class="l3-2">${bold(l2)}</p>
      </div>
    </div>
    <div class="n-meta"><span class="t">${t.time}</span> ${esc(data.cit)} · SNS 확산 <span class="w">기온 ${temp(seed, t.month)}℃</span></div>
    <div class="n-ticker"><span class="tick-label">속보</span><div class="tick-mask"><div class="tick-track">${tickHtml}</div></div></div>
  </div>
  <div class="grain"></div>`;
}

/* ───────── 사운드 (Web Audio 합성) ───────── */
let gestureSeen = false;
['pointerdown','keydown','touchstart'].forEach(ev =>
  window.addEventListener(ev, () => { gestureSeen = true; }, { once:true, capture:true, passive:true }));

const Sound = {
  ctx:null, master:null, out:null, on:true,
  ensure(){
    if (!this.ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.85 : 0.0001;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (!this.out){ this.out = this.ctx.createGain(); this.out.connect(this.master); }
    return this.ctx;
  },
  setOn(v){
    this.on = v;
    if (this.master) this.master.gain.value = v ? 0.85 : 0.0001;
    if (v) this.ensure();
  },
  noiseBuf(){
    if (this._nb) return this._nb;
    const c = this.ctx, len = Math.floor(c.sampleRate * 1.6);
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._nb = b; return b;
  },
  tone(t, o = {}){
    const { freq = 440, to = null, dur = .2, type = 'sine', gain = .2, lp = null } = o;
    const c = this.ctx; if (!c) return;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), t + Math.min(.04, dur * .25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (lp){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
    node.connect(g); g.connect(this.out);
    osc.start(t); osc.stop(t + dur + .05);
  },
  noise(t, o = {}){
    const { dur = .5, gain = .15, type = 'bandpass', freq = 800, to = null, q = 1 } = o;
    const c = this.ctx; if (!c) return;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf();
    const f = c.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + dur + .02);
  },
  play(theme){
    if (!this.on) return false;
    const c = this.ensure(); if (!c) return false;
    if (c.state !== 'running') return false;
    if (this.out){ try { this.out.gain.cancelScheduledValues(c.currentTime); this.out.gain.setValueAtTime(this.out.gain.value, c.currentTime); this.out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + .08); } catch(e){} }
    this.out = c.createGain();
    this.out.gain.value = 1;
    this.out.connect(this.master);

    const t = c.currentTime + .04;
    if (theme === 'news'){
      [0, .17, .34].forEach((d, i) => this.tone(t + d, { freq: i === 1 ? 880 : 1240, dur: .1, type: 'square', gain: .13, lp: 2600 }));
      this.tone(t + .52, { freq: 120, to: 38, dur: 1.1, type: 'sine', gain: .5 });
      this.noise(t + .52, { dur: .5, gain: .18, type: 'lowpass', freq: 420, to: 120 });
      this.tone(t + .6, { freq: 55, dur: 2.6, type: 'sine', gain: .12 });
      this.noise(t + 1.2, { dur: .12, gain: .06, type: 'highpass', freq: 2200 });
    } else if (theme === 'trailer'){
      this.noise(t, { dur: 1.5, gain: .16, type: 'bandpass', freq: 180, to: 3200, q: .9 });
      this.tone(t + 1.45, { freq: 110, to: 30, dur: 1.9, type: 'sine', gain: .55 });
      this.noise(t + 1.45, { dur: 1.1, gain: .3, type: 'lowpass', freq: 260, to: 80 });
      this.tone(t + 1.5, { freq: 1760, dur: 1.4, type: 'sine', gain: .05 });
      this.tone(t + 1.5, { freq: 2637, dur: 1.2, type: 'sine', gain: .03 });
      this.tone(t + 2.4, { freq: 55, dur: 3.4, type: 'sine', gain: .1 });
    } else if (theme === 'president'){
      this.tone(t + .15, { freq: 523.25, dur: 2.4, type: 'sine', gain: .2 });
      this.tone(t + .15, { freq: 1046.5, dur: 1.4, type: 'sine', gain: .05 });
      this.tone(t + .9, { freq: 659.25, dur: 2.4, type: 'sine', gain: .17 });
      this.tone(t + .9, { freq: 1318.5, dur: 1.2, type: 'sine', gain: .04 });
      this.tone(t, { freq: 65.4, dur: 4.2, type: 'sine', gain: .12 });
      this.tone(t + 1.6, { freq: 80, to: 45, dur: .5, type: 'sine', gain: .3 });
      this.noise(t + 1.6, { dur: .25, gain: .12, type: 'lowpass', freq: 220 });
    } else if (theme === 'space'){
      this.noise(t, { dur: .55, gain: .1, type: 'highpass', freq: 1400 });
      const morse = [0, .16, .32, .62, .78, 1.02, 1.18, 1.34];
      morse.forEach((d, i) => this.tone(t + .15 + d, { freq: 1420, dur: i % 3 === 2 ? .16 : .07, type: 'sine', gain: .11 }));
      this.tone(t + 1.7, { freq: 1500, to: 1380, dur: .7, type: 'sine', gain: .16 });
      this.tone(t + 1.95, { freq: 1500, to: 1380, dur: .5, type: 'sine', gain: .06 });
      this.tone(t + 2.2, { freq: 1500, to: 1380, dur: .4, type: 'sine', gain: .03 });
      this.tone(t + .2, { freq: 44, dur: 3.8, type: 'sine', gain: .1 });
    }
    return true;
  }
};

/* ───────── 상태 / UI ───────── */
const state = { msg:'', theme:'news', capture:false };
const els = {
  studio:$('#studio'), stage:$('#stage'), scene:$('#scene'),
  msg:$('#msg'), counter:$('#counter'), clear:$('#clear'),
  mic:$('#mic'), micLabel:$('#micLabel'),
  chips:$('#chips'), grid:$('#grid'), launch:$('#launch'),
  toast:$('#toast'), modal:$('#modal'), modalBody:$('#modalBody'),
  modalTitle:$('#modalTitle'), modalClose:$('#modalClose'), modalDo:$('#modalDo'),
  soundBtn:$('#soundBtn'), soundLabel:$('#soundLabel')
};
let toastTimer = 0;

function toast(text, ms = 2200){
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

/* 입력 */
function syncInput(){
  state.msg = els.msg.value;
  els.counter.textContent = `${state.msg.length}/40`;
  els.counter.classList.toggle('full', state.msg.length >= MAX);
  els.clear.classList.toggle('on', state.msg.length > 0);
  [...els.chips.children].forEach(c => c.classList.toggle('sel', c.dataset.text === state.msg));
}
function setMsg(text, focus = false){
  els.msg.value = text;
  syncInput();
  if (focus) els.msg.focus();
}

/* 지우기 — 항상 누를 수 있고, 누르면 즉시 비우고 포커스를 유지한다 */
els.clear.addEventListener('click', () => {
  els.msg.value = '';
  syncInput();
  els.msg.focus({ preventScroll:true });
});

els.msg.addEventListener('input', syncInput);
els.msg.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); launch(); }
});

/* ───────── 음성 입력 (Web Speech API · ko-KR) ───────── */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recog = null, listening = false;
let voiceTimer = null, startTimer = null;
let voiceStarted = false, voiceHeard = false, voiceErrored = false, voiceByUser = false;

const VMSG = {
  unsupported:'이 브라우저는 음성 입력을 지원하지 않아요. 직접 입력해 주세요.',
  permission:'마이크 권한이 필요해요. 주소창 옆 자물쇠에서 마이크를 허용해 주세요.',
  noSpeech:'잘 들리지 않았어요. 한 번 더 말씀해 주세요.',
  network:'음성 인식 서버에 연결하지 못했어요. 직접 입력해 주세요.',
  audio:'마이크를 찾지 못했어요. 기기 연결을 확인해 주세요.',
  error:'음성 인식에 문제가 생겼어요. 직접 입력해 주세요.'
};

function setListening(on){
  listening = on;
  els.mic.classList.toggle('on', on);
  els.mic.setAttribute('aria-pressed', String(on));
  els.mic.setAttribute('aria-label', on ? '음성 입력 중지' : '말로 입력하기');
  els.micLabel.textContent = on ? '듣는 중' : '말로 하기';
}
function clearVoiceTimers(){
  if (voiceTimer){ clearTimeout(voiceTimer); voiceTimer = null; }
  if (startTimer){ clearTimeout(startTimer); startTimer = null; }
}
function stopVoice(){
  clearVoiceTimers();
  if (!recog){ setListening(false); return; }
  const r = recog; recog = null; voiceByUser = true;
  try { r.abort ? r.abort() : r.stop(); } catch(e){}
  setListening(false);
}
function startVoice(){
  if (listening){ stopVoice(); return; }
  if (!SR || !window.isSecureContext){ toast(VMSG.unsupported); return; }
  try { recog = new SR(); } catch(e){ toast(VMSG.unsupported); return; }

  recog.lang = 'ko-KR';
  recog.interimResults = true;
  recog.continuous = false;
  recog.maxAlternatives = 1;

  recog.onstart = () => { voiceStarted = true; clearVoiceTimers(); setListening(true); };
  recog.onaudiostart = () => { voiceStarted = true; setListening(true); };
  recog.onspeechend = () => { setListening(false); };
  recog.onresult = ev => {
    clearVoiceTimers();
    voiceHeard = true;
    let out = '';
    for (let i = 0; i < ev.results.length; i++) out += ev.results[i][0].transcript;
    out = out.replace(/\s+/g, ' ').replace(/^[\s,.;:!?]+|[\s,]+$/g, '').slice(0, MAX);
    if (!out) return;
    els.msg.value = out;
    syncInput();
  };
  recog.onerror = ev => {
    clearVoiceTimers();
    voiceErrored = true;
    const code = (ev && ev.error) || '';
    if (code === 'aborted'){ voiceByUser = true; setListening(false); return; }
    let m = VMSG.error;
    if (code === 'not-allowed' || code === 'service-not-allowed'){ m = VMSG.permission; els.mic.classList.add('denied'); }
    else if (code === 'no-speech') m = VMSG.noSpeech;
    else if (code === 'network') m = VMSG.network;
    else if (code === 'audio-capture') m = VMSG.audio;
    toast(m, 3400);
    setListening(false);
  };
  recog.onend = () => {
    clearVoiceTimers();
    recog = null;
    setListening(false);
    if (!voiceHeard && !voiceErrored && !voiceByUser) toast(VMSG.noSpeech, 3000);
  };

  voiceHeard = false; voiceErrored = false; voiceByUser = false; voiceStarted = false;
  els.mic.classList.remove('denied');

  try {
    recog.start();
    setListening(true);
    startTimer = setTimeout(() => {
      if (!recog || voiceStarted) return;
      toast(VMSG.unsupported, 3000);
      stopVoice();
    }, 3500);
    voiceTimer = setTimeout(() => {
      if (!recog) return;
      toast(VMSG.noSpeech, 3000);
      stopVoice();
    }, 9000);
  } catch(e){
    recog = null;
    setListening(false);
    toast(VMSG.unsupported);
  }
}
els.mic.addEventListener('click', e => { e.preventDefault(); startVoice(); });

PRESETS.forEach(text => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'chip'; b.dataset.text = text;
  b.textContent = text;
  b.addEventListener('click', () => setMsg(text, true));
  els.chips.appendChild(b);
});

/* 테마 카드 */
THEMES.forEach((t, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'card'; b.dataset.theme = t.id;
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', String(i === 0));
  b.setAttribute('aria-label', t.plain);
  b.innerHTML = `
    <div class="c-inner">
      <span class="c-icon">${t.icon}</span>
      <span class="c-tag">${t.tag}</span>
      <span class="c-name">${t.plain.replace(' ', '<br>')}<small>${t.sub}</small></span>
    </div>`;
  b.addEventListener('click', () => selectTheme(t.id));
  els.grid.appendChild(b);
});

function selectTheme(id){
  state.theme = id;
  [...els.grid.children].forEach(c => {
    const on = c.dataset.theme === id;
    c.classList.toggle('sel', on);
    c.setAttribute('aria-checked', String(on));
  });
  try { localStorage.setItem('epic-say:theme', id); } catch(e){}
}

/* 테마별 배경 이미지 */
const BG = { news:'./assets/bg-news.jpg', trailer:'./assets/bg-trailer.jpg', president:'./assets/bg-president.jpg', space:'./assets/bg-space.jpg' };
document.documentElement.style.setProperty('--x', '0');
[...els.grid.children].forEach(c => c.style.setProperty('--img', `url('${BG[c.dataset.theme]}')`));

/* ───────── 열기 / 닫기 ───────── */
function urlFor(theme, msg){
  return `${location.origin}${location.pathname}?t=${theme}&m=${encodeURIComponent(msg)}`;
}

function setTitle(){
  document.title = state.msg ? `「${state.msg}」 — 1줄 거창하게 말하기` : '1줄 거창하게 말하기 — 평범한 말을 거창하게';
}

function openStage(theme, msg, opts = {}){
  state.theme = theme;
  state.msg = msg;
  els.stage.dataset.theme = theme;
  els.scene.innerHTML = `<div class="scene-body ${theme}">${render(theme, msg)}</div>`;
  els.stage.hidden = false;
  els.studio.hidden = true;
  document.body.classList.remove('capture', 'capture-clean');
  setTitle();

  if (opts.push !== false){
    const url = urlFor(theme, msg);
    try { history.pushState({ epic:1 }, '', url); } catch(e){}
  }
  if (opts.scroll !== false) window.scrollTo(0, 0);

  const ok = gestureSeen ? Sound.play(theme) : false;
  if (!ok && Sound.on && opts.needsGesture) {    toast('탭하면 소리와 함께 다시 재생됩니다', 3200);
    const once = () => {
      window.removeEventListener('pointerdown', once);
      Sound.ensure();
      Sound.play(theme);
    };
    window.addEventListener('pointerdown', once, { once:true });
  }
  syncSoundUI();
}

function showStudio(push = true){
  els.stage.hidden = true;
  els.studio.hidden = false;
  els.scene.innerHTML = '';
  document.body.classList.remove('capture', 'capture-clean');
  state.capture = false;
  setTitle();
  if (push){
    try { history.replaceState({}, '', location.pathname); } catch(e){}
  }
  els.msg.focus({ preventScroll:true });
}

function launch(){
  const msg = els.msg.value.trim().replace(/\s+/g, ' ');
  if (!msg){
    els.msg.focus();
    toast('하고 싶은 말을 먼저 적어주세요');
    els.msg.animate(
      [{ transform:'translateX(0)' }, { transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'translateX(0)' }],
      { duration:260, easing:'ease-in-out' }
    );
    return;
  }
  setMsg(msg);
  openStage(state.theme, msg, { push:true, needsGesture:true });
}

els.launch.addEventListener('click', launch);
$('#exitBtn').addEventListener('click', () => showStudio(true));

$('#replayBtn').addEventListener('click', () => {
  els.scene.innerHTML = `<div class="scene-body ${state.theme}">${render(state.theme, state.msg)}</div>`;
  Sound.play(state.theme);
  toast('다시 재생했습니다', 1400);
});

/* 사운드 */
function syncSoundUI(){
  els.soundBtn.classList.toggle('muted', !Sound.on);
  els.soundBtn.setAttribute('aria-pressed', String(Sound.on));
  els.soundLabel.textContent = Sound.on ? '소리 켜짐' : '소리 꺼짐';
}
els.soundBtn.addEventListener('click', () => {
  Sound.setOn(!Sound.on);
  try { localStorage.setItem('epic-say:sound', Sound.on ? '1' : '0'); } catch(e){}
  syncSoundUI();
  if (Sound.on){ Sound.play(state.theme); toast('소리를 켰습니다', 1200); }
  else toast('소리를 껐습니다', 1200);
});

/* 복사 / 공유 */
async function copyText(text, okMsg){
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
    return true;
  } catch(e){
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok){ toast(okMsg); return true; }
    } catch(e2){}
    openModal('링크를 직접 복사하세요',
      `<p style="margin:0 0 10px">아래 주소를 길게 눌러 복사한 뒤 보내면 됩니다.</p>
       <input id="manualUrl" readonly value="${esc(text)}" style="width:100%;padding:10px;border-radius:8px;border:1px solid #333;background:#0b0c10;color:#ddd;font-size:12px">`,
      null, null);
    const inp = $('#manualUrl'); if (inp){ inp.focus(); inp.select(); }
    return false;
  }
}

$('#copyBtn').addEventListener('click', () => copyText(urlFor(state.theme, state.msg), '공유 링크를 복사했어요'));

$('#replyBtn').addEventListener('click', async () => {
  const url = urlFor(state.theme, state.msg);
  const text = `속보 하나 도착했습니다 — 「${state.msg}」`;
  if (navigator.share){
    try { await navigator.share({ title:'1줄 거창하게 말하기', text, url }); return; }
    catch(e){ if (e && e.name === 'AbortError') return; }
  }
  copyText(url, '링크를 복사했어요. 카톡에 붙여넣어 보내세요');
});

$('#makeBtn').addEventListener('click', () => {
  showStudio(true);
  setMsg('');
  toast('이제 당신의 한 줄을 적어보세요', 1600);
});

/* 캡처 */
$('#capBtn').addEventListener('click', () => {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  openModal('화면 그대로 간직하기',
    `<ul>
      <li><b>1</b><span>아래 버튼을 누르면 버튼이 사라지고 장면만 남습니다.</span></li>
      <li><b>2</b><span>${ios ? '아이폰: 측면 버튼 + 볼륨 업을 동시에 눌러 캡처' : '안드로이드: 전원 + 볼륨 다운, PC: Win + Shift + S'}</span></li>
      <li><b>3</b><span>캡처 후 화면을 한 번 탭하면 원래대로 돌아옵니다.</span></li>
     </ul>
     <p>사진 앱에 저장한 뒤 카톡·인스타에 그대로 올리면 됩니다.</p>`,
    '버튼 숨기고 캡처', () => {
      document.body.classList.add('capture');
      toast('지금 캡처하세요!', 1600);
      setTimeout(() => document.body.classList.add('capture-clean'), 1700);
    });
});

$('#scene').addEventListener('pointerdown', () => {
  if (document.body.classList.contains('capture')){
    document.body.classList.remove('capture', 'capture-clean');
    toast('원래 화면으로 돌아왔어요', 1400);
  }
});

/* 모달 */
function openModal(title, html, actionLabel, onAction){
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modalDo.hidden = !actionLabel;
  if (actionLabel) els.modalDo.textContent = actionLabel;
  els.modalDo.onclick = () => {
    if (onAction) onAction();
    closeModal();
  };
  els.modal.hidden = false;
}
function closeModal(){ els.modal.hidden = true; }
els.modalClose.addEventListener('click', closeModal);
els.modal.addEventListener('click', e => { if (e.target === els.modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

$('#aboutBtn').addEventListener('click', () => {
  openModal('이 서비스는 패러디입니다',
    `<ul>
       <li><b>·</b><span>실제 뉴스 방송·정부·우주 기관과 아무 관련이 없는 재미용 서비스입니다.</span></li>
       <li><b>·</b><span>입력한 한 줄은 서버로 전송되지 않고 브라우저 안에서만 문장으로 다듬어집니다.</span></li>
       <li><b>·</b><span>공유 링크에는 입력한 한 줄이 주소에 담겨 전달됩니다. 민감한 내용은 피해 주세요.</span></li>
       <li><b>·</b><span>사진·효과음은 모두 이 페이지에 내장되어 있고, 비용은 들지 않습니다.</span></li>
     </ul>`, null, null);
});

/* 뒤로가기 */
window.addEventListener('popstate', () => {
  const p = new URLSearchParams(location.search);
  const t = p.get('t'), m = p.get('m');
  if (t && m && THEMES.some(x => x.id === t)) openStage(t, m.slice(0, 40), { push:false });
  else showStudio(false);
});

/* 초기화 */
function init(){
  let savedSound = true;
  try { savedSound = localStorage.getItem('epic-say:sound') !== '0'; } catch(e){}
  Sound.on = savedSound;

  let savedTheme = 'news';
  try { savedTheme = localStorage.getItem('epic-say:theme') || 'news'; } catch(e){}
  if (!THEMES.some(t => t.id === savedTheme)) savedTheme = 'news';

  syncInput();
  syncSoundUI();

  const p = new URLSearchParams(location.search);
  const t = p.get('t'), m = p.get('m');
  if (t && m && THEMES.some(x => x.id === t)){
    openStage(t, m.slice(0, 40), { push:false, needsGesture:true });
    return;
  }
  selectTheme(savedTheme);
}

init();
})();
