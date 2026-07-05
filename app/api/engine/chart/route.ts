// 서버 전용 엔진 프록시 — 브라우저 → (같은 오리진) → 파이썬 엔진.
// 클라이언트가 엔진 주소를 몰라도 되게 해, NEXT_PUBLIC_* 로 127.0.0.1 이
// 브라우저 번들에 박제되던 문제(배포 시 홈/저널/마이/궁합 fetch 전멸)를 제거한다.
// 엔진 주소는 서버 전용 env(WOLUNE_ENGINE_URL)에서만 읽는다. 같은 오리진이라 CORS 무관.
import { chartQuery, type SajuInput } from "../../../lib/sajuInput";

export const dynamic = "force-dynamic"; // 매 요청 계산(캐시 금지)

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  const inSp = new URL(request.url).searchParams;

  // 들어온 쿼리를 chartQuery 규칙으로 정규화(엔진이 기대하는 파라미터만 통과).
  const input: SajuInput = {
    date: inSp.get("date") ?? "",
    time: inSp.get("time") ?? undefined,
    city: inSp.get("city") ?? undefined,
    gender: inSp.get("gender") === "male" ? "male" : "female",
    calendar: inSp.get("calendar") === "lunar" ? "lunar" : "solar",
    is_leap_month: inSp.get("is_leap_month") === "1" || undefined,
  };
  const extra: Record<string, string> = {};
  for (const k of ["target_date", "target_year", "target_month"]) {
    const v = inSp.get(k);
    if (v) extra[k] = v;
  }
  const qs = chartQuery(input, extra).toString();

  // 타임아웃 6초 — 엔진이 꺼져 있거나 느리면 502로 폴백(클라이언트가 안내 화면 처리).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${ENGINE}/v1/chart?${qs}`, {
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
      { error: "engine_unreachable", message: "사주 엔진에 연결하지 못했습니다." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
