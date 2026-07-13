// 엔진(engine/server.py) JSON → 결과 화면 뷰모델 변환.
// 원본 screens/saju-result.html 의 바인딩 로직을 TypeScript로 이식.
// 서버 컴포넌트에서 호출(순수 함수, DOM 의존 없음).


export type ElKey = "wood" | "fire" | "earth" | "metal" | "water";

// 십성(十神) — 일간(나) 기준 그 글자와의 관계. 일간 자신은 stem이 "일원"으로 온다.
interface TenGod {
  stem: string;
  branch: string;
}
// 지장간(支藏干) — 지지 속에 숨은 천간(여기·중기·정기). ※ 타입만 선언, 화면 표시는 다음 단계.
interface HiddenStem {
  stem: string;
  position: string; // 여기 | 중기 | 정기
  position_en: string; // residual | middle | primary
  ten_god: string;
}
interface Pillar {
  stem: string;
  branch: string;
  stem_element: ElKey;
  branch_element: ElKey;
  // 엔진은 아래 필드도 이미 보내준다(구버전/부분응답 대비해 옵셔널).
  ten_god?: TenGod; // 십성 — 이번 단계에서 명식 표에 표시
  hidden_stems?: HiddenStem[]; // 지장간 — 다음 단계
  twelve_stage?: string; // 12운성 — 다음 단계
  is_void?: boolean; // 공망 — 다음 단계
}
interface LuckPillar {
  start_age: number;
  stem: string;
  branch: string;
}
// 엔진이 내려주는 해석 문구. 예전엔 웹(여기)과 앱(saju_view.dart)이 같은 십성 문구
// 테이블을 **각자** 하드코딩하고 있었다 — 용어사전(웹 53 / 앱 26)이 어긋났던 것과 같은 구조.
// 이제 engine/fortune_copy.py 한 곳에서 온다.
interface FortuneCopy {
  title: string;
  tone: string;
}
interface AnnualPillar {
  year: number;
  stem: string;
  branch: string;
  stem_ten_god?: string;
  fields?: Record<string, number>; // 세운 분야별 점수(재물·애정·건강·성장), 0~100
  matched_field?: string;
  copy?: FortuneCopy;
}
// 월운(月運) 한 달 — 절기 기준. **점수가 없다**(달마다 점수를 매기면 '나쁜 달'이 생긴다).
interface MonthlyPillar {
  year: number;
  month: number;
  stem: string;
  branch: string;
  stem_element: ElKey;
  stem_ten_god?: string;
  copy?: FortuneCopy;
}
// 형충회합(刑沖會合) — 네 지지 사이 관계 한 건.
// type: 육합·삼합·방합·육충·육해·형·파 / subtype: 상형·자형·완전·반합 … (없으면 null)
interface EngineRelation {
  type: string;
  subtype?: string | null;
  pillars?: string[]; // 한글 기둥명 (예: ["월지","일지"])
  pillar_keys?: string[]; // 영문 키 (예: ["month","day"])
  branches?: string[]; // 지지 한자 (예: ["卯","戌"])
}
export interface EngineChart {
  input?: { birth_datetime_local?: string; hour_known?: boolean };
  character?: { name_ko: string; name_en: string; tagline: string };
  five_elements?: Record<ElKey, { pct: number }>;
  shensha?: { name: string }[];
  // 시간 미상이면 hour 가 없다(시주 제외).
  pillars?: { year: Pillar; month: Pillar; day: Pillar; hour?: Pillar };
  calc_meta?: { true_solar_time_applied?: boolean };
  luck_pillars?: { direction_ko?: string; pillars?: LuckPillar[] };
  annual_fortune?: { base_year: number; day_master: string; pillars?: AnnualPillar[] };
  monthly_fortune?: {
    base_year: number;
    base_month: number;
    day_master: string;
    pillars?: MonthlyPillar[];
  };
  relations?: EngineRelation[]; // 형충회합
}

export interface ElementBar {
  key: ElKey;
  ko: string;
  pct: string;
  h: number;
  strong: boolean;
}
// 형충회합 한 줄 — [배지] 기둥들 · 지지들 — 느낌
export type RelKind = "harmony" | "clash" | "tension";
export interface RelationRow {
  term: string; // 툴팁에 쓸 용어(사전에 있는 것)
  label: string; // 배지 텍스트 — subtype 있으면 그것(상형), 없으면 type(육합)
  kind: RelKind; // 색: 합=라벤더 / 충=화 / 그 외=로즈
  pillars: string; // "월지·일지"
  branches: string; // "卯·戌"
  feel: string; // "어울리는 기운"
}

// 월운 스트립 한 칸. current 는 대운 타임라인과 같은 방식으로 강조한다(골드 + "이번 달").
export interface MonthCell {
  label: string; // "7월"
  god: string; // 십성 — 툴팁 용어이기도 하다(정재·편관…)
  ganzhi: string; // "乙未"
  el: ElKey; // 천간 오행 — 색
  title: string; // 엔진 문구(짧은 결) — 접근성 라벨용
  current: boolean;
}

export interface PillarCol {
  title: string;
  // god: 그 글자의 십성(천간칸=ten_god.stem, 지지칸=ten_god.branch). 일간 천간은 "일원".
  cells: { han: string; el: ElKey; label: string; god?: string }[];
  unknown?: boolean; // 시간 미상 → 시주 없음(아래 항목도 표시하지 않음)
  isVoid?: boolean; // 공망 — 기둥명 아래 배지
  twelveStage?: string; // 12운성 (장생·쇠·태·사 …)
  hiddenStems?: string; // 지장간 — 한자 나열 (예: 戊庚丙)
}
export interface ResultView {
  character: { name_ko: string; name_en: string; desc: string; shensha: string[] };
  trueSolar: boolean;
  reflectChar: string;
  reflectElement: string;
  reflectLuck: string;
  elements: { desc: string; bars: ElementBar[]; aria: string };
  yearFlow: {
    title: string;
    period: string;
    desc: string;
    tracks: { label: string; pct: number }[];
    // 다가오는 달(월운) — 6칸 스트립. 세운의 하위 해상도라 같은 카드 안에 둔다.
    // 이번 달만 문장(now)을 붙인다. 6달 모두 문장을 쓰면 카드가 문단 벽이 된다.
    months: MonthCell[];
    nowMonth: { label: string; god: string; tone: string } | null;
  };
  // 대운의 흐름 타임라인(10년 단위). 현재 대운은 current=true로 강조.
  luck: {
    direction: string; // 역행/순행 (없으면 "")
    pillars: { startAge: number; ko: string; ganzhi: string; current: boolean }[];
  } | null;
  pillars: PillarCol[];
  godNote: string; // 명식 표 아래 — 두드러지는 십성을 사람 말로(없으면 "")
  relations: RelationRow[]; // 형충회합(없으면 빈 배열)
  meongsikNote: string;
}

// ── 매핑 테이블 (원본과 동일) ──
const EL_KO: Record<ElKey, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const EL_HANJA: Record<ElKey, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const YANG_STEM = "甲丙戊庚壬";
const YANG_BRANCH = "子寅辰午申戌";
const ORDER: ElKey[] = ["wood", "fire", "earth", "metal", "water"];

// 세운 분야별 점수 → "올해의 흐름" 막대 라벨. 홈의 오늘 분야(재물/애정/건강/성장)와 같은 4개 축.
const FIELD_ORDER = ["wealth", "love", "health", "growth"] as const;
const FIELD_FLOW_KO: Record<string, string> = {
  wealth: "재물·현실의 흐름",
  love: "관계·애정의 흐름",
  health: "건강·표현의 흐름",
  growth: "성장·자기의 흐름",
};

const STEM_KO: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_KO: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const EL_TONE: Record<ElKey, string> = {
  wood: "유연함과 성장이 강점이 되는 결입니다.",
  fire: "추진력과 열정이 강점이 되는 결입니다.",
  earth: "안정감과 너른 포용이 강점이 되는 결입니다.",
  metal: "차분함과 단단함이 강점이 되는 결입니다.",
  water: "깊이와 유연한 사고가 강점이 되는 결입니다.",
};
const EL_ENERGY: Record<ElKey, string> = {
  wood: "뻗어나가는 힘", fire: "추진력", earth: "단단한 무게", metal: "단단함", water: "깊이",
};
const EL_NATURE: Record<ElKey, string> = {
  wood: "곧게 자라나는 나무의 기운이에요.",
  fire: "환하게 타오르는 불의 기운이에요.",
  earth: "두텁고 든든한 흙의 기운이에요.",
  metal: "단단하고 서늘한 쇠의 기운이에요.",
  water: "깊고 맑은 물의 기운이에요.",
};
const ELEMENT_QUALITY: Record<ElKey, string> = {
  wood: "유연한 마음", fire: "뜨거운 열정", earth: "든든한 품", metal: "단단한 중심", water: "깊은 사유",
};
const CHAR_KEYWORD: Record<string, string> = {
  "거침없는 개척자": "거침없음", "따뜻한 등불": "따뜻함", "고요한 호수": "고요함",
  "깊은 뿌리": "깊음", "너른 나무": "너름", "피어나는 꽃": "피어남",
  "빛나는 검": "빛남", "흔들리지 않는 산": "흔들리지 않음",
};
// 세운·월운 해석 문구는 **엔진이 내려준다**(engine/fortune_copy.py).
// 예전엔 이 자리에 TEN_GOD_TITLE/TEN_GOD_TONE 이 있었고, 앱(saju_view.dart)에도
// 똑같은 테이블이 따로 있었다(두 벌). 용어사전이 어긋났던 것과 같은 구조라 합쳤다.
const TEN_GOD_REFLECT: Record<string, string> = {
  "정관": "다가오는 책임과 질서를 어떤 마음으로 받아들이고 싶나요?",
  "편관": "다가오는 도전을 어떻게 맞이하고 싶나요?",
  "정인": "스며드는 배움과 보살핌을 어떻게 받아들이고 싶나요?",
  "편인": "떠오르는 직관과 탐구를 어디로 데려가고 싶나요?",
  "식신": "피어나는 표현과 여유를 무엇으로 채우고 싶나요?",
  "상관": "솟아나는 재능과 변화를 어떻게 펼치고 싶나요?",
  "정재": "차곡차곡 쌓이는 결실을 어떤 속도로 가꾸고 싶나요?",
  "편재": "다가오는 기회와 확장을 어디까지 열어두고 싶나요?",
  "비견": "또렷해지는 자립을 누구와 나누고 싶나요?",
  "겁재": "차오르는 추진의 기운을 어떤 방향으로 쓰고 싶나요?",
};

// 형충회합 색·문구 (앱 result_screen.dart 의 _relStyle 과 동일 규칙)
//   합 포함(육합·삼합·방합) → 어울림 / 충 포함(육충) → 부딪힘 / 그 외(형·해·파) → 잔잔한 긴장
// "좋다/나쁘다" 단정 없이 관계의 '성질'만 말한다.
const REL_FEEL: Record<RelKind, string> = {
  harmony: "어울리는 기운",
  clash: "부딪히는 기운",
  tension: "잔잔한 긴장",
};
function relKind(type: string): RelKind {
  if (type.includes("합")) return "harmony";
  if (type.includes("충")) return "clash";
  return "tension";
}

// 원국(타고난 명식)에 자주 보이는 십성의 '결'. TEN_GOD_TONE 은 '올해'용 문장이라 여기선 따로 둔다.
const TEN_GOD_NATURE: Record<string, string> = {
  정관: "질서와 책임을 지키며 신뢰를 쌓아가는 결",
  편관: "부담을 동력으로 바꾸며 스스로를 단련하는 결",
  정인: "배우고 품으며 안으로 채워가는 결",
  편인: "남다른 직관으로 깊이 파고드는 결",
  식신: "여유롭게 표현하고 즐기며 피어나는 결",
  상관: "틀을 넘어 재능을 드러내는 결",
  정재: "차곡차곡 쌓아 현실을 단단히 하는 결",
  편재: "기회를 넓게 펼치며 크게 움직이는 결",
  비견: "스스로 서고 곁을 함께 챙기는 결",
  겁재: "겨루며 밀고 나아가는 추진의 결",
};

// ── 한국어 조사 헬퍼 ──
function hasJong(word: string): boolean {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}
const iGa = (w: string) => (hasJong(w) ? "이" : "가");
const iRaNeun = (w: string) => (hasJong(w) ? "이라는" : "라는");
const eulReul = (w: string) => (hasJong(w) ? "을" : "를");
const euRo = (w: string) => (hasJong(w) ? "으로" : "로");
const eunNeun = (w: string) => (hasJong(w) ? "은" : "는");
const gwaWa = (w: string) => (hasJong(w) ? "과" : "와");

function fmtPct(p: number): string {
  return (Math.round(p * 10) / 10).toString().replace(/\.0$/, "");
}
const stripDot = (s: string) => (s || "").replace(/\.$/, "");
const ganzhiKo = (stem: string, branch: string) =>
  (STEM_KO[stem] || stem) + (BRANCH_KO[branch] || branch);

function pickElement(fe: Record<ElKey, { pct: number }>, wantMax: boolean): ElKey | null {
  let best: ElKey | null = null;
  for (const k of ORDER) {
    if (!(k in fe)) continue;
    if (best === null || (wantMax ? fe[k].pct > fe[best].pct : fe[k].pct < fe[best].pct)) {
      best = k;
    }
  }
  return best;
}

function charKeyword(name: string): string {
  if (CHAR_KEYWORD[name]) return CHAR_KEYWORD[name];
  const first = (name || "").split(" ")[0];
  if (/한$/.test(first)) return first.replace(/한$/, "함");
  if (/은$/.test(first)) return first.replace(/은$/, "음");
  if (/는$/.test(first)) return first.replace(/는$/, "음");
  if (/운$/.test(first)) return first.replace(/운$/, "움");
  return first;
}

function thisYearTenGod(chart: EngineChart): string | null {
  const af = chart.annual_fortune;
  if (!af || !af.pillars || !af.pillars.length) return null;
  const sy = af.pillars.filter((p) => p.year === af.base_year)[0] || af.pillars[0];
  return sy.stem_ten_god || null;
}

// 현재 대운: 올해 나이(base_year - 출생연도)로, start_age 이하 중 가장 큰 대운
function currentLuck(chart: EngineChart): LuckPillar | null {
  const lp = chart.luck_pillars;
  if (!lp || !lp.pillars || !lp.pillars.length) return null;
  const birthYear = parseInt(String(chart.input?.birth_datetime_local || "").slice(0, 4), 10);
  const baseYear = chart.annual_fortune?.base_year || birthYear;
  const age = baseYear - birthYear;
  let cur = lp.pillars[0];
  for (let i = 0; i < lp.pillars.length; i++) {
    if (lp.pillars[i].start_age <= age) cur = lp.pillars[i];
    else break;
  }
  return cur;
}

// 엔진 200 응답이 화면이 기대하는 전체 형태(캐릭터·4기둥·오행 5종)를 갖췄는지 검증.
// buildView 는 이 형태를 전제로 non-null 접근하므로, 부분/변형 응답은 여기서 걸러
// 호출부가 준비해 둔 폴백 화면으로 보낸다(렌더 중 throw → 에러 바운더리 방지).
export function isCompleteChart(c: unknown): c is EngineChart {
  const chart = c as EngineChart | null;
  if (!chart || !chart.character || !chart.pillars || !chart.five_elements) return false;
  // 시주(hour)는 시간 미상이면 없을 수 있으므로 필수에서 제외 — 년·월·일만 요구.
  for (const k of ["year", "month", "day"] as const) {
    const p = chart.pillars[k];
    if (!p || typeof p.stem !== "string" || typeof p.branch !== "string") return false;
  }
  for (const k of ORDER) {
    const e = chart.five_elements[k];
    if (!e || typeof e.pct !== "number") return false;
  }
  return true;
}

// ── 메인: 엔진 JSON → 뷰모델 ──
// knownTerms: 엔진 용어사전의 키 집합. 형충회합 배지의 툴팁 용어를 고를 때만 쓴다
// (상형/자형 같은 subtype 이 사전에 있으면 그걸, 없으면 type 으로 폴백).
export function buildView(
  chart: EngineChart,
  knownTerms: ReadonlySet<string> = new Set(),
): ResultView {
  const character = chart.character!;
  const fe = chart.five_elements!;
  const pillars = chart.pillars!;
  const day = pillars.day;

  // 캐릭터 + 신살
  const shensha = (chart.shensha || []).map((s) => s.name);

  // 오행 막대 — 강한 순 정렬, 최댓값 96px 기준
  const rows = (Object.keys(fe) as ElKey[])
    .map((k) => ({ key: k, pct: fe[k].pct }))
    .sort((a, b) => b.pct - a.pct);
  const maxPct = rows[0]?.pct || 1;
  const bars: ElementBar[] = rows.map((r, i) => ({
    key: r.key,
    ko: EL_KO[r.key],
    pct: fmtPct(r.pct),
    h: Math.round((r.pct / maxPct) * 96),
    strong: i === 0,
  }));
  const aria = "오행 분포: " + rows.map((r) => `${EL_KO[r.key]} ${fmtPct(r.pct)}%`).join(", ");

  // 오행 카드 설명
  const strong = pickElement(fe, true)!;
  const weak = pickElement(fe, false)!;
  const elementsDesc =
    `${EL_KO[strong]}(${EL_HANJA[strong]})${iGa(EL_KO[strong])} 가장 강하고, ` +
    `${EL_KO[weak]}(${EL_HANJA[weak]})${iGa(EL_KO[weak])} 옅은 편이에요. ${EL_TONE[strong]}`;

  // 성찰 ① 캐릭터 + 올해 십성
  const kw = charKeyword(character.name_ko);
  const god = thisYearTenGod(chart);
  const dayEl = day?.stem_element;
  const quality = dayEl ? ELEMENT_QUALITY[dayEl] : null;
  const reflectChar =
    god && TEN_GOD_REFLECT[god] && quality
      ? `‘${kw}’${eulReul(kw)} 지키면서도, ${quality}${euRo(quality)} 올해 ${TEN_GOD_REFLECT[god]}`
      : `‘${kw}’${iRaNeun(kw)} 결이 요즘의 나와 얼마나 닿아 있나요?`;

  // 성찰 ② 오행 균형
  let reflectElement: string;
  if (strong && weak && strong !== weak) {
    reflectElement =
      `${EL_KO[strong]}(${EL_HANJA[strong]})의 ${EL_ENERGY[strong]}${iGa(EL_ENERGY[strong])}` +
      ` 강한 당신에게, 요즘 가장 옅은 ${EL_KO[weak]}(${EL_HANJA[weak]})의 자리엔 무엇을 채우고 싶나요?`;
  } else {
    reflectElement =
      `가장 강한 ‘${EL_KO[strong]}(${EL_HANJA[strong]})’의 ${EL_ENERGY[strong]} — 요즘 그 기운이 어디로 향하고 있나요?`;
  }

  // 성찰 ③ 대운의 큰 흐름
  const cl = currentLuck(chart);
  const dir = chart.luck_pillars?.direction_ko ? `(${chart.luck_pillars.direction_ko})` : "";
  let reflectLuck: string;
  if (cl && god) {
    reflectLuck =
      `지금은 ${ganzhiKo(cl.stem, cl.branch)}(${cl.stem}${cl.branch}) 대운${dir}의 큰 흐름을 지나고 있어요. ` +
      `그 긴 흐름 위에서, 올해 ${god}의 기운${eunNeun(god)} 어떤 자리에 두고 싶나요?`;
  } else {
    reflectLuck = "올해 ‘조용히 다지고 싶은 것’ 하나를 꼽는다면 무엇인가요?";
  }

  // 올해의 흐름
  const af = chart.annual_fortune;
  const sy = af?.pillars?.filter((p) => p.year === af.base_year)?.[0] || af?.pillars?.[0];
  const yGod = sy?.stem_ten_god;
  let yfDesc = "";
  let yfTitle = "올해의 흐름";
  let yfPeriod = "";
  if (af && sy) {
    yfPeriod = String(af.base_year);
    yfTitle = sy.copy?.title || "흐름을 살피는 해";
    const gz = ganzhiKo(sy.stem, sy.branch);
    const dm = af.day_master;
    const dmKo = (STEM_KO[dm] || dm) + (dayEl ? EL_KO[dayEl] : "");
    yfDesc = `${af.base_year}년은 ${gz}(${sy.stem}${sy.branch})년 — 일간 ${dmKo}(${dm})에게는 ${yGod || "—"}의 해예요.`;
    if (sy.copy?.tone) yfDesc += " " + sy.copy.tone;
    if (cl) {
      yfDesc += ` 지금은 ${ganzhiKo(cl.stem, cl.branch)}(${cl.stem}${cl.branch}) 대운${dir}을 지나는 흐름이에요.`;
    }
  }

  // 올해의 흐름 — 분야별 점수(엔진 세운 fields). 강한 순으로 정렬해 표시.
  // 엔진이 fields를 주지 않는 경우(구버전/부분응답)엔 빈 배열 → 막대 없이 설명만 노출.
  const yfTracks = sy?.fields
    ? FIELD_ORDER.map((k) => ({ label: FIELD_FLOW_KO[k], pct: sy.fields![k] ?? 50 })).sort(
        (a, b) => b.pct - a.pct,
      )
    : [];

  // 다가오는 달(월운) — 엔진이 이번 달부터 6개월치를 준다(절기 기준 월간지).
  // 첫 칸이 이번 달이다(base_year/base_month = 오늘 기준).
  const mf = chart.monthly_fortune;
  const months: MonthCell[] = (mf?.pillars || []).map((p) => ({
    label: `${p.month}월`,
    god: p.stem_ten_god || "",
    ganzhi: p.stem + p.branch,
    el: p.stem_element,
    title: p.copy?.title || "",
    current: p.year === mf!.base_year && p.month === mf!.base_month,
  }));
  const cm = (mf?.pillars || []).find(
    (p) => p.year === mf!.base_year && p.month === mf!.base_month,
  );
  const nowMonth = cm
    ? {
        label: `${cm.month}월`,
        god: cm.stem_ten_god || "",
        tone: cm.copy?.tone || "",
      }
    : null;

  // 명식 8자 (시주·일주·월주·연주) — 각 글자 밑에 그 글자의 십성을 함께 싣는다.
  const yang = (han: string) => ((YANG_STEM + YANG_BRANCH).indexOf(han) !== -1 ? "양" : "음");
  const cell = (han: string, el: ElKey, god?: string) => ({
    han,
    el,
    label: `${EL_KO[el]} · ${yang(han)}`,
    god,
  });
  const col = (title: string, p: Pillar): PillarCol => ({
    title,
    cells: [
      cell(p.stem, p.stem_element, p.ten_god?.stem), // 일간 천간이면 "일원"
      cell(p.branch, p.branch_element, p.ten_god?.branch),
    ],
    isVoid: p.is_void,
    twelveStage: p.twelve_stage,
    // 지장간은 숨은 천간(여기·중기·정기)의 글자만 이어 붙여 보여준다(앱과 동일).
    hiddenStems: p.hidden_stems?.map((h) => h.stem).join("") || undefined,
  });
  const pillarCols: PillarCol[] = [
    // 시간 미상이면 시주 없음 → "시간 모름" 칸으로(십성도 표시하지 않음).
    pillars.hour ? col("시주", pillars.hour) : { title: "시주", cells: [], unknown: true },
    col("일주", pillars.day),
    col("월주", pillars.month),
    col("연주", pillars.year),
  ];

  // 두드러지는 십성 — 여덟 자(시주 미상이면 여섯 자)에서 가장 자주 보이는 것.
  // '일원'은 기준점(나 자신)이라 세지 않는다. 동률이면 둘까지 나란히 말한다.
  const godCount = new Map<string, number>();
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    for (const g of [p?.ten_god?.stem, p?.ten_god?.branch]) {
      if (!g || g === "일원" || !TEN_GOD_NATURE[g]) continue;
      godCount.set(g, (godCount.get(g) || 0) + 1);
    }
  }
  const ranked = [...godCount.entries()].sort((a, b) => b[1] - a[1]);
  let godNote = "";
  if (ranked.length) {
    const top = ranked.filter((e) => e[1] === ranked[0][1]).slice(0, 2).map((e) => e[0]);
    const lead =
      top.length === 2
        ? // '…결과 …' 로 붙어 읽히지 않도록 쉼표+'그리고'로 끊는다.
          `${top[0]}${gwaWa(top[0])} ${top[1]}${iGa(top[1])} 나란히 자주 보여요 — ` +
          `${TEN_GOD_NATURE[top[0]]}, 그리고 ${TEN_GOD_NATURE[top[1]]}이 함께 흐릅니다.`
        : `${top[0]}${iGa(top[0])} 가장 자주 보여요 — ${TEN_GOD_NATURE[top[0]]}입니다.`;
    godNote =
      `여덟 자를 일간(나) 기준으로 보면, ${lead} ` +
      `다만 한두 글자로 사람을 단정할 수는 없어요. 여러 기운이 함께 어울리는 결로 읽어주세요.`;
  }

  // 형충회합 — 엔진 relations 를 화면용 한 줄들로.
  // 배지는 subtype 우선(상형/자형), 툴팁 용어는 사전에 있는 것으로(없으면 type 으로 폴백).
  const relations: RelationRow[] = (chart.relations || []).map((r) => {
    const kind = relKind(r.type);
    const sub = (r.subtype || "").trim();
    return {
      term: sub && knownTerms.has(sub) ? sub : r.type,
      label: sub || r.type,
      kind,
      pillars: (r.pillars || []).join("·"),
      branches: (r.branches || []).join("·"),
      feel: REL_FEEL[kind],
    };
  });

  // 명식 노트 (일간)
  const reading = (STEM_KO[day.stem] || day.stem) + EL_KO[day.stem_element];
  const hanja = day.stem + EL_HANJA[day.stem_element];
  const meongsikNote =
    `일간은 ${reading}(${hanja}) — ${EL_NATURE[day.stem_element]} ` +
    `한자와 전문 용어는 참고용이며, 해석은 위의 사람 말 설명을 기준으로 읽어주세요.`;

  // 대운의 흐름 타임라인
  const lpAll = chart.luck_pillars;
  const luck = lpAll?.pillars?.length
    ? {
        direction: lpAll.direction_ko || "",
        pillars: lpAll.pillars.map((p) => ({
          startAge: p.start_age,
          ko: ganzhiKo(p.stem, p.branch),
          ganzhi: p.stem + p.branch,
          current: !!(cl && cl.start_age === p.start_age),
        })),
      }
    : null;

  return {
    character: {
      name_ko: character.name_ko,
      name_en: character.name_en,
      desc: stripDot(character.tagline),
      shensha,
    },
    trueSolar: !!chart.calc_meta?.true_solar_time_applied,
    reflectChar,
    reflectElement,
    reflectLuck,
    elements: { desc: elementsDesc, bars, aria },
    yearFlow: {
      title: yfTitle,
      period: yfPeriod,
      desc: yfDesc,
      tracks: yfTracks,
      months,
      nowMonth,
    },
    luck,
    pillars: pillarCols,
    godNote,
    relations,
    meongsikNote,
  };
}
