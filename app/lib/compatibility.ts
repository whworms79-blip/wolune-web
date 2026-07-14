// 궁합 — 엔진(POST /v1/compatibility)이 점수·근거·문구를 모두 만든다.
// 여기는 그 응답의 타입과, 공유 링크 코덱만 갖는다. **명리 계산을 하지 않는다.**
//
// 왜 엔진인가 (2026-07-15 결정, 원래 기획으로 복귀):
//   예전엔 육합·삼합·육충·형·파 규칙표가 엔진 1벌 + 웹 1벌 + 앱 1벌, 총 3벌이었다.
//   그리고 이미 어긋나 있었다 — 클라엔 방합(方合)이 통째로 없고 형(刑)은 子卯 하나뿐이라,
//   명식 화면이 "방합"이라 부르는 관계를 궁합 화면은 관계 없음으로 봤다.
//   골든셋이 지키는 건 엔진 1벌뿐이고 나머지 2벌은 아무도 검증하지 않았다.
//   그 상태로 사용자에겐 점수와 "이 점수는 이렇게 나왔어요" 근거까지 보여주고 있었다.
//   규칙을 만드는 쪽이 점수도, 그 근거도, 그 문구도 말한다(용어사전과 같은 원칙).
//
// ⚠ 옛 주석이 "엔진에 궁합 계산을 두지 않는다"고 금지했으나 아키텍처적 근거가 없었고
//   (적힌 이유는 '단정하지 않는 톤' — 계산 위치와 무관하다), 기획 문서
//   files1/Wolune_만세력엔진_기술명세.md 는 처음부터 POST /v1/compatibility 를 명시했다.
//
// 여기 남는 것: 공유 링크 코덱(encodePerson/decodePerson) — URL 포맷이지 명리가 아니다.
//
// 엔진이 주는 kind 는 he/chong/minor/neutral 이라는 **의미**다. 그게 라벤더인지 화(火)인지는
// 화면(CompatResult.tsx + compatibility.css)이 정한다.

import type { SajuInput } from "./sajuInput";

export type ElKey = "wood" | "fire" | "earth" | "metal" | "water";

// ── 엔진 응답(POST /v1/compatibility) ──
export type BasisKind = "he" | "chong" | "minor" | "neutral";

export interface BasisChip {
  label: string;
  delta: number;
}
export interface BasisRow {
  key: string; // ten_god | spouse | branches | elements | clamp
  kind: BasisKind;
  chips: BasisChip[];
  note: string;
}
export interface ScoreBasis {
  base: number; // "평균적인 두 사람"의 점수(74) — 임의의 숫자가 아니라 실제 기준점
  rows: BasisRow[];
  score: number; // base + 모든 delta 의 합 === score (엔진이 보정 줄까지 넣어 보장한다)
  disclosure: string; // ★ 이 점수가 우리가 만든 숫자임을 밝히는 문단 — 절대 숨기지 말 것
}
export interface CompatPerson {
  name: string;
  dominant_element: ElKey;
  el_label: string; // "화(火) 강"
  character: { name_ko?: string | null; name_en?: string | null; tagline?: string | null };
  shensha: string[];
}
export interface ShenshaMeet {
  a: string[];
  b: string[];
  line: string;
}
export interface BranchRelation {
  a_pillar: string;
  b_pillar: string;
  branches: [string, string];
  type: string; // 육합·삼합·방합·육충·육해·형·파
  kind: BasisKind;
}
export interface CompatView {
  score: number;
  summary: { key: string; title: string; en: string; tagline: string };
  score_basis: ScoreBasis;
  good: string;
  tension: string;
  reflection: string;
  shensha_meet: ShenshaMeet | null;
  persons: [CompatPerson, CompatPerson];
  branch_relations: BranchRelation[]; // 2순위(지지 관계 표)의 재료 — 화면은 아직 안 씀
  true_solar_time_applied: boolean;
  engine_version?: string;
}

// 이름 첫 글자(아바타). 화면 표현이라 클라이언트가 만든다.
export const initialOf = (name: string): string =>
  (name || "?").trim().charAt(0) || "?";

// ── 엔진 요청 바디 ──
// 필드 이름은 GET /v1/chart 의 쿼리 파라미터와 **일부러 똑같이** 맞췄다(server.py 참고).
export interface EnginePerson {
  name: string;
  birth_date: string;
  birth_time?: string;
  city?: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  is_leap_month?: boolean;
}

export function toEnginePerson(name: string, inp: SajuInput): EnginePerson {
  return {
    name: (name || "").trim(),
    birth_date: inp.date,
    birth_time: inp.time || undefined,
    city: inp.city || undefined,
    gender: inp.gender,
    calendar: inp.calendar,
    is_leap_month: inp.is_leap_month || undefined,
  };
}

// 응답이 화면을 그릴 만큼 온전한가(부분 응답으로 화면이 깨지지 않게).
export function isCompatView(v: unknown): v is CompatView {
  const c = v as CompatView | null;
  return !!(
    c &&
    typeof c.score === "number" &&
    c.summary?.title &&
    c.score_basis?.rows?.length &&
    Array.isArray(c.persons) &&
    c.persons.length === 2
  );
}

// ── 공유 링크 코덱: 한 사람(이름+사주입력) ↔ URL 파라미터 ──
// 링크로 궁합 결과를 나누는 획득 통로. 서버(SSR 디코드)·클라이언트(생성) 양쪽에서 쓰므로
// 어디서나 동작하는 encode/decodeURIComponent 만 사용한다.
// ⚠ 개인정보: URL에 생일이 담긴다. 이름은 선택(닉네임/이니셜) — 사주 계산에 필요한 값만 필수.
// ⚠ 링크엔 점수를 담지 않는다 — 열 때마다 엔진이 다시 계산한다(공식이 바뀌면 점수도 따라온다).
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
