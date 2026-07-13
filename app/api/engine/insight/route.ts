// 서버 전용 엔진 프록시 — 브라우저 → (같은 오리진) → 파이썬 엔진의 POST /v1/insight.
// 엔진 주소는 서버 전용 env(WOLUNE_ENGINE_URL)에서만 읽는다(브라우저에 박제 금지).
//
// 개인정보: **계산에 쓰는 값만 통과시킨다.** 클라이언트가 실수로 메모·태그·날짜를 실어
// 보내도 여기서 걸러낸다 — 엔진까지 가지 않는다. 프록시가 마지막 방어선이다.
import { INSIGHT_FIELDS, type InsightEntry } from "../../../lib/insight";

export const dynamic = "force-dynamic"; // 매 요청 계산(캐시 금지)

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  let entries: InsightEntry[] = [];
  try {
    const body = await request.json();
    const raw = Array.isArray(body?.entries) ? body.entries : [];
    // 화이트리스트 — mood / score / day_ganzhi 만. 나머지는 버린다.
    entries = raw.slice(0, 1000).map((e: Record<string, unknown>) => {
      const picked: Record<string, unknown> = {};
      for (const k of INSIGHT_FIELDS) picked[k] = e?.[k];
      return picked as unknown as InsightEntry;
    });
  } catch {
    return Response.json(
      { error: "bad_request", message: "요청을 읽을 수 없습니다." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${ENGINE}/v1/insight`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ entries }),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "engine_unreachable", message: "계산 서버에 연결하지 못했습니다." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
