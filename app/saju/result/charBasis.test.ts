// 캐릭터 선택 근거 문장 — 엔진의 **구조화 필드**로 만든다(문자열 파싱 없음).
//
// 이 테스트가 지키는 것 두 가지:
//   ① 세 갈래(콤보 / 표상 신살 / 신살 없음)가 rep 하나로 정확히 갈리는가
//   ② 이름의 받침에 따라 조사가 맞게 붙는가 — 이름이 데이터라 고정하면 절반이 비문이 된다
//
// ★ 쓰이는 이름·오행은 **엔진에 실재하는 값만** 골랐다(saju_pillars.py 의 CHARACTERS,
//   CHARACTER_PRIORITY, FALLBACK_BY_ELEMENT). 가상 문자열로 통과시켜 놓고 실제 데이터에서
//   깨지는 일을 막기 위해서다.
import { describe, it, expect } from "vitest";
import { charBasisText, eunNeun, type EngineChart } from "./chart";

type Character = NonNullable<EngineChart["character"]>;
const ch = (rep?: string, el?: Character["day_master_element"]): Character => ({
  name_ko: "고요한 호수",
  name_en: "The Still Lake",
  tagline: "",
  representative_shensha: rep,
  day_master_element: el,
});
const rows = (...xs: [string, string][]) => xs.map(([name, where]) => ({ name, where }));

describe("charBasisText — 세 갈래", () => {
  it("① 콤보: rep 에 '+' 가 있으면 두 신살을 함께 말한다", () => {
    // 엔진의 유일한 콤보(compute_character 1순위)
    expect(charBasisText(ch("역마+백호"), rows(["역마", "일주"], ["백호", "년주"]))).toBe(
      "역마와 백호, 두 신살이 함께 만든 조합이에요",
    );
  });

  it("② 표상 신살: 그 신살의 기둥을 그대로 쓴다", () => {
    expect(charBasisText(ch("화개"), rows(["화개", "년주"]))).toBe(
      "년주에 깃든 화개가 대표 결이 되었어요",
    );
    // 여러 기둥에 걸린 경우 — where 는 이미 "·" 로 이어진 문자열
    expect(charBasisText(ch("천을귀인"), rows(["천을귀인", "년주·일주"]))).toBe(
      "년주·일주에 깃든 천을귀인이 대표 결이 되었어요",
    );
  });

  it("② 조사: 모음 끝은 '가', 받침 끝은 '이' — 엔진 신살 실명으로", () => {
    for (const [name, expected] of [
      ["화개", "가"], // 모음 끝
      ["도화", "가"],
      ["역마", "가"],
      ["천을귀인", "이"], // 받침 끝
      ["문창귀인", "이"],
      ["양인", "이"],
      ["괴강", "이"],
    ] as const) {
      expect(charBasisText(ch(name), rows([name, "일주"]))).toBe(
        `일주에 깃든 ${name}${expected} 대표 결이 되었어요`,
      );
    }
  });

  it("③ 신살이 하나도 없으면 일간 오행으로 — 내부 표현('fallback')을 흘리지 않는다", () => {
    // 엔진 FALLBACK_BY_ELEMENT 가 rep 을 채우지만 shensha 목록은 비어 있다.
    const out = charBasisText(ch("화개", "water"), []);
    expect(out).toBe("두드러진 신살이 없어, 일간의 오행(수)이 지닌 기본 결로 정했어요");
    expect(out).not.toContain("fallback");
    expect(out).not.toContain("→");
  });

  it("근거를 모르면 아무 말도 하지 않는다 (옛 엔진·필드 누락)", () => {
    expect(charBasisText(ch(undefined), rows(["화개", "년주"]))).toBe("");
    expect(charBasisText(undefined, [])).toBe("");
  });

  it("기둥 정보가 비어도 문장이 깨지지 않는다", () => {
    expect(charBasisText(ch("화개"), rows(["화개", ""]))).toBe("화개가 대표 결이 되었어요");
  });

  it("오행 키가 없으면 괄호 없이 말한다", () => {
    expect(charBasisText(ch("화개", undefined), [])).toBe(
      "두드러진 신살이 없어, 일간의 오행이 지닌 기본 결로 정했어요",
    );
  });
});

describe("eunNeun — 캐릭터 이름 조사 (엔진 CHARACTERS 8종 전부)", () => {
  it("받침으로 끝나는 넷은 '은'", () => {
    for (const n of ["따뜻한 등불", "피어나는 꽃", "빛나는 검", "흔들리지 않는 산"]) {
      expect(eunNeun(n)).toBe("은");
    }
  });
  it("모음으로 끝나는 넷은 '는'", () => {
    for (const n of ["거침없는 개척자", "고요한 호수", "깊은 뿌리", "너른 나무"]) {
      expect(eunNeun(n)).toBe("는");
    }
  });
});
