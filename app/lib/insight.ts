// 무드 통찰 — **계산은 엔진(POST /v1/insight)이 한다.**
//
// 앱에만 있던 로직(147줄: Pearson 상관 + 오행별 평균 기분)을 엔진으로 올렸다. 웹에 복사했다면
// 또 두 벌이 됐을 것이다 — 용어사전이 정확히 그렇게 어긋나 있었다(웹 53 / 앱 26).
//
// 엔진에 보내는 것: 기분 점수(mood), 그날의 운세 점수(score), 일진 간지(day_ganzhi).
// 보내지 않는 것: **메모·태그·날짜**. 계산에 쓰이지 않는데 굳이 보낼 이유가 없다 —
// 특히 메모는 가장 사적인 자유 서술이다. 엔진은 저장하지도, 로그에 남기지도 않는다.
import type { MoodEntry } from "./moodJournal";

/// 엔진에 보내도 되는 필드 — 프록시(api/engine/insight)가 이 목록으로 걸러낸다.
export const INSIGHT_FIELDS = ["mood", "score", "day_ganzhi"] as const;

export interface InsightEntry {
  mood: number;
  score: number;
  day_ganzhi: string;
}

/// 통찰 잠금 해제에 필요한 최소 기록 수(사주 스냅샷이 있는 기록, **연속일 아님**).
/// 엔진의 INSIGHT_THRESHOLD 와 같은 값. 엔진이 needed 를 함께 내려주므로 화면은 그걸 쓰고,
/// 이 상수는 엔진을 못 부를 때의 표시용 기본값이다.
export const INSIGHT_THRESHOLD = 10;

export type InsightPattern =
  | "element"
  | "fortune_positive"
  | "fortune_independent"
  | "none"
  | "locked";

export interface Insight {
  unlocked: boolean;
  count: number;
  needed: number;
  remaining: number;
  pattern: InsightPattern;
  headline: string | null;
  support: string | null;
}

/// 스냅샷(일진 간지)이 있는 기록만 통찰 대상 — 그날의 기운을 모르면 대조할 게 없다.
/// 저장 스키마는 camelCase(dayGanzhi), 엔진 API 는 snake_case(day_ganzhi) — 여기서 넘긴다.
export function insightEntries(entries: MoodEntry[]): InsightEntry[] {
  return entries
    .filter((e) => (e.fortune?.dayGanzhi ?? "").trim() !== "")
    .map((e) => ({
      mood: e.mood,
      score: e.fortune!.score,
      day_ganzhi: e.fortune!.dayGanzhi!,
    }));
}

function locked(count: number): Insight {
  return {
    unlocked: false,
    count,
    needed: INSIGHT_THRESHOLD,
    remaining: Math.max(0, INSIGHT_THRESHOLD - count),
    pattern: "locked",
    headline: null,
    support: null,
  };
}

/// 통찰을 받아온다. 실패하면 잠긴 상태로 폴백(카드가 통째로 사라지지 않게).
export async function fetchInsight(entries: MoodEntry[]): Promise<Insight> {
  const payload = insightEntries(entries);

  // 어차피 잠긴다 → 엔진을 부를 필요도, 무드를 내보낼 필요도 없다.
  if (payload.length < INSIGHT_THRESHOLD) return locked(payload.length);

  try {
    const res = await fetch("/api/engine/insight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries: payload }),
    });
    if (!res.ok) return locked(payload.length);
    return (await res.json()) as Insight;
  } catch {
    return locked(payload.length);
  }
}
