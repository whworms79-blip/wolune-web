// §7 정서적 안전 — 지속적 저기분 감지. **앱과 같은 규칙임을 지키는 가드.**
//
// 양쪽으로 틀리면 안 된다:
//   · 너무 쉽게 뜨면 → 하루 우울했다고 상담 전화를 들이미는 앱이 된다(불안 유발)
//   · 너무 안 뜨면  → 지키겠다고 문서에 써둔 약속이 코드에 없는 것과 같다
//
// ⚠ 기준값이 앱(mood_store.dart)과 갈라지면 같은 사람이 기기에 따라 다른 대접을 받는다.
import { describe, it, expect } from "vitest";
import {
  hasSustainedLowMood,
  LOW_MOOD_THRESHOLD,
  LOW_MOOD_WINDOW_DAYS,
  type MoodEntry,
} from "./moodJournal";

const TODAY = new Date(2026, 8, 8); // 2026-09-08

const key = (daysAgo: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const at = (daysAgo: number, mood: number): MoodEntry => ({
  date: key(daysAgo),
  mood,
  tags: [],
  note: "",
  updatedAt: "",
});

describe("지속적 저기분 감지", () => {
  it("하루 가라앉았다고 뜨지 않는다 — 그건 흐름의 일부다", () => {
    expect(hasSustainedLowMood([at(0, 1), at(1, 4), at(2, 5)], TODAY)).toBe(false);
  });

  it("★ 창 안에 하위 2단계가 기준만큼 쌓이면 뜬다", () => {
    const e = Array.from({ length: LOW_MOOD_THRESHOLD }, (_, i) => at(i, 2));
    expect(hasSustainedLowMood(e, TODAY)).toBe(true);
  });

  it("기준보다 하나 모자라면 뜨지 않는다 (경계값)", () => {
    const e = Array.from({ length: LOW_MOOD_THRESHOLD - 1 }, (_, i) => at(i, 1));
    expect(hasSustainedLowMood(e, TODAY)).toBe(false);
  });

  it("★ 연속이 아니어도 센다 — 힘들면 기록 자체를 건너뛰기 때문", () => {
    const e = Array.from({ length: LOW_MOOD_THRESHOLD }, (_, i) => at(i * 2, 1));
    expect(hasSustainedLowMood(e, TODAY)).toBe(true);
  });

  it("★ 창 밖의 옛 기록은 세지 않는다 — 지난 일로 오늘을 판단하지 않는다", () => {
    const old = Array.from({ length: LOW_MOOD_THRESHOLD }, (_, i) =>
      at(LOW_MOOD_WINDOW_DAYS + i, 1),
    );
    expect(hasSustainedLowMood(old, TODAY)).toBe(false);

    const edge = Array.from({ length: LOW_MOOD_THRESHOLD }, (_, i) =>
      at(LOW_MOOD_WINDOW_DAYS - 1 - i, 1),
    );
    expect(hasSustainedLowMood(edge, TODAY)).toBe(true);
  });

  it("평온 이상만 기록했다면 아무리 많아도 뜨지 않는다", () => {
    const e = Array.from({ length: LOW_MOOD_WINDOW_DAYS }, (_, i) => at(i, 3));
    expect(hasSustainedLowMood(e, TODAY)).toBe(false);
  });

  it("기록이 없으면 뜨지 않는다", () => {
    expect(hasSustainedLowMood([], TODAY)).toBe(false);
  });

  it("날짜가 깨진 기록이 있어도 죽지 않는다", () => {
    const e: MoodEntry[] = [
      { date: "", mood: 1, tags: [], note: "", updatedAt: "" },
      { date: "not-a-date", mood: 1, tags: [], note: "", updatedAt: "" },
      ...Array.from({ length: LOW_MOOD_THRESHOLD }, (_, i) => at(i, 1)),
    ];
    expect(hasSustainedLowMood(e, TODAY)).toBe(true);
  });

  it("★ 기준값이 앱(mood_store.dart)과 같아야 한다", () => {
    expect(LOW_MOOD_WINDOW_DAYS).toBe(14);
    expect(LOW_MOOD_THRESHOLD).toBe(5);
  });
});
