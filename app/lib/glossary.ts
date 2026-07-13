// 용어사전 — 엔진(GET /v1/glossary)이 진실의 원천.
//
// 예전엔 웹에 53개, 앱에 26개가 따로 하드코딩돼 있었다(앱 사용자는 공망·장생·지장간을
// 생 한자로 봤다). 이제 용어를 만드는 쪽(엔진)이 그 뜻도 말한다.
//
// 성능: 사전은 거의 안 바뀌므로 매 요청마다 엔진을 부르면 낭비다. Next 의 데이터 캐시로
// 하루(86400s) 재검증한다 — 서버 렌더 한 번에 fetch 한 번도 안 나가는 게 보통이고,
// 같은 렌더 안에서의 중복 호출은 React cache() 가 막는다. 클라이언트는 아무것도 안 받아온다
// (서버 컴포넌트가 받아서 프로바이더로 내려준다).
//
// 엔진이 죽어도 툴팁이 사라지면 안 되므로 glossaryFallback.ts(엔진에서 자동 생성한 스냅샷)로
// 조용히 내려간다.
import { cache } from "react";
import { GLOSSARY_FALLBACK } from "./glossaryFallback";

export interface GlossTerm {
  key: string; // 엔진이 chart 응답에 실제로 내보내는 문자열(십성·12운성·관계·신살…)
  name: string; // 화면에 띄울 한글명
  hanja: string;
  short: string;
  category: string;
}

export interface GlossaryData {
  version: string;
  count: number;
  inline_terms: string[]; // 본문에서 자동으로 밑줄 달 용어(긴 것부터)
  terms: GlossTerm[];
}

// 서버→엔진 직접 호출(CORS 무관). 나머지 웹 코드와 같은 서버 전용 env 를 쓴다.
// 이름이 어긋나면 조용히 폴백 스냅샷만 쓰게 돼 "엔진 연결됨"인 줄 착각한다.
const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

/// 사전을 가져온다. 실패하면 번들 스냅샷 — 절대 빈 사전을 돌려주지 않는다.
export const getGlossary = cache(async (): Promise<GlossaryData> => {
  try {
    const r = await fetch(`${ENGINE}/v1/glossary`, {
      next: { revalidate: 86400, tags: ["glossary"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) throw new Error(`engine ${r.status}`);
    const data = (await r.json()) as GlossaryData;
    if (!data?.terms?.length) throw new Error("empty glossary");
    return data;
  } catch {
    // 엔진이 자거나 죽었다 → 툴팁을 통째로 잃느니 스냅샷을 쓴다.
    return GLOSSARY_FALLBACK;
  }
});

/// 클라이언트가 쓰기 좋은 형태(키 → 항목)로 바꾼다.
export function toMap(g: GlossaryData): Record<string, GlossTerm> {
  const m: Record<string, GlossTerm> = {};
  for (const t of g.terms) m[t.key] = t;
  return m;
}
