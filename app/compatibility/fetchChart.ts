// 서버(SSR·OG 라우트)에서 엔진을 호출해 한 사람의 사주를 가져온다.
// 브라우저 직접 호출(sajuInput.chartUrl)과 달리 서버→엔진이라 CORS 무관, WOLUNE_ENGINE_URL 사용.
// (서버 전용: process.env 서버 엔진 주소를 쓰며 서버 컴포넌트/라우트에서만 임포트한다.)
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
    if (!c?.pillars || !c?.five_elements) return null;
    return c;
  } catch {
    return null;
  }
}
