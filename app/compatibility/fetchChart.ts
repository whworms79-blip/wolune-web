// 서버(SSR·OG 라우트)에서 엔진을 호출해 한 사람의 사주를 가져온다.
// 서버→엔진 직접 호출이라 CORS 무관, 서버 전용 env(WOLUNE_ENGINE_URL) 사용.
// (클라이언트는 대신 /api/engine/chart 프록시(route.ts)를 거친다 — sajuInput.chartUrl)
// (서버 전용: 서버 컴포넌트/라우트에서만 임포트한다.)
import { chartQuery, type SajuInput } from "../lib/sajuInput";
import type { CompatChart } from "../lib/compatibility";

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export async function fetchChartServer(
  input: SajuInput,
  signal?: AbortSignal,
): Promise<CompatChart | null> {
  try {
    const res = await fetch(`${ENGINE}/v1/chart?${chartQuery(input).toString()}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) return null;
    const c = (await res.json()) as CompatChart;
    const P = c?.pillars, FE = c?.five_elements;
    if (!P || !FE) return null;
    // 년·월·일 3기둥·오행 5종이 있어야 궁합 계산이 안전. 시주(hour)는 시간 미상이면
    // 없을 수 있으므로 필수에서 제외(부분 응답은 폴백으로).
    const okP = (["year", "month", "day"] as const).every(
      (k) => P[k] && typeof P[k].stem === "string" && typeof P[k].branch === "string",
    );
    const okFE = (["wood", "fire", "earth", "metal", "water"] as const).every(
      (k) => FE[k] && typeof FE[k].pct === "number",
    );
    if (!okP || !okFE) return null;
    return c;
  } catch {
    return null;
  }
}
