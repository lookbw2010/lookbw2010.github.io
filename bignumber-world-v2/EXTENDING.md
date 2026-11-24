# 빅넘버월드 V2 · 확장 안내

이 문서는 **새 테마 팩 · 새 게임 규칙 · 새 제휴 브랜드 · 외부 저장소**를 붙이는 방법을 정리한 것입니다.
서비스는 `index.html` + `assets/` + `data/` 만으로 동작하는 정적 사이트이고, 아래 네 곳만 건드리면 확장됩니다.

```
bignumber-world-v2/
├─ index.html                 화면 골격 (뷰 7개)
├─ assets/
│  ├─ core.js                 유틸 · 날짜 시드 · 저장소 래퍼 · 이벤트 버스
│  ├─ adapters.js             PackRepository / ScoreStore / LeadRepository 어댑터
│  ├─ modes.js                게임 규칙 플러그인 레지스트리 + 공통 러너
│  ├─ app.js                  뷰 · 라우팅 · 결과 카드 · 제휴관 · 출제 시트
│  ├─ styles.css              디자인 토큰과 컴포넌트
│  └─ data.bundle.js          오프라인 폴백 번들(자동 생성)
└─ data/
   ├─ packs.json              팩 인덱스 (여기에 한 줄 추가)
   ├─ packs/<id>.json         팩별 문제은행
   ├─ brands.json             제휴 브랜드 인덱스
   ├─ brands/<id>.json        브랜드별 문제 세트
   └─ config.json             어댑터 선택 (static / sheets / rest)
```

---

## 1. 새 테마 팩 추가 — 코드 수정 0줄

### ① 문제 파일 만들기 `data/packs/ocean.json`

```json
{
  "schema": "bnw-v2/pack@1",
  "id": "ocean",
  "name": "바다·해양",
  "emoji": "🌊",
  "color": "#0EA5E9",
  "soft": "#E0F4FE",
  "tagline": "수심과 파도의 숫자",
  "desc": "마리아나 해구부터 파도 높이까지.",
  "count": 4,
  "levels": { "1": 1, "2": 1, "3": 1, "4": 1 },
  "questions": [
    {
      "id": "oc-01",
      "pack": "ocean",
      "lv": 2,
      "form": "pick1",
      "lens": "unit",
      "unit": "m",
      "q": "가장 깊은 곳은?",
      "insight": "수심 10,935m는 에베레스트를 거꾸로 넣고도 2km가 남는다.",
      "src": "기네스 세계기록",
      "opts": [
        { "t": "마리아나 해구", "v": 10935, "u": "m", "n": "10,935 m", "src": "기네스 세계기록" },
        { "t": "에베레스트", "v": 8849, "u": "m", "n": "8,849 m", "src": "2020년 공동 측정" },
        { "t": "백두산", "v": 2744, "u": "m", "n": "2,744 m", "src": "해발 고도" }
      ]
    }
  ]
}
```

### ② 인덱스에 등록 `data/packs.json`

```json
{ "id": "ocean", "name": "바다·해양", "emoji": "🌊", "color": "#0EA5E9",
  "soft": "#E0F4FE", "tagline": "수심과 파도의 숫자", "desc": "...",
  "file": "data/packs/ocean.json", "order": 9, "badge": "NEW" }
```

### ③ 끝

`PackRepository` 가 인덱스를 읽어 모든 팩을 미리 로드하므로 **덕후 월드 · 연승전 · 줄세우기 · 출제 시트**에
자동으로 등장합니다. `lens: "numeral"` 문항을 가진 팩은 **오늘의 크로스오버** 풀에도 자동으로 들어갑니다
(데일리는 모든 팩의 numeral 문항을 모아 날짜 시드로 10문제를 고릅니다).

### 문제 스키마 규칙

| 필드 | 설명 |
|---|---|
| `lens: "unit"` | 보기 전체가 같은 단위. `unit` 필수. 정답 공개 전에는 값이 가려집니다. |
| `lens: "numeral"` | 단위가 달라도 **표시된 숫자 크기**로 비교. 보기마다 `u` 필수, 값은 항상 공개. |
| `opts[].v` | 값(숫자). 필수. |
| `opts[].f` | 수식(예: `"120*8"`). 있으면 `v` 는 계산 결과와 일치해야 하고, 화면에는 식이 보입니다. |
| `opts[].n` | 해설 문구. 값이 들어 있어야 검산을 통과합니다. |
| `opts[].src` | 지식형 보기의 출처. `f` 가 없으면 필수. |
| `opts[].d` | 크로스오버 보기의 분야 태그(예: `"🌌 우주"`). |
| `insight` | 정답 직후 보이는 **한 줄 직관 해설**(110자 이내). |

검산은 아래 명령으로 수행합니다.

```bash
python3 work/bignumber-world-v2-check/build.py
```

검사 항목: 보기 값 중복 0 · 최댓값 유일 · 수식-값 일치 · 단위 일치 · 해설에 실제 값 포함 ·
지식형 보기 출처 존재 · Lv.1~4 분포. 통과하지 못하면 배포용 JSON을 쓰지 않습니다.

---

## 2. 새 게임 규칙 추가 — 모드 1개 등록

`assets/modes.js` 에서 `BNW.modes.register({...})` 한 번이면 덕후 월드·연승전·출제 시트의
규칙 선택지에 자동으로 나타납니다.

```js
BNW.modes.register({
  id: 'ox_speed',
  name: 'O/X 스피드전',
  emoji: '⏱',
  blurb: '10초 안에 O/X를 고릅니다.',
  rules: ['문제당 10초', '정답 80점', '시간 초과는 오답'],
  accepts: function (q) { return q.opts.length >= 3; },
  init: function (state) { state.time = 10; },
  renderQuestion: function (ctx) {
    ctx.host.innerHTML = '<div class="opts">...</div>';
    // ctx.runner.submit(0 | 1) 로 정답 제출
  },
  evaluate: function (ctx, pick) {
    var ok = pick === 0;
    return { ok: ok, points: ok ? 80 : 0 };
  },
  getShareSummary: function (stats) {
    return 'O/X ' + stats.correct + '/' + stats.total;
  }
});
```

공통 진행(진행률·점수·콤보·하트·키보드·결과)은 `BNW.Runner` 가 담당하므로 규칙만 구현하면 됩니다.
선택적으로 `prepare(q)`, `reveal(ctx,res)`, `hud(state)`, `progress(state)`, `subText` 를 덮어쓸 수 있습니다.

---

## 3. 브랜드 전용 URL — `?brand=`

### ① 브랜드 파일 `data/brands/ocean.json`

```json
{
  "schema": "bnw-v2/brand@1",
  "id": "ocean",
  "name": "오션브랜드",
  "company": "오션브랜드",
  "emoji": "🐳",
  "color": "#0369A1",
  "color2": "#67E8F9",
  "slogan": "바다 숫자로 노는 3분",
  "desc": "가상 제휴 데모입니다.",
  "cta": { "label": "제휴 문의", "href": "#brand" },
  "demo": true,
  "questions": [ ... ]
}
```

### ② 인덱스 `data/brands.json` 에 한 줄 추가

```json
{ "id": "ocean", "name": "오션브랜드", "emoji": "🐳", "color": "#0369A1",
  "color2": "#67E8F9", "slogan": "...", "file": "data/brands/ocean.json", "count": 5 }
```

### ③ 끝

`?brand=ocean` 으로 접속하면 브랜드 색·슬로건·전용 문제·CTA가 적용된 미니게임이 열립니다.
규칙 토글(빅넘버 픽 / 3장 줄세우기)과 전용 URL 복사 버튼이 함께 제공됩니다.

---

## 4. 저장소 교체 — 어댑터만 바꾸기

`data/config.json` 한 줄로 전환합니다.

```json
{
  "repository": "sheets",
  "sheetsBase": "https://script.google.com/macros/s/.../exec",
  "scoreStore": "remote",
  "leadRepository": "webhook",
  "apiBase": "https://api.example.com/bnw",
  "leadEndpoint": "https://hooks.example.com/lead"
}
```

| 어댑터 | 역할 | 현재 |
|---|---|---|
| `StaticPackRepository` | `data/*.json` 정적 로드 + 오프라인 번들 폴백 | 기본값 |
| `RemotePackRepository` (`sheets`/`rest`) | 같은 구조를 원격 base 에서 로드 | 전환 지점 |
| `LocalScoreStore` | localStorage 기록 | 기본값 |
| `RemoteScoreStore` | `POST {apiBase}/scores` | 전환 지점 |
| `LocalLeadRepository` | localStorage 접수 | 기본값 |
| `WebhookLeadRepository` | `POST {leadEndpoint}` | 전환 지점 |

원격 어댑터는 `packs.json` · `packs/<id>.json` · `brands.json` · `brands/<id>.json` 만 같은 경로로
노출하면 됩니다. 구글 시트는 "웹에 게시"한 JSON을 중간 서버(Apps Script 등)에서 이 경로로 매핑하면
시트 편집이 곧 문제 등록이 됩니다.

---

## 5. 배포

```bash
cd work/lookbw-hub
git add bignumber-world-v2
git commit -m "빅넘버월드 V2: 크로스오버·줄세우기·연승전·확장 구조"
git push origin main
```

GitHub Pages(`lookbw2010.github.io`)가 `main` 브랜치 루트를 서빙하므로
`https://lookbw2010.github.io/bignumber-world-v2/` 로 바로 배포됩니다.
v1(`bignumber-world/`)은 건드리지 않습니다.
