/* ------------------------------------------------------------------
   Kinlo — i18n data
   One dictionary per locale. Every user-facing string lives here,
   so adding a language means adding one object to this file.
   Speech recognition locale is mapped in SPEECH_LANG.
   ------------------------------------------------------------------ */

const LOCALES = ["ko", "en", "ja"];

const SPEECH_LANG = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };
const FONT_SCALES = ["16px", "19px", "22px"];
const FONT_CLASS = ["fs-1", "fs-2", "fs-3"];

const I18N = {

  /* ============================== KOREAN ============================== */
  ko: {
    htmlLang: "ko",
    title: "킨로 Kinlo — 5060을 위한 깨끗한 일상 SNS",
    brand: { local: "킨로", tagline: "따뜻한 인연과 빛" },

    ui: {
      fontLabel: "글자 크기",
      fontGlyph: "가",
      fontSmall: "보통",
      fontLarge: "크게",
      fontXLarge: "아주 크게",
      writeShort: "글 올리기",
      close: "닫기"
    },

    nav: { feed: "오늘의 피드", clubs: "취향 모임", mine: "나의 킨로" },

    feed: {
      title: "오늘의 피드",
      chips: { all: "전체", walk: "🌿 산책·등산", meal: "🍲 오늘의 밥상", flower: "📸 꽃·풍경", thought: "💭 소소한 생각" },
      question: {
        label: "오늘의 질문",
        q: "오늘 하루 중 가장 기분 좋았던 순간은 언제였나요?",
        cta: "한 줄로 답하기",
        placeholder: "예: 아침에 창문을 열었더니 바람이 시원했어요.",
        submit: "남기기",
        yours: "나의 답",
        edit: "다시 쓰기",
        posted: "답변을 피드에 올렸어요."
      },
      react: { wow: "멋져요", with: "함께해요", cheer: "응원해요" },
      comment: { count: "댓글", placeholder: "한 줄 다정한 댓글을 남겨 보세요.", submit: "남기기", added: "댓글을 남겼어요." },
      end: "여기까지예요. 오늘도 천천히 둘러보세요.",
      mineBadge: "내 글",
      answerBadge: "오늘의 질문에 답함",
      justNow: "방금 전",
      age: "{n}세"
    },

    posts: [
      {
        id: "p1", cat: "walk", img: "walk-morning", author: "박순자", initial: "박", age: 68, ago: "12분 전",
        text: "아침에 집 근처 호수공원을 한 바퀴 천천히 돌았습니다. 물 위에 안개가 남아 있어서 한 장 찍어 두었어요. 40분만 걸었는데도 하루가 참 가볍네요.",
        counts: [12, 5, 3],
        comments: [
          { author: "이정호", text: "사진만 봐도 공기가 좋아 보이네요. 저도 내일 아침에 나가 볼게요." }
        ]
      },
      {
        id: "p2", cat: "meal", img: "home-meal", author: "이정호", initial: "이", age: 63, ago: "1시간 전",
        text: "아내가 된장찌개를 끓였는데 오늘따라 딱 맞게 끓었습니다. 나물 세 가지에 계란말이까지. 이런 날은 밥 한 공기로는 부족하네요.",
        counts: [18, 7, 4],
        comments: [
          { author: "최명희", text: "정갈하네요. 저희 집도 오늘은 된장찌개입니다." }
        ]
      },
      {
        id: "p3", cat: "flower", img: "balcony-flowers", author: "최명희", initial: "최", age: 61, ago: "3시간 전",
        text: "베란다 수국이 드디어 피었습니다. 요즘은 물 주는 재미로 아침이 시작돼요. 옆집에 한 송이 나눠 주고 왔습니다.",
        counts: [21, 4, 6],
        comments: []
      },
      {
        id: "p4", cat: "thought", author: "김영수", initial: "김", age: 66, ago: "5시간 전",
        text: "은퇴하고 나서야 알았습니다. 서두르지 않아도 되는 아침이 이렇게 좋은 줄은 몰랐어요. 오늘은 커피를 두 번 내렸습니다.",
        counts: [15, 9, 2],
        comments: [
          { author: "한미경", text: "저도 요즘 아침에 커피 한 잔을 오래 마십니다." }
        ]
      },
      {
        id: "p5", cat: "thought", author: "한미경", initial: "한", age: 58, ago: "어제",
        text: "손녀가 읽던 책을 빌려 읽었는데 마지막 장에서 울컥했습니다. 내일은 같이 도서관에 가 보려고요. 나이 들어서 읽는 책은 다르게 다가오네요.",
        counts: [24, 3, 8],
        comments: []
      }
    ],

    clubs: {
      title: "취향 모임",
      sub: "같은 것을 좋아하는 사람들과, 부담 없이.",
      members: "명",
      activity: "최근 활동",
      join: "참여하기",
      joined: "참여 중",
      notice: "모임 안내 보기",
      joinedToast: "모임에 참여했어요.",
      leftToast: "참여를 취소했어요.",
      detailJoin: "이 모임 참여하기",
      detailJoined: "참여 중이에요",
      recent: "요즘 이야기",
      items: [
        {
          id: "c1", icon: "🌿", tint: "green", name: "주말 아침 걷기 모임",
          desc: "토요일 아침, 가까운 산길과 호숫가를 함께 걸어요. 속도보다 꾸준함.",
          members: "128명", ago: "오늘 아침 6명이 함께 걸었어요",
          notice: ["매주 토요일 아침 8시에 모입니다. 가까운 산길이나 호숫가를 1시간 정도 함께 걷고, 끝나면 근처에서 차를 마십니다.", "처음 오시면 편한 신발만 챙기세요. 걸음이 느려도 괜찮습니다. 누구도 뒤에 남기지 않아요."]
        },
        {
          id: "c2", icon: "🍲", tint: "terra", name: "제철 집밥 나누기",
          desc: "이번 주 제철 재료로 만든 한 접시와 짧은 레시피를 사진으로 나눕니다.",
          members: "214명", ago: "어제 32개의 레시피가 올라왔어요",
          notice: ["이번 주 제철 재료로 만든 한 접시를 사진과 함께 올려 주세요. 레시피는 길게 쓰지 않아도 됩니다.", "서로의 방식에서 배우는 것이 이 모임의 목적입니다. 맛의 우열을 가리지 않아요."]
        },
        {
          id: "c3", icon: "📸", tint: "sand", name: "사진 잘 찍는 법",
          desc: "매주 한 가지 주제로 한 장씩. 잘 찍는 것보다 왜 담고 싶었는지.",
          members: "176명", ago: "이번 주 주제: 아침 빛",
          notice: ["매주 한 가지 주제로 사진을 찍어 봅니다. 이번 주는 '아침 빛'입니다.", "잘 찍는 것보다, 왜 그 장면을 담고 싶었는지 한 줄을 적어 주세요. 서로 다정하게 조언합니다."]
        },
        {
          id: "c4", icon: "📖", tint: "sky", name: "천천히 읽는 독서회",
          desc: "한 달에 한 권. 다 읽지 못해도 괜찮아요. 읽은 데까지만 나눕니다.",
          members: "92명", ago: "이번 달 도서: 회원 추천 3권 투표 중",
          notice: ["한 달에 한 권을 정해 함께 읽습니다. 이번 달은 회원 추천 세 권 중 투표로 정합니다.", "다 읽지 못해도 괜찮습니다. 읽은 데까지만 나눠요. 읽다 만 자리에서 발견한 것도 좋은 이야깃거리입니다."]
        }
      ]
    },

    mine: {
      hello: "안녕하세요, 김 선생님",
      sub: "오늘도 당신의 하루가 가볍기를 바랍니다.",
      since: "킨로와 함께한 지 3개월",
      glowLabel: "오늘의 킨로 지수",
      glowUnit: "점",
      glowNote: "조용히 잘 지내고 있어요",
      statPosts: "내가 쓴 글",
      statCheers: "받은 응원",
      statClubs: "참여 중인 모임",
      postsTitle: "내가 쓴 글",
      empty: "아직 쓴 글이 없어요. 오늘 있었던 작은 일 하나면 충분합니다.",
      settings: "설정",
      language: "언어",
      noteTitle: "킨로가 지키는 것",
      note: "광고와 낯선 링크를 받지 않습니다. 서로의 하루에 조용히 인사하는 공간입니다.",
      build: "Kinlo — clean everyday SNS (prototype)"
    },

    write: {
      title: "글쓰기",
      sub: "말로 하면, 글이 됩니다.",
      voice: "🎤 말로 편하게 쓰기",
      voiceHint: "버튼을 누르고 오늘 있었던 일을 편하게 말해 보세요.",
      listening: "듣고 있어요… 천천히 말씀해 주세요.",
      stop: "그만 말하기",
      demo: "마이크가 안 되면 체험 모드로 채우기",
      demoOn: "체험 모드로 문장을 채우는 중이에요…",
      demoDone: "체험 모드로 채웠어요. 마음껏 고쳐 쓰세요.",
      done: "잘 들었어요. 아래에서 고쳐 써도 괜찮습니다.",
      denied: "마이크를 쓸 수 없어 체험 모드로 진행했어요.",
      body: "내용",
      placeholder: "오늘 있었던 일을 편하게 적어 주세요.",
      topic: "주제",
      photo: "사진 (선택)",
      noPhoto: "사진 없이",
      submit: "킨로에 올리기",
      needText: "내용을 먼저 적어 주세요.",
      posted: "킨로에 올렸어요.",
      demoText: "오늘 아침에는 오랜만에 집 근처 공원을 천천히 걸었습니다. 바람이 시원해서 기분이 좋았고, 벤치에 앉아 한참 쉬었어요."
    },

    toast: { saved: "저장했어요." }
  },

  /* ============================== ENGLISH ============================== */
  en: {
    htmlLang: "en",
    title: "Kinlo — a clean everyday SNS for active 50s and 60s",
    brand: { local: "", tagline: "Warm kinship, gentle glow" },

    ui: {
      fontLabel: "Text size",
      fontGlyph: "A",
      fontSmall: "Normal",
      fontLarge: "Large",
      fontXLarge: "XL",
      writeShort: "Write",
      close: "Close"
    },

    nav: { feed: "Today", clubs: "Clubs", mine: "My Kinlo" },

    feed: {
      title: "Today at Kinlo",
      chips: { all: "All", walk: "🌿 Walks", meal: "🍲 Today's table", flower: "📸 Flowers", thought: "💭 Small thoughts" },
      question: {
        label: "Today's question",
        q: "What was the nicest moment of your day today?",
        cta: "Answer in one line",
        placeholder: "e.g. I opened the window this morning and the air was cool.",
        submit: "Post",
        yours: "Your answer",
        edit: "Write again",
        posted: "Your answer is now on the feed."
      },
      react: { wow: "Wonderful", with: "With you", cheer: "Cheering" },
      comment: { count: "Comments", placeholder: "Leave one kind line.", submit: "Post", added: "Your comment is posted." },
      end: "That is all for now. Take your time.",
      mineBadge: "Mine",
      answerBadge: "Answered today's question",
      justNow: "Just now",
      age: "age {n}"
    },

    posts: [
      {
        id: "p1", cat: "walk", img: "walk-morning", author: "Soonja Park", initial: "S", age: 68, ago: "12 min ago",
        text: "Took a slow loop around the lake park near my home this morning. Mist was still hanging over the water, so I stopped for a photo. Forty minutes was enough to make the whole day feel lighter.",
        counts: [12, 5, 3],
        comments: [
          { author: "Jungho Lee", text: "The air looks lovely in that photo. I will head out tomorrow morning too." }
        ]
      },
      {
        id: "p2", cat: "meal", img: "home-meal", author: "Jungho Lee", initial: "J", age: 63, ago: "1 hour ago",
        text: "My wife made soybean paste stew today and it came out just right. Three kinds of seasoned greens and a rolled omelette. On a day like this, one bowl of rice is not enough.",
        counts: [18, 7, 4],
        comments: [
          { author: "Myunghee Choi", text: "So neat and warm. We are having the same stew at home today." }
        ]
      },
      {
        id: "p3", cat: "flower", img: "balcony-flowers", author: "Myunghee Choi", initial: "M", age: 61, ago: "3 hours ago",
        text: "The hydrangea on my balcony has finally bloomed. Watering it is how my mornings start now. I took one stem over to the neighbor.",
        counts: [21, 4, 6],
        comments: []
      },
      {
        id: "p4", cat: "thought", author: "Youngsoo Kim", initial: "Y", age: 66, ago: "5 hours ago",
        text: "Only after retiring did I learn how good a morning feels when there is nowhere to rush. I brewed coffee twice today.",
        counts: [15, 9, 2],
        comments: [
          { author: "Mikyung Han", text: "I have been sitting with my morning coffee for a long while lately too." }
        ]
      },
      {
        id: "p5", cat: "thought", author: "Mikyung Han", initial: "M", age: 58, ago: "Yesterday",
        text: "I borrowed a book my granddaughter had been reading, and the last chapter caught me off guard. Tomorrow we are going to the library together. Books read later in life land differently.",
        counts: [24, 3, 8],
        comments: []
      }
    ],

    clubs: {
      title: "Clubs",
      sub: "With people who like the same things, at an easy pace.",
      members: "",
      activity: "Recent",
      join: "Join",
      joined: "Joined",
      notice: "About this club",
      joinedToast: "You joined the club.",
      leftToast: "You left the club.",
      detailJoin: "Join this club",
      detailJoined: "You are a member",
      recent: "Lately",
      items: [
        {
          id: "c1", icon: "🌿", tint: "green", name: "Weekend Morning Walkers",
          desc: "Saturday mornings on a nearby trail or around the lake. Steady over fast.",
          members: "128 members", ago: "Six of us walked together this morning",
          notice: ["We meet every Saturday at 8 a.m. A gentle hour on a nearby trail or around the lake, then tea together close by.", "If it is your first time, just bring comfortable shoes. Walking slowly is fine. Nobody is left behind."]
        },
        {
          id: "c2", icon: "🍲", tint: "terra", name: "Seasonal Home Cooking",
          desc: "One dish from what is in season this week, with a photo and a short recipe.",
          members: "214 members", ago: "32 recipes were shared yesterday",
          notice: ["Post one dish made with what is in season this week, with a photo. The recipe can be short.", "Learning from each other is the point. We do not rank whose cooking is better."]
        },
        {
          id: "c3", icon: "📸", tint: "sand", name: "Better Phone Photos",
          desc: "One theme, one photo a week. More about why than how good.",
          members: "176 members", ago: "This week: morning light",
          notice: ["One photo theme each week. This week it is morning light.", "More than technique, tell us in one line why you wanted that moment. Advice here stays kind."]
        },
        {
          id: "c4", icon: "📖", tint: "sky", name: "Slow Reading Circle",
          desc: "One book a month. Not finishing is fine. Share only as far as you read.",
          members: "92 members", ago: "This month: voting on 3 member picks",
          notice: ["One book a month, chosen together. This month we are voting among three member picks.", "Not finishing is fine. Share only as far as you read. What you notice halfway is a good conversation too."]
        }
      ]
    },

    mine: {
      hello: "Hello, Mr. Kim",
      sub: "May your day stay light today, too.",
      since: "Three months with Kinlo",
      glowLabel: "Today's Kinlo glow",
      glowUnit: "pts",
      glowNote: "Quietly doing well",
      statPosts: "Posts written",
      statCheers: "Cheers received",
      statClubs: "Clubs joined",
      postsTitle: "My posts",
      empty: "Nothing here yet. One small thing from today is enough.",
      settings: "Settings",
      language: "Language",
      noteTitle: "What Kinlo keeps",
      note: "No ads, no unfamiliar links. A quiet place to greet each other's day.",
      build: "Kinlo — clean everyday SNS (prototype)"
    },

    write: {
      title: "New post",
      sub: "Say it, and it becomes a post.",
      voice: "🎤 Write by speaking",
      voiceHint: "Tap and tell us about your day, in your own words.",
      listening: "Listening… take your time.",
      stop: "Stop",
      demo: "No microphone? Fill it in demo mode",
      demoOn: "Filling the text in demo mode…",
      demoDone: "Filled in demo mode. Edit it freely.",
      done: "Got it. You can edit it below.",
      denied: "The microphone was not available, so we used demo mode.",
      body: "Your words",
      placeholder: "Write about today, however it went.",
      topic: "Topic",
      photo: "Photo (optional)",
      noPhoto: "No photo",
      submit: "Post to Kinlo",
      needText: "Please write something first.",
      posted: "Posted to Kinlo.",
      demoText: "This morning I took a slow walk in the park near my home for the first time in a while. The breeze was cool and it felt good, so I sat on a bench for a long while."
    },

    toast: { saved: "Saved." }
  },

  /* ============================== JAPANESE ============================== */
  ja: {
    htmlLang: "ja",
    title: "キンロ Kinlo — 50〜60代のための、きれいな毎日のSNS",
    brand: { local: "キンロ", tagline: "ぬくもりの縁と、やさしい光" },

    ui: {
      fontLabel: "文字の大きさ",
      fontGlyph: "あ",
      fontSmall: "標準",
      fontLarge: "大",
      fontXLarge: "特大",
      writeShort: "投稿する",
      close: "閉じる"
    },

    nav: { feed: "今日のフィード", clubs: "趣味の集い", mine: "私のキンロ" },

    feed: {
      title: "今日のフィード",
      chips: { all: "すべて", walk: "🌿 散歩・山歩き", meal: "🍲 今日の食卓", flower: "📸 花と景色", thought: "💭 ちょっとした想い" },
      question: {
        label: "今日の質問",
        q: "今日、いちばん気持ちよかった瞬間はいつでしたか？",
        cta: "ひとことで答える",
        placeholder: "例：朝、窓を開けたら風が気持ちよかったです。",
        submit: "投稿",
        yours: "私の答え",
        edit: "書き直す",
        posted: "答えをフィードに載せました。"
      },
      react: { wow: "すてき", with: "一緒に", cheer: "応援" },
      comment: { count: "コメント", placeholder: "やさしいひとことをどうぞ。", submit: "送る", added: "コメントしました。" },
      end: "ここまでです。今日もゆっくりどうぞ。",
      mineBadge: "自分の投稿",
      answerBadge: "今日の質問に回答",
      justNow: "たった今",
      age: "{n}歳"
    },

    posts: [
      {
        id: "p1", cat: "walk", img: "walk-morning", author: "パク・スンジャ", initial: "パ", age: 68, ago: "12分前",
        text: "今朝は家の近くの湖の公園をゆっくり一周してきました。水面にまだ霧が残っていたので、一枚撮っておきました。40分歩いただけなのに、一日がとても軽いんです。",
        counts: [12, 5, 3],
        comments: [
          { author: "イ・ジョンホ", text: "写真を見るだけで空気がいいのが分かります。私も明日の朝に出かけてみます。" }
        ]
      },
      {
        id: "p2", cat: "meal", img: "home-meal", author: "イ・ジョンホ", initial: "イ", age: 63, ago: "1時間前",
        text: "妻が味噌チゲを作ったのですが、今日はちょうどいい味でした。ナムルの三種に卵焼きまで。こんな日はご飯一杯では足りません。",
        counts: [18, 7, 4],
        comments: [
          { author: "チェ・ミョンヒ", text: "きれいで温かい食卓ですね。うちも今日は味噌チゲです。" }
        ]
      },
      {
        id: "p3", cat: "flower", img: "balcony-flowers", author: "チェ・ミョンヒ", initial: "チ", age: 61, ago: "3時間前",
        text: "ベランダの紫陽花がやっと咲きました。最近は水やりの楽しみで朝が始まります。お隣に一枝おすそ分けしてきました。",
        counts: [21, 4, 6],
        comments: []
      },
      {
        id: "p4", cat: "thought", author: "キム・ヨンス", initial: "キ", age: 66, ago: "5時間前",
        text: "退職してから気づきました。急がなくていい朝がこんなにいいものだとは知りませんでした。今日はコーヒーを二回いれました。",
        counts: [15, 9, 2],
        comments: [
          { author: "ハン・ミギョン", text: "私も最近、朝のコーヒーを長く楽しんでいます。" }
        ]
      },
      {
        id: "p5", cat: "thought", author: "ハン・ミギョン", initial: "ハ", age: 58, ago: "昨日",
        text: "孫娘が読んでいた本を借りて読んだら、最後の章で胸が熱くなりました。明日は一緒に図書館へ行くつもりです。年を重ねて読む本は、違って響きます。",
        counts: [24, 3, 8],
        comments: []
      }
    ],

    clubs: {
      title: "趣味の集い",
      sub: "同じものが好きな人たちと、気軽に。",
      members: "",
      activity: "最近の様子",
      join: "参加する",
      joined: "参加中",
      notice: "集いの案内",
      joinedToast: "集いに参加しました。",
      leftToast: "参加を取り消しました。",
      detailJoin: "この集いに参加する",
      detailJoined: "参加中です",
      recent: "最近の話題",
      items: [
        {
          id: "c1", icon: "🌿", tint: "green", name: "週末の朝さんぽの会",
          desc: "土曜の朝、近くの山道や湖畔を一緒に歩きます。速さより続けること。",
          members: "128人", ago: "今朝は6人で歩きました",
          notice: ["毎週土曜日の朝8時に集まります。近くの山道や湖畔を1時間ほど一緒に歩き、終わったら近くでお茶をします。", "初めての方は歩きやすい靴だけお持ちください。ゆっくりでも大丈夫。誰も置いていきません。"]
        },
        {
          id: "c2", icon: "🍲", tint: "terra", name: "旬の家庭料理を分かち合う会",
          desc: "今週の旬の食材で作った一皿を、写真と短いレシピで。",
          members: "214人", ago: "昨日32のレシピが届きました",
          notice: ["今週の旬の食材で作った一皿を、写真と一緒に載せてください。レシピは短くて構いません。", "お互いのやり方から学ぶのがこの会の目的です。味の優劣はつけません。"]
        },
        {
          id: "c3", icon: "📸", tint: "sand", name: "スマホ写真の上手な撮り方",
          desc: "毎週ひとつのお題で一枚。上手さより、なぜ残したいか。",
          members: "176人", ago: "今週のお題：朝の光",
          notice: ["毎週ひとつのお題で写真を撮ります。今週は「朝の光」です。", "上手さよりも、なぜその場面を残したかったのかを一行で書いてください。助言はやさしく。"]
        },
        {
          id: "c4", icon: "📖", tint: "sky", name: "ゆっくり読書会",
          desc: "月に一冊。読み終えなくても大丈夫。読んだところまでを。",
          members: "92人", ago: "今月の本：会員推薦3冊を投票中",
          notice: ["月に一冊を決めて一緒に読みます。今月は会員の推薦三冊から投票で決めます。", "読み終えなくても大丈夫。読んだところまでを分かち合いましょう。途中で見つけたことも、いい話の種になります。"]
        }
      ]
    },

    mine: {
      hello: "こんにちは、キムさん",
      sub: "今日も、あなたの一日が軽やかでありますように。",
      since: "キンロとともに3か月",
      glowLabel: "今日のキンロ指数",
      glowUnit: "点",
      glowNote: "静かに、いい調子です",
      statPosts: "書いた投稿",
      statCheers: "もらった応援",
      statClubs: "参加中の集い",
      postsTitle: "私の投稿",
      empty: "まだ投稿がありません。今日の小さなできごと一つで十分です。",
      settings: "設定",
      language: "言語",
      noteTitle: "キンロが守ること",
      note: "広告や見知らぬリンクは入れません。お互いの一日に静かにあいさつする場所です。",
      build: "Kinlo — clean everyday SNS (prototype)"
    },

    write: {
      title: "投稿する",
      sub: "話せば、文章になります。",
      voice: "🎤 話して書く",
      voiceHint: "ボタンを押して、今日のことを気軽に話してみてください。",
      listening: "聞いています… ゆっくりで大丈夫です。",
      stop: "話すのをやめる",
      demo: "マイクが使えないときは体験モードで入力",
      demoOn: "体験モードで文章を入れています…",
      demoDone: "体験モードで入れました。自由に直してください。",
      done: "聞き取れました。下で直しても大丈夫です。",
      denied: "マイクが使えないため、体験モードで進めました。",
      body: "内容",
      placeholder: "今日のことを気軽に書いてください。",
      topic: "お題",
      photo: "写真（任意）",
      noPhoto: "写真なし",
      submit: "キンロに投稿する",
      needText: "内容を先に入力してください。",
      posted: "キンロに投稿しました。",
      demoText: "今朝は久しぶりに家の近くの公園をゆっくり歩きました。風が気持ちよくて、ベンチにしばらく座っていました。"
    },

    toast: { saved: "保存しました。" }
  }
};

const PHOTOS = [
  { key: "walk-morning", file: "assets/walk-morning.jpg" },
  { key: "home-meal", file: "assets/home-meal.jpg" },
  { key: "balcony-flowers", file: "assets/balcony-flowers.jpg" }
];

const PHOTO_ALT = {
  ko: { "walk-morning": "아침 숲길 산책로", "home-meal": "정갈한 집밥 한 상", "balcony-flowers": "햇살 드는 베란다의 화분" },
  en: { "walk-morning": "A quiet forest path in the morning", "home-meal": "A warm home-cooked meal", "balcony-flowers": "Potted flowers on a sunny balcony" },
  ja: { "walk-morning": "朝の森の小道", "home-meal": "整った家庭料理の食卓", "balcony-flowers": "日差しの入るベランダの鉢植え" }
};
