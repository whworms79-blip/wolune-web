// 한국어 조사 선택 — 이름이 데이터라서(신살·캐릭터명은 엔진이 준다) 조사를 고정하면
// 절반이 비문이 된다. 실제로 그랬다(2026-09-04 검수에서 '화개이', '빛나는 검는' 발견).
//
// 여기 쓰인 값들은 **엔진에 실재하는 것만** 골랐다(saju_pillars.py CHARACTERS / CHARACTER_PRIORITY).
// 가상의 문자열로 통과시켜 놓고 실제 데이터에서 깨지는 일을 막기 위해서다.
import { describe, it, expect } from "vitest";
import { josa } from "./chart";

describe("josa — 받침 유무로 조사 선택", () => {
  it("모음으로 끝나는 신살: 가/는", () => {
    // 엔진 CHARACTER_PRIORITY 에 실재하는 모음 끝 신살들
    for (const name of ["역마", "화개", "도화"]) {
      expect(josa(name, "이", "가")).toBe("가");
      expect(josa(name, "은", "는")).toBe("는");
    }
  });

  it("받침으로 끝나는 신살: 이/은", () => {
    for (const name of ["백호", "양인", "괴강", "천을귀인", "문창귀인", "월덕귀인"]) {
      // 백호·천을귀인 등은 모두 받침으로 끝난다(호는 모음이므로 백호는 '가')
      const expected = name === "백호" ? "가" : "이";
      expect(josa(name, "이", "가")).toBe(expected);
    }
  });

  it("캐릭터 8종 — 엔진 CHARACTERS 의 실제 이름", () => {
    // 받침 끝 4종 → 은 / 모음 끝 4종 → 는
    const withBatchim = ["따뜻한 등불", "피어나는 꽃", "빛나는 검", "흔들리지 않는 산"];
    const withoutBatchim = ["거침없는 개척자", "고요한 호수", "깊은 뿌리", "너른 나무"];
    for (const n of withBatchim) expect(josa(n, "은", "는")).toBe("은");
    for (const n of withoutBatchim) expect(josa(n, "은", "는")).toBe("는");
  });

  it("한글이 아닌 끝 글자(한자·숫자)는 받침 있음으로 본다 — 한자어는 대개 그렇게 읽힌다", () => {
    expect(josa("華蓋", "이", "가")).toBe("이");
    expect(josa("3", "은", "는")).toBe("은");
  });
});
