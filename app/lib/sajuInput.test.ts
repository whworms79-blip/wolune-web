// 엔진 입력 정규화 — 프록시(POST/GET)와 결과 SSR이 **같은 계약**을 쓰는지 지킨다.
//
// 왜 필요한가: 예전엔 이 규칙이 두 파일에 손으로 각각 적혀 있었고, 실제로 갈라졌다 —
// 프록시는 is_leap_month 를 boolean 으로도 받는데 SSR 경로는 "1" 만 받았다. 그런 드리프트는
// 조용히 틀린 사주(윤달을 평달로)를 만든다. 새 필드가 생기면 이 테스트가 두 경로를 함께 끈다.
import { describe, it, expect } from "vitest";
import { toSajuInput, chartQuery } from "./sajuInput";

// 쿼리스트링처럼 값을 꺼내는 get
const fromQuery = (q: Record<string, string>) => (k: string) => q[k];

describe("toSajuInput — 엔진 입력 계약", () => {
  it("기본값: 성별은 female, 달력은 solar (알 수 없으면 안전한 쪽)", () => {
    const got = toSajuInput(fromQuery({ date: "1990-03-15" }));
    expect(got).toEqual({
      date: "1990-03-15",
      time: undefined,
      city: undefined,
      gender: "female",
      calendar: "solar",
      is_leap_month: undefined,
    });
  });

  it("male·lunar·윤달을 그대로 받는다", () => {
    expect(
      toSajuInput(
        fromQuery({
          date: "1979-06-06",
          time: "02:30",
          city: "천안",
          gender: "male",
          calendar: "lunar",
          is_leap_month: "1",
        }),
      ),
    ).toEqual({
      date: "1979-06-06",
      time: "02:30",
      city: "천안",
      gender: "male",
      calendar: "lunar",
      is_leap_month: true,
    });
  });

  it("빈 문자열·공백은 '없음'으로 — 엔진에 빈 파라미터가 새어 나가지 않는다", () => {
    const got = toSajuInput(fromQuery({ date: "1990-03-15", time: "  ", city: "" }));
    expect(got.time).toBeUndefined();
    expect(got.city).toBeUndefined();
    expect(chartQuery(got).has("time")).toBe(false);
    expect(chartQuery(got).has("city")).toBe(false);
  });

  it("모르는 값은 기본값으로 떨어진다 (male 아닌 문자열, lunar 아닌 문자열)", () => {
    const got = toSajuInput(fromQuery({ date: "1990-03-15", gender: "x", calendar: "y" }));
    expect(got.gender).toBe("female");
    expect(got.calendar).toBe("solar");
  });

  it("윤달은 '1' 일 때만 참 — '0'·'true'·빈 값은 모두 아님", () => {
    for (const v of ["0", "true", "", "yes"]) {
      expect(toSajuInput(fromQuery({ date: "1990-03-15", is_leap_month: v })).is_leap_month)
        .toBeUndefined();
    }
  });

  it("★ 두 전송 형식이 같은 결과를 낸다 — 쿼리스트링 '1' 과 본문 boolean true", () => {
    // 프록시가 본문 boolean 을 "1" 로 맞춰 넘기는 것과 동치인지 확인(route.ts fromBody).
    const viaQuery = toSajuInput(fromQuery({ date: "1979-06-06", calendar: "lunar", is_leap_month: "1" }));
    const body: Record<string, unknown> = { date: "1979-06-06", calendar: "lunar", is_leap_month: true };
    const viaBody = toSajuInput((k) => {
      const v = body[k];
      if (typeof v === "string") return v;
      if (v === true) return "1";
      return undefined;
    });
    expect(viaBody).toEqual(viaQuery);
    expect(chartQuery(viaBody).toString()).toBe(chartQuery(viaQuery).toString());
  });
});
