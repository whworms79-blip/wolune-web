// 두 사람의 사주(엔진 결과)를 비교해 "궁합" 뷰모델을 만든다.
// ⚠ 엔진에 궁합 전용 계산을 새로 두지 않는다 — 엔진이 낸 재료(오행·지지·일간·십성)를
//    웹에서 조합할 뿐. 우리는 예언이 아니라 이해 → "궁합 나쁨" 같은 단정은 금지,
//    잘 통하는 점 / 서로 배려하면 좋은 점을 따뜻한 톤으로 전한다.
// 순수 함수(입력이 같으면 항상 같은 결과) — 서버/클라이언트 어디서든 호출 가능.

import type { SajuInput } from "./sajuInput";

export type ElKey = "wood" | "fire" | "earth" | "metal" | "water";

// 엔진 차트에서 궁합 계산에 쓰는 최소 형태(app/saju/result/chart.ts EngineChart의 부분집합).
type CompatPillar = { stem: string; branch: string; stem_element: ElKey; branch_element: ElKey };
export interface CompatChart {
  // 시간 미상이면 hour 가 없다(시주 제외).
  pillars: { year: CompatPillar; month: CompatPillar; day: CompatPillar; hour?: CompatPillar };
  five_elements: Record<ElKey, { pct: number; count?: number }>;
  character?: { name_ko?: string; name_en?: string; tagline?: string };
  // 신살 — 엔진은 해당된 것만 SHENSHA_ORDER 순으로 준다(첫 항목이 그 사람의 대표 결).
  shensha?: { name: string; hanja?: string }[];
}

// ── 오행 매핑 ──
const EL_KO: Record<ElKey, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const EL_HANJA: Record<ElKey, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const ORDER: ElKey[] = ["wood", "fire", "earth", "metal", "water"];

// 상생(生): A 는 GEN[A] 를 낳는다(북돋운다). 목생화·화생토·토생금·금생수·수생목
const GEN: Record<ElKey, ElKey> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
// 상극(剋): A 는 CTRL[A] 를 이긴다. 목극토·토극수·수극화·화극금·금극목
const CTRL: Record<ElKey, ElKey> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

// 천간 오행·음양(십성 산출용)
const STEM_EL: Record<string, ElKey> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire", "戊": "earth",
  "己": "earth", "庚": "metal", "辛": "metal", "壬": "water", "癸": "water",
};
const YANG_STEM = new Set(["甲", "丙", "戊", "庚", "壬"]);

// ── 오행 분포에서 가장 강한/옅은 오행 ──
// best/least 를 null 로 시작해 첫 유효 원소부터 비교 — 특정 오행이 빠져 있어도
// fe[ORDER[0]] 를 맹목적으로 역참조하다 터지지 않는다(부분 응답 방어).
function dominant(fe: Record<ElKey, { pct: number }>): ElKey {
  let best: ElKey | null = null;
  for (const k of ORDER) if (fe[k] && (best === null || fe[k].pct > fe[best].pct)) best = k;
  return best ?? ORDER[0];
}
function weakest(fe: Record<ElKey, { pct: number }>): ElKey {
  let least: ElKey | null = null;
  for (const k of ORDER) if (fe[k] && (least === null || fe[k].pct < fe[least].pct)) least = k;
  return least ?? ORDER[0];
}

// ── 십성(十神): 기준 일간(me) 대비 상대 일간(other)의 관계 ──
// "정"(正)=음양 다름(끌림), "편"(偏)=음양 같음. 엔진의 _ten_god 와 동일 규칙(오행·음양).
function tenGod(me: string, other: string): string {
  const meEl = STEM_EL[me], otEl = STEM_EL[other];
  const same = YANG_STEM.has(me) === YANG_STEM.has(other);
  if (meEl === otEl) return same ? "비견" : "겁재";      // 같은 오행(비겁)
  if (GEN[meEl] === otEl) return same ? "식신" : "상관";  // 내가 낳음(식상)
  if (CTRL[meEl] === otEl) return same ? "편재" : "정재"; // 내가 이김(재성)
  if (CTRL[otEl] === meEl) return same ? "편관" : "정관"; // 나를 이김(관성)
  return same ? "편인" : "정인";                           // 나를 낳음(인성)
}

// 관계에 순한 십성일수록 높게(짝 관계에서 안정적으로 통하는 결). 단정 아님 — 가중치일 뿐.
const TEN_GOD_FAVOR: Record<string, number> = {
  "정재": 8, "정관": 8, "정인": 8, "식신": 7,
  "편재": 6, "편인": 5, "비견": 5,
  "편관": 4, "상관": 4, "겁재": 3,
};

// ── 지지 관계(형충회합) — engine/saju_pillars.py 의 규칙표를 TS로 이식 ──
// 엔진의 relations 는 한 사람의 네 지지 사이를 보지만, 궁합은 "두 사람" 지지 사이를 본다.
const pairKey = (a: string, b: string) => (a < b ? a + b : b + a);
const setOf = (raw: string[]) => new Set(raw.map((s) => pairKey(s[0], s[1])));
const LIUHE = setOf(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);     // 육합(잘 통함)
const LIUCHONG = setOf(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);  // 육충(서로 배려)
const LIUHAI = setOf(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]);    // 육해(잔긴장)
const PO = setOf(["子酉", "午卯", "申巳", "寅亥", "辰丑", "戌未"]);        // 파(잔긴장)
const XING = setOf(["子卯"]);                                             // 상형(잔긴장)
const SANHE_TRIPLES = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];           // 삼합국(둘만 만나면 반합)

function isBanhe(a: string, b: string): boolean {
  if (a === b) return false;
  return SANHE_TRIPLES.some((t) => t.includes(a) && t.includes(b));
}

interface BranchRel {
  he: number;        // 합(육합+삼합반합) 쌍 수
  chong: number;     // 충 쌍 수
  minor: number;     // 형·해·파 쌍 수
  dayHe: boolean;    // 일지-일지 합(배우자궁이 서로 끌림)
  dayChong: boolean; // 일지-일지 충
}

// 두 사람의 네 지지(4×4=16쌍)를 훑어 합/충/잔긴장을 센다. 일지-일지는 따로 표시.
function branchRelations(A: CompatChart, B: CompatChart): BranchRel {
  const keys = ["year", "month", "day", "hour"] as const;
  let he = 0, chong = 0, minor = 0, dayHe = false, dayChong = false;
  for (const ka of keys) {
    for (const kb of keys) {
      const pa = A.pillars[ka], pb = B.pillars[kb];
      if (!pa || !pb) continue;                 // 시간 미상 → 시지 없음, 건너뜀
      const a = pa.branch, b = pb.branch;
      const key = pairKey(a, b);
      const isHe = a !== b && (LIUHE.has(key) || isBanhe(a, b));
      const isChong = LIUCHONG.has(key);
      const isMinor = XING.has(key) || LIUHAI.has(key) || PO.has(key);
      if (isHe) he++;
      if (isChong) chong++;
      if (isMinor) minor++;
      if (ka === "day" && kb === "day") { dayHe = isHe; dayChong = isChong; }
    }
  }
  return { he, chong, minor, dayHe, dayChong };
}

type Harmony = "generate" | "same" | "control";
// 다섯 오행에서 서로 다른 두 오행은 반드시 상생(한 방향) 또는 상극(한 방향) 관계다.
function harmonyOf(domA: ElKey, domB: ElKey): Harmony {
  if (domA === domB) return "same";
  if (GEN[domA] === domB || GEN[domB] === domA) return "generate";
  return "control";
}

// ── 조사(助詞) 고르기 ──
// 문구에 오행·신살 이름이 변수로 박히므로 "이(가)" 같은 이중표기가 나오기 쉽다. 그건 사람이 쓴
// 문장처럼 안 읽힌다 → 마지막 글자의 받침을 보고 하나만 고른다.
// ⚠ 괄호가 붙은 표기("목(木)", "도화(매력)")는 **소리 나는 낱말**을 넘길 것 — josa("목",…).
const hasJong = (w: string): boolean => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const josa = (word: string, withJong: string, noJong: string) =>
  hasJong(word) ? withJong : noJong;

// ── 신살 접점 문구표 ──
// 두 사람의 대표 신살을 이어 "함께일 때 어떤 결인지" 한 문장을 만든다.
// ⚠ 흉살(백호·양인·괴강)도 겁주지 않는다 — 강점의 언어로만 쓴다(용어사전과 같은 톤).
// mid = 문장 중간(…-고), end = 문장 끝(…-는). 신살이 하나뿐이면 end 만 쓴다.
const SHENSHA_TONE: Record<string, { gist: string; mid: string; end: string }> = {
  "천을귀인": { gist: "도움", mid: "서로에게 기댈 언덕이 되고", end: "어려울 때 먼저 손을 내미는" },
  "월덕귀인": { gist: "온기", mid: "서로의 모난 데를 감싸고", end: "함께 있으면 마음이 눅어지는" },
  "문창귀인": { gist: "배움", mid: "이야기가 길어지고", end: "같이 배우고 나누게 되는" },
  "역마": { gist: "움직임", mid: "자주 밖으로 나서게 되고", end: "함께 있으면 어디론가 떠나고 싶어지는" },
  "화개": { gist: "깊이", mid: "말없이도 깊어지고", end: "둘만의 세계가 조용히 깊어지는" },
  "도화": { gist: "매력", mid: "서로에게 자꾸 눈길이 가고", end: "서로에게 자꾸 눈길이 가는" },
  "백호": { gist: "기세", mid: "서로의 기세를 부추기고", end: "함께라면 겁 없이 밀어붙이는" },
  "양인": { gist: "결단", mid: "결정이 빨라지고", end: "머뭇거림을 오래 두지 않는" },
  "괴강": { gist: "강단", mid: "서로의 심지를 알아보고", end: "각자 단단해서 오히려 편안한" },
};

const shenshaNames = (c: CompatChart): string[] =>
  (c.shensha ?? []).map((s) => s.name).filter((n) => n in SHENSHA_TONE);

// ── 뷰모델 ──
export interface CompatPerson {
  name: string;
  initial: string;
  domEl: ElKey;
  elLabel: string;          // "화(火) 강"
  character?: string;       // 캐릭터명("빛나는 검") — 엔진 character.name_ko
  shensha: string[];        // 이 사람의 신살(사전에 있는 것만)
}

// 점수 근거 한 줄. chips 의 delta 를 전부 더하면 base 와 합쳐 정확히 score 가 된다.
// kind 는 색만 정한다 — 명식 형충회합과 같은 규칙(합=라벤더 / 충=화 / 잔긴장=로즈).
export type BasisKind = "he" | "chong" | "minor" | "neutral";
export interface BasisRow {
  chips: { label: string; delta: number }[];
  note: string;
  kind: BasisKind;
}
export interface ScoreBasis {
  base: number;      // 60에서 시작
  rows: BasisRow[];
  score: number;     // base + 모든 delta 의 합 === score (하한/상한 보정도 한 줄로 드러낸다)
  disclosure: string; // ★ 이 점수가 우리가 만든 숫자임을 밝히는 문단 — 이 카드의 핵심
}

// 두 분의 결(신살 접점). 둘 다 신살이 없으면 null.
export interface ShenshaMeet {
  a: string[];
  b: string[];
  line: string;
}

export interface CompatView {
  a: CompatPerson;
  b: CompatPerson;
  score: number;
  harmony: Harmony;
  summary: { title: string; en: string; tagline: string };
  good: string;    // 잘 맞는 결
  tension: string; // 다정한 긴장(배려할 점)
  reflection: string;
  scoreBasis: ScoreBasis;      // 점수 근거 카드
  shenshaMeet: ShenshaMeet | null; // 두 분의 결
  // 근거(디버깅·확장용) — 화면 필수 아님
  basis: {
    dominant: [ElKey, ElKey];
    tenGod: [string, string];
    branch: BranchRel;
  };
}

// 점수 하한·상한. 사주엔 본래 궁합 점수가 없고 '나쁜 궁합'도 없다 →
// 아무리 재료가 어긋나도 58 아래로는 내리지 않는다(그 보정도 근거에 정직하게 드러낸다).
const SCORE_MIN = 58;
const SCORE_MAX = 97;

const DISCLOSURE_HEAD = (base: number, score: number) => `${base}에서 시작해 ${score}`;
const DISCLOSURE_BODY =
  "사주엔 원래 궁합 점수가 없어요. 두 분의 재료를 규칙으로 수치화한 보조 지표일 뿐이고, 낮아도 나쁜 궁합이 아니라 서로 더 배려하면 좋은 사이예요.";

const SUMMARY: Record<Harmony, { title: string; en: string; tagline: string }> = {
  generate: { title: "서로를 키우는 두 사람", en: "The Nurturing Pair", tagline: "곁에 있을수록, 서로를 자라게 하는 사이예요." },
  same: { title: "닮은 결의 두 사람", en: "The Kindred Pair", tagline: "말하지 않아도 통하는 지점이 많은 사이예요." },
  control: { title: "끌어당기는 두 사람", en: "The Magnetic Pair", tagline: "다르기에 오히려 서로에게 끌리는 사이예요." },
};

const person = (name: string, dom: ElKey, c: CompatChart): CompatPerson => ({
  name,
  initial: (name || "?").trim().charAt(0) || "?",
  domEl: dom,
  elLabel: `${EL_KO[dom]}(${EL_HANJA[dom]}) 강`,
  character: c.character?.name_ko || undefined,
  shensha: shenshaNames(c),
});

// 두 사람의 대표 신살(엔진 순서상 첫 항목)로 "함께일 때의 결" 한 문장을 만든다.
function shenshaMeetOf(aName: string, bName: string, ssA: string[], ssB: string[]): ShenshaMeet | null {
  if (!ssA.length && !ssB.length) return null;
  const repA = ssA[0], repB = ssB[0];
  // 조사는 괄호 안의 낱말(gist) 소리를 따라간다 — "도화(매력)이", "화개(깊이)가".
  const tag = (n: string) => `${n}(${SHENSHA_TONE[n].gist})`;
  const g = (n: string) => SHENSHA_TONE[n].gist;

  let line: string;
  if (repA && repB && repA !== repB) {
    line = `${tag(repA)}${josa(g(repA), "과", "와")} ${tag(repB)}${josa(g(repB), "이", "가")} 만나 — ${SHENSHA_TONE[repA].mid} ${SHENSHA_TONE[repB].end} 사이예요.`;
  } else if (repA && repB) {
    // 같은 신살을 나눠 가짐
    line = `두 분 다 ${tag(repA)}${josa(g(repA), "을", "를")} 지녀 — ${SHENSHA_TONE[repA].end} 사이예요.`;
  } else {
    const only = repA ?? repB;
    const who = repA ? aName : bName;
    line = `${who}님의 ${tag(only)}${josa(g(only), "이", "가")} 두 분 사이에 놓여 — ${SHENSHA_TONE[only].end} 결이 돼요.`;
  }
  return { a: ssA, b: ssB, line };
}

export function buildCompatibility(
  A: CompatChart,
  B: CompatChart,
  aNameIn?: string,
  bNameIn?: string,
): CompatView {
  const aName = (aNameIn || "").trim() || "나";
  const bName = (bNameIn || "").trim() || "상대";

  const domA = dominant(A.five_elements);
  const domB = dominant(B.five_elements);
  const weakA = weakest(A.five_elements);
  const weakB = weakest(B.five_elements);
  const h = harmonyOf(domA, domB);

  const dayA = A.pillars.day.stem, dayB = B.pillars.day.stem;
  const godAB = tenGod(dayA, dayB); // A(일간) 입장에서 본 B
  const godBA = tenGod(dayB, dayA); // B(일간) 입장에서 본 A
  const br = branchRelations(A, B);

  // ── 점수(0~100, 따뜻한 하한 유지) ──
  // 사주엔 본래 궁합 '점수'가 없다. 아래는 재료를 명시적 규칙으로 수치화한 보조 지표일 뿐,
  // 낮아도 '나쁜 궁합'이 아니라 '서로 더 배려하면 좋은 사이'다(그래서 하한 58).
  //
  // ⚠ 점수와 근거는 **여기서 한 번에** 만든다. 근거를 나중에 따로 재구성하면 언젠가
  //    어긋나고, 그러면 화면의 덧셈이 안 맞는다 — 점수를 정직하게 밝히겠다는 카드가
  //    거짓말을 하게 된다. rows 의 delta 총합 + base 는 **항상** score 와 같다(아래 보정 포함).
  const base = 60;
  const rows: BasisRow[] = [];
  const push = (kind: BasisKind, note: string, ...chips: { label: string; delta: number }[]) => {
    rows.push({ chips, note, kind });
  };

  // 1) 오행 관계(상생 / 비화 / 상극)
  const elA = `${EL_KO[domA]}(${EL_HANJA[domA]})`;
  const elB = `${EL_KO[domB]}(${EL_HANJA[domB]})`;
  if (h === "generate") {
    const [gv, rc] = GEN[domA] === domB ? [domA, domB] : [domB, domA];
    const gl = `${EL_KO[gv]}(${EL_HANJA[gv]})`, rl = `${EL_KO[rc]}(${EL_HANJA[rc]})`;
    // "목(木)이 화(火)를 낳는 사이"
    push("he", `${gl}${josa(EL_KO[gv], "이", "가")} ${rl}${josa(EL_KO[rc], "을", "를")} 낳는 사이`,
      { label: "상생", delta: 16 });
  } else if (h === "same") {
    push("he", `둘 다 ${elA}의 결 — 닮은 기운끼리`, { label: "비화", delta: 11 });
  } else {
    push("minor", `${elA}${josa(EL_KO[domA], "과", "와")} ${elB} — 서로를 다잡아 주는 결`,
      { label: "상극", delta: 7 });
  }

  // 2) 일간(십성) — 두 사람이 서로를 어떻게 보는가
  const fAB = TEN_GOD_FAVOR[godAB] ?? 4;
  const fBA = TEN_GOD_FAVOR[godBA] ?? 4;
  const godDelta = Math.round((fAB + fBA) / 2); // +3~+8
  const godPair = godAB === godBA ? godAB : `${godAB}·${godBA}`;
  push(
    godDelta >= 7 ? "he" : godDelta >= 5 ? "he" : "minor",
    godDelta >= 7 ? "서로에게 순한 관계"
      : godDelta >= 5 ? "무난하게 통하는 관계"
      : "서로를 자극하는 관계 — 그 자극이 서로를 키우기도 해요",
    { label: `일간 ${godPair}`, delta: godDelta },
  );

  // 3) 지지의 합(合) — 잘 맞물리는 자리. 일지(배우자궁)는 따로 가산.
  const heDelta = Math.min(br.he, 3) * 4;
  if (heDelta > 0 || br.dayHe) {
    const chips: { label: string; delta: number }[] = [];
    if (heDelta > 0) chips.push({ label: `지지 합 ${Math.min(br.he, 3)}쌍`, delta: heDelta });
    if (br.dayHe) chips.push({ label: "일지 합", delta: 6 });
    push("he", br.dayHe ? "배우자궁이 맞물림" : "편안하게 통하는 자리가 있음", ...chips);
  }

  // 4) 충(沖) — 부딪히는 자리
  const chongDelta = Math.min(br.chong, 3) * 3;
  if (chongDelta > 0 || br.dayChong) {
    const chips: { label: string; delta: number }[] = [];
    if (chongDelta > 0) chips.push({ label: `충 ${Math.min(br.chong, 3)}쌍`, delta: -chongDelta });
    if (br.dayChong) chips.push({ label: "일지 충", delta: -3 });
    push("chong", "급할 때 부딪힐 수 있음 — 속도를 맞추면 힘이 돼요", ...chips);
  }

  // 5) 형·해·파 — 잔긴장
  const minorDelta = Math.min(br.minor, 2) * 2;
  if (minorDelta > 0) {
    push("minor", "가끔 결이 어긋나는 순간", { label: `형·해·파 ${Math.min(br.minor, 2)}쌍`, delta: -minorDelta });
  }

  // 6) 빈 곳을 채워 줌 — 한쪽의 강한 오행이 다른 쪽의 옅은 오행일 때
  if (domA === weakB) push("he", `${aName}님이 ${bName}님에게 옅은 ${elA}${josa(EL_KO[domA], "을", "를")} 채워 줌`, { label: "빈 곳을 채움", delta: 5 });
  if (domB === weakA) push("he", `${bName}님이 ${aName}님에게 옅은 ${elB}${josa(EL_KO[domB], "을", "를")} 채워 줌`, { label: "빈 곳을 채움", delta: 5 });

  const raw = base + rows.reduce((s, r) => s + r.chips.reduce((t, c) => t + c.delta, 0), 0);
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw));

  // 7) 하한·상한 보정도 숨기지 않는다 — 이 줄이 있어야 화면의 덧셈이 실제로 맞는다.
  if (score !== raw) {
    push(
      "neutral",
      score > raw
        ? `궁합에 '나쁨'은 없어서 ${SCORE_MIN} 아래로는 내리지 않아요`
        : `아무리 잘 맞아도 ${SCORE_MAX}까지만 — 완벽한 궁합은 없으니까요`,
      { label: score > raw ? "하한 보정" : "상한 보정", delta: score - raw },
    );
  }

  const scoreBasis: ScoreBasis = {
    base,
    rows,
    score,
    disclosure: `${DISCLOSURE_HEAD(base, score)} — ${DISCLOSURE_BODY}`,
  };

  // ── 잘 맞는 결 ──
  let good: string;
  if (h === "generate") {
    const giverIsA = GEN[domA] === domB;
    const giver = giverIsA ? aName : bName;
    const receiver = giverIsA ? bName : aName;
    const gel = giverIsA ? domA : domB;
    good = `${giver}님의 ${EL_KO[gel]}(${EL_HANJA[gel]}) 기운이 ${receiver}님을 북돋아, 함께일수록 서로를 자라게 해요.`;
  } else if (br.dayHe) {
    good = "두 분의 일지(日支)가 서로 맞물려(합), 마음 깊은 곳에서 자연스레 손발이 맞는 사이예요.";
  } else if (br.he > 0) {
    good = "두 분의 지지에 서로를 끌어안는 합(合)이 있어, 함께 있으면 편안하게 통하는 순간이 많아요.";
  } else if (h === "same") {
    good = `두 분 다 ${EL_KO[domA]}(${EL_HANJA[domA]})의 결이 뚜렷해, 취향과 속도가 닮아 말이 잘 통해요.`;
  } else if (domA === weakB || domB === weakA) {
    const richIsA = domA === weakB;
    const rich = richIsA ? aName : bName;
    const need = richIsA ? bName : aName;
    const el = richIsA ? domA : domB;
    good = `${need}님에게 옅은 ${EL_KO[el]}(${EL_HANJA[el]}) 기운을 ${rich}님이 지니고 있어, 서로의 빈자리를 채워줘요.`;
  } else {
    good = "서로 다른 기운을 지녀, 함께할 때 시야가 넓어지는 사이예요.";
  }

  // ── 다정한 긴장(배려할 점) ──
  let tension: string;
  if (h === "control") {
    tension = `${EL_KO[domA]}(${EL_HANJA[domA]})와 ${EL_KO[domB]}(${EL_HANJA[domB]})처럼 방식이 다를 수 있어요 — 다름을 틀림으로 읽지 않으면, 그 다름이 오히려 끌림이 됩니다.`;
  } else if (br.dayChong) {
    tension = "두 분의 일지가 부딪히는(충) 자리가 있어, 가까운 사이일수록 사소한 데서 마찰이 날 수 있어요. 한 박자 쉬어 주면 그 긴장이 서로를 깨우는 힘이 됩니다.";
  } else if (br.chong > 0) {
    tension = "지지에 서로 밀어내는 충(沖)의 기운이 있어, 급할 땐 부딪힐 수 있어요. 속도를 맞춰 주면 그 긴장이 관계를 더 단단하게 만들어요.";
  } else if (h === "same") {
    tension = "닮은 만큼 고집도 닮아, 같은 자리에서 서로 물러서지 않을 때가 있어요. 번갈아 기대 주면 돼요.";
  } else if (br.minor > 0) {
    tension = "가끔 결이 어긋나는 순간이 있을 수 있어요. 서로의 방식을 먼저 물어봐 주면 금세 풀려요.";
  } else {
    tension = "서로의 속도가 다를 수 있으니, 기다려 주는 마음이 두 분을 더 가깝게 해요.";
  }

  const pa = person(aName, domA, A);
  const pb = person(bName, domB, B);

  return {
    a: pa,
    b: pb,
    score,
    harmony: h,
    summary: SUMMARY[h],
    good,
    tension,
    reflection: "최근 두 사람 사이, 가장 좋았던 순간은 언제였나요?",
    scoreBasis,
    shenshaMeet: shenshaMeetOf(aName, bName, pa.shensha, pb.shensha),
    basis: { dominant: [domA, domB], tenGod: [godAB, godBA], branch: br },
  };
}

// ── 공유 링크 코덱: 한 사람(이름+사주입력) ↔ URL 파라미터 ──
// 링크로 궁합 결과를 나누는 획득 통로. 서버(SSR 디코드)·클라이언트(생성) 양쪽에서 쓰므로
// 어디서나 동작하는 encode/decodeURIComponent 만 사용한다.
// ⚠ 개인정보: URL에 생일이 담긴다. 이름은 선택(닉네임/이니셜) — 사주 계산에 필요한 값만 필수.
export interface SharePerson {
  name: string;
  input: SajuInput;
}

const SHARE_SEP = "~";

// name~date~time~city~gender(m/f)~calendar(s/l)~leap(1/0) → encodeURIComponent
export function encodePerson(name: string, inp: SajuInput): string {
  const parts = [
    (name || "").trim().slice(0, 12),
    inp.date,
    inp.time || "",
    (inp.city || "").trim(),
    inp.gender === "male" ? "m" : "f",
    inp.calendar === "lunar" ? "l" : "s",
    inp.is_leap_month ? "1" : "0",
  ];
  return encodeURIComponent(parts.join(SHARE_SEP));
}

// raw: URLSearchParams가 이미 퍼센트 디코드한 값(name~date~time~city~gender~calendar~leap).
export function decodePerson(raw: string | undefined | null): SharePerson | null {
  if (!raw) return null;
  const p = raw.split(SHARE_SEP);
  if (p.length < 7) return null;
  const [name, date, time, city, gender, calendar, leap] = p;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null; // 최소 검증: 생년월일 형식
  const isLunar = calendar === "l";
  const input: SajuInput = {
    date,
    time: /^\d{1,2}:\d{2}$/.test(time) ? time : undefined,
    city: city || undefined,
    gender: gender === "m" ? "male" : "female",
    calendar: isLunar ? "lunar" : "solar",
    is_leap_month: isLunar && leap === "1" ? true : undefined,
  };
  return { name: name || "", input };
}
