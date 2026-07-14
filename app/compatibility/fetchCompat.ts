// 서버(SSR·OG 라우트)에서 엔진의 궁합을 가져온다.
// 서버→엔진 직접 호출이라 CORS 무관, 서버 전용 env(WOLUNE_ENGINE_URL) 사용.
// (클라이언트는 대신 /api/engine/compatibility 프록시를 거친다 — 엔진 주소가 브라우저
//  번들에 박히면 배포 후 모든 fetch 가 방문자 자신의 PC를 때린다. 예전에 그랬다.)
// (서버 전용: 서버 컴포넌트/라우트에서만 임포트한다.)
//
// ⚠ 점수·근거·문구는 전부 엔진이 만든다 — 여기서 계산하지 않는다(lib/compatibility.ts 주석 참고).
//   예전엔 차트를 두 번 받아 웹이 직접 궁합을 계산했다(fetchChartServer). 그 규칙표가
//   엔진과 어긋나 있었던 게 엔진화의 이유다.
import {
  isCompatView,
  toEnginePerson,
  type CompatView,
  type SharePerson,
} from "../lib/compatibility";

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export async function fetchCompatServer(
  a: SharePerson,
  b: SharePerson,
  signal?: AbortSignal,
): Promise<CompatView | null> {
  try {
    const res = await fetch(`${ENGINE}/v1/compatibility`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        a: toEnginePerson(a.name, a.input),
        b: toEnginePerson(b.name, b.input),
      }),
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const v = await res.json();
    return isCompatView(v) ? v : null; // 부분 응답으로 화면이 깨지지 않게
  } catch {
    return null;
  }
}
