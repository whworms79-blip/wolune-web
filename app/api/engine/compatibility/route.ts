// 서버 전용 엔진 프록시(궁합) — 브라우저 → (같은 오리진) → 파이썬 엔진.
// 클라이언트가 엔진 주소를 몰라도 되게 한다. 엔진 주소는 서버 전용 env(WOLUNE_ENGINE_URL)
// 에서만 읽는다. 같은 오리진이라 CORS 무관. (/api/engine/chart 와 같은 구조)
//
// ⚠ 들어온 바디를 그대로 흘려보내지 않는다 — 엔진이 기대하는 필드만 추려 정규화한다.
//   (엔진에 임의의 JSON 이 그대로 도달하지 않게)
import type { EnginePerson } from "../../../lib/compatibility";

export const dynamic = "force-dynamic"; // 매 요청 계산(캐시 금지)

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

function person(raw: unknown): EnginePerson | null {
  const p = raw as Partial<EnginePerson> | null;
  if (!p || typeof p.birth_date !== "string") return null;
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 12) : "",
    birth_date: p.birth_date,
    birth_time: typeof p.birth_time === "string" ? p.birth_time : undefined,
    city: typeof p.city === "string" ? p.city : undefined,
    gender: p.gender === "male" ? "male" : "female",
    calendar: p.calendar === "lunar" ? "lunar" : "solar",
    is_leap_month: p.is_leap_month === true || undefined,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as { a?: unknown; b?: unknown };
  const a = person(b?.a);
  const bb = person(b?.b);
  if (!a || !bb) {
    return Response.json(
      { error: "bad_request", message: "두 사람의 생년월일이 필요합니다." },
      { status: 400 },
    );
  }

  // 타임아웃 8초 — 궁합은 차트를 두 개 계산하므로 단일 차트보다 넉넉히 준다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${ENGINE}/v1/compatibility`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a, b: bb }),
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text();
    return new Response(text, {
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
