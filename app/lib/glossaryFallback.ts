// engine/glossary.py 에서 자동 생성됨 — 직접 고치지 말 것 (py engine/export_glossary.py)
// 엔진(GET /v1/glossary) 이 진실의 원천이다. 이 파일은 엔진을 못 부를 때만 쓰는 폴백.
import type { GlossaryData } from "./glossary";

export const GLOSSARY_FALLBACK: GlossaryData = {
  "version": "1.1.0",
  "count": 62,
  "inline_terms": [
    "진태양시",
    "형충회합",
    "배우자궁",
    "지장간",
    "일간",
    "대운",
    "세운",
    "월운",
    "오행",
    "명식",
    "십성",
    "공망",
    "정관",
    "편관",
    "정인",
    "편인",
    "식신",
    "상관",
    "정재",
    "편재",
    "비견",
    "겁재",
    "상생",
    "상극",
    "비화"
  ],
  "terms": [
    {
      "key": "일간",
      "name": "일간",
      "hanja": "日干",
      "short": "태어난 날을 나타내는 글자로, 사주에서 ‘나 자신’을 뜻하는 기준점이에요.",
      "category": "concept"
    },
    {
      "key": "대운",
      "name": "대운",
      "hanja": "大運",
      "short": "10년 단위로 바뀌는 인생의 큰 흐름이에요.",
      "category": "concept"
    },
    {
      "key": "세운",
      "name": "세운",
      "hanja": "歲運",
      "short": "그 해 한 해의 흐름이에요.",
      "category": "concept"
    },
    {
      "key": "월운",
      "name": "월운",
      "hanja": "月運",
      "short": "그 달 한 달의 흐름이에요. 절기를 기준으로 나눕니다.",
      "category": "concept"
    },
    {
      "key": "오행",
      "name": "오행",
      "hanja": "五行",
      "short": "목·화·토·금·수 다섯 가지 기운으로, 사주를 이루는 재료예요.",
      "category": "concept"
    },
    {
      "key": "신살",
      "name": "신살",
      "hanja": "神殺",
      "short": "특정 조합에서 나타나는 상징적인 기운에 붙인 별칭이에요.",
      "category": "concept"
    },
    {
      "key": "진태양시",
      "name": "진태양시",
      "hanja": "眞太陽時",
      "short": "그 지역의 실제 태양 위치에 맞춰 보정한 시각이에요. 태어난 ‘시’를 더 정확히 봅니다.",
      "category": "concept"
    },
    {
      "key": "명식",
      "name": "명식",
      "hanja": "命式",
      "short": "태어난 연·월·일·시를 여덟 글자로 펼친 사주 원본이에요.",
      "category": "concept"
    },
    {
      "key": "상생",
      "name": "상생",
      "hanja": "相生",
      "short": "한 기운이 다른 기운을 낳아 북돋우는 사이예요. 목생화·화생토처럼 이어집니다.",
      "category": "concept"
    },
    {
      "key": "상극",
      "name": "상극",
      "hanja": "相剋",
      "short": "한 기운이 다른 기운을 누르는 사이예요. 나쁜 게 아니라, 서로를 다잡아 주는 결이에요.",
      "category": "concept"
    },
    {
      "key": "비화",
      "name": "비화",
      "hanja": "比和",
      "short": "같은 기운끼리 나란한 사이예요. 닮은 만큼 말이 잘 통합니다.",
      "category": "concept"
    },
    {
      "key": "배우자궁",
      "name": "배우자궁",
      "hanja": "配偶者宮",
      "short": "일지(태어난 날의 아래 글자) 자리로, 짝과의 인연을 보는 자리예요.",
      "category": "concept"
    },
    {
      "key": "십성",
      "name": "십성",
      "hanja": "十神",
      "short": "여덟 글자 하나하나가 ‘나(일간)’와 어떤 관계인지 이름 붙인 것이에요.",
      "category": "ten_god"
    },
    {
      "key": "일원",
      "name": "일원",
      "hanja": "日元",
      "short": "사주의 기준점인 ‘나 자신’이에요. 다른 글자들은 모두 이 자리를 기준으로 읽습니다.",
      "category": "ten_god"
    },
    {
      "key": "정관",
      "name": "정관",
      "hanja": "正官",
      "short": "나를 바르게 이끄는 책임·질서의 기운이에요. 자리를 지키고 신뢰를 쌓는 결.",
      "category": "ten_god"
    },
    {
      "key": "편관",
      "name": "편관",
      "hanja": "偏官",
      "short": "나를 단련시키는 도전·압박의 기운이에요. 부담을 힘으로 바꾸는 결.",
      "category": "ten_god"
    },
    {
      "key": "정인",
      "name": "정인",
      "hanja": "正印",
      "short": "나를 채워주는 배움·보살핌의 기운이에요. 기대고 배우기 좋은 결.",
      "category": "ten_god"
    },
    {
      "key": "편인",
      "name": "편인",
      "hanja": "偏印",
      "short": "남다른 직관과 탐구의 기운이에요. 깊이 파고드는 결.",
      "category": "ten_god"
    },
    {
      "key": "식신",
      "name": "식신",
      "hanja": "食神",
      "short": "편안하게 표현하고 즐기는 기운이에요. 여유롭게 피어나는 결.",
      "category": "ten_god"
    },
    {
      "key": "상관",
      "name": "상관",
      "hanja": "傷官",
      "short": "틀을 넘어 재능을 드러내는 변화의 기운이에요.",
      "category": "ten_god"
    },
    {
      "key": "정재",
      "name": "정재",
      "hanja": "正財",
      "short": "꾸준히 쌓아가는 현실적 결실의 기운이에요. 성실하게 모으는 결.",
      "category": "ten_god"
    },
    {
      "key": "편재",
      "name": "편재",
      "hanja": "偏財",
      "short": "넓게 굴리는 기회·확장의 기운이에요. 크게 움직이는 결.",
      "category": "ten_god"
    },
    {
      "key": "비견",
      "name": "비견",
      "hanja": "比肩",
      "short": "나를 세우는 자립과 동료의 기운이에요.",
      "category": "ten_god"
    },
    {
      "key": "겁재",
      "name": "겁재",
      "hanja": "劫財",
      "short": "겨루며 밀고 나아가는 경쟁·추진의 기운이에요.",
      "category": "ten_god"
    },
    {
      "key": "지장간",
      "name": "지장간",
      "hanja": "支藏干",
      "short": "지지(아래 글자) 속에 숨어 있는 천간이에요. 겉으로 드러나지 않은 속마음 같은 기운입니다.",
      "category": "chart"
    },
    {
      "key": "십이운성",
      "name": "십이운성",
      "hanja": "十二運星",
      "short": "‘나(일간)’가 그 자리에서 어느 기운의 단계에 있는지를 사람의 일생에 빗대 표현한 거예요.",
      "category": "chart"
    },
    {
      "key": "공망",
      "name": "공망",
      "hanja": "空亡",
      "short": "그 자리의 기운이 비어 있다는 뜻이에요. 나쁜 게 아니라, 채우기보다 비우고 흘려보내기 좋은 자리예요.",
      "category": "chart"
    },
    {
      "key": "장생",
      "name": "장생",
      "hanja": "長生",
      "short": "갓 태어나 기운이 움트는 단계예요. 새로 시작하기 좋은 결.",
      "category": "twelve_stage"
    },
    {
      "key": "목욕",
      "name": "목욕",
      "hanja": "沐浴",
      "short": "다듬어지는 단계예요. 흔들리기도 하지만 그만큼 자라는 결.",
      "category": "twelve_stage"
    },
    {
      "key": "관대",
      "name": "관대",
      "hanja": "冠帶",
      "short": "옷을 갖춰 입는 단계예요. 준비를 마치고 나서기 좋은 결.",
      "category": "twelve_stage"
    },
    {
      "key": "건록",
      "name": "건록",
      "hanja": "建祿",
      "short": "제 몫을 단단히 하는 단계예요. 자리를 지키며 쌓아가는 결.",
      "category": "twelve_stage"
    },
    {
      "key": "제왕",
      "name": "제왕",
      "hanja": "帝旺",
      "short": "기운이 가장 무르익은 단계예요. 힘이 넘치는 만큼 조절이 필요한 결.",
      "category": "twelve_stage"
    },
    {
      "key": "쇠",
      "name": "쇠",
      "hanja": "衰",
      "short": "정점을 지나 차분해지는 단계예요. 힘을 아끼고 고르기 좋은 결.",
      "category": "twelve_stage"
    },
    {
      "key": "병",
      "name": "병",
      "hanja": "病",
      "short": "잠시 쉬어가는 단계예요. 무리하기보다 돌보기 좋은 결.",
      "category": "twelve_stage"
    },
    {
      "key": "사",
      "name": "사",
      "hanja": "死",
      "short": "움직임이 멎고 안으로 가라앉는 단계예요. 끝이 아니라 정리와 사색의 결.",
      "category": "twelve_stage"
    },
    {
      "key": "묘",
      "name": "묘",
      "hanja": "墓",
      "short": "안으로 갈무리하는 단계예요. 품고 모아두기 좋은 결.",
      "category": "twelve_stage"
    },
    {
      "key": "절",
      "name": "절",
      "hanja": "絕",
      "short": "이전 흐름이 끊기고 비워지는 단계예요. 새 흐름을 받을 준비의 결.",
      "category": "twelve_stage"
    },
    {
      "key": "태",
      "name": "태",
      "hanja": "胎",
      "short": "새 기운이 씨앗처럼 맺히는 단계예요. 아직 보이지 않지만 시작되는 결.",
      "category": "twelve_stage"
    },
    {
      "key": "양",
      "name": "양",
      "hanja": "養",
      "short": "조용히 길러지는 단계예요. 서두르지 않고 품어 키우는 결.",
      "category": "twelve_stage"
    },
    {
      "key": "형충회합",
      "name": "형충회합",
      "hanja": "刑沖會合",
      "short": "네 지지(아래 글자들) 사이에 흐르는 관계예요. 어울리기도, 부딪히기도 하며 결을 만듭니다.",
      "category": "relation"
    },
    {
      "key": "육합",
      "name": "육합",
      "hanja": "六合",
      "short": "두 지지가 짝을 이뤄 서로 끌어당기는 관계예요. 자연스레 손발이 맞는 결.",
      "category": "relation"
    },
    {
      "key": "삼합",
      "name": "삼합",
      "hanja": "三合",
      "short": "세 지지가 모여 하나의 큰 기운을 이루는 관계예요. 힘이 한 방향으로 모이는 결.",
      "category": "relation"
    },
    {
      "key": "방합",
      "name": "방합",
      "hanja": "方合",
      "short": "같은 계절의 지지끼리 모여 기운이 짙어지는 관계예요.",
      "category": "relation"
    },
    {
      "key": "육충",
      "name": "육충",
      "hanja": "六沖",
      "short": "마주 보는 두 지지가 서로 부딪히는 관계예요. 흔들리는 만큼 움직임과 변화가 생기는 결.",
      "category": "relation"
    },
    {
      "key": "육해",
      "name": "육해",
      "hanja": "六害",
      "short": "서로 살짝 어긋나는 관계예요. 크게 티 나진 않지만 은근히 신경 쓰이는 결.",
      "category": "relation"
    },
    {
      "key": "형",
      "name": "형",
      "hanja": "刑",
      "short": "서로를 다듬으며 마찰이 이는 관계예요. 불편한 만큼 정돈되기도 하는 결.",
      "category": "relation"
    },
    {
      "key": "파",
      "name": "파",
      "hanja": "破",
      "short": "이어지던 흐름이 한 번 끊기는 관계예요. 무너짐이 아니라 다시 짜기 좋은 결.",
      "category": "relation"
    },
    {
      "key": "상형",
      "name": "상형",
      "hanja": "相刑",
      "short": "두 지지가 서로를 다듬는 형이에요. 부딪히며 서로를 깎아 정돈하는 결.",
      "category": "relation"
    },
    {
      "key": "자형",
      "name": "자형",
      "hanja": "自刑",
      "short": "같은 지지끼리 스스로를 다듬는 형이에요. 안에서 스스로와 겨루는 결.",
      "category": "relation"
    },
    {
      "key": "천을귀인",
      "name": "천을귀인",
      "hanja": "天乙貴人",
      "short": "어려울 때 돕는 사람(귀인)이 따르는 기운이에요.",
      "category": "shensha"
    },
    {
      "key": "문창귀인",
      "name": "문창귀인",
      "hanja": "文昌貴人",
      "short": "배움·글·표현에 재능이 붙는 기운이에요.",
      "category": "shensha"
    },
    {
      "key": "역마",
      "name": "역마",
      "hanja": "驛馬",
      "short": "이동·변화·활동이 많은 기운이에요. 여행·타지·바쁜 움직임.",
      "category": "shensha"
    },
    {
      "key": "화개",
      "name": "화개",
      "hanja": "華蓋",
      "short": "예술·사색·고독의 기운이에요. 깊이 몰입하는 결.",
      "category": "shensha"
    },
    {
      "key": "도화",
      "name": "도화",
      "hanja": "桃花",
      "short": "매력과 인기, 사람을 끄는 기운이에요.",
      "category": "shensha"
    },
    {
      "key": "백호",
      "name": "백호",
      "hanja": "白虎",
      "short": "강렬하고 굳센 기운이에요. 추진력이 세고 기복도 있는 결.",
      "category": "shensha"
    },
    {
      "key": "양인",
      "name": "양인",
      "hanja": "羊刃",
      "short": "날카롭고 강한 힘의 기운이에요. 결단이 칼 같은 결.",
      "category": "shensha"
    },
    {
      "key": "괴강",
      "name": "괴강",
      "hanja": "魁罡",
      "short": "강단·카리스마·독립심이 두드러지는 기운이에요.",
      "category": "shensha"
    },
    {
      "key": "월덕귀인",
      "name": "월덕귀인",
      "hanja": "月德貴人",
      "short": "덕과 보호가 따르는 온화한 기운이에요.",
      "category": "shensha"
    },
    {
      "key": "삼형",
      "name": "삼형",
      "hanja": "三刑",
      "short": "세 지지가 얽혀 서로를 다듬는 형이에요. 얽힌 만큼 크게 정돈되기도 하는 결.",
      "category": "relation"
    },
    {
      "key": "여기",
      "name": "여기",
      "hanja": "餘氣",
      "short": "지장간의 첫 자리예요. 앞 계절에서 남아 흐르는 기운입니다.",
      "category": "chart"
    },
    {
      "key": "중기",
      "name": "중기",
      "hanja": "中氣",
      "short": "지장간의 가운데 자리예요. 다음 기운으로 건너가는 중간 결입니다.",
      "category": "chart"
    },
    {
      "key": "정기",
      "name": "정기",
      "hanja": "正氣",
      "short": "지장간의 마지막 자리예요. 그 지지를 대표하는 중심 기운입니다.",
      "category": "chart"
    }
  ]
};
