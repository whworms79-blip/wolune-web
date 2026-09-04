// 서버 전용 엔진 프록시 — 브라우저 → (같은 오리진) → 파이썬 엔진.
// 클라이언트가 엔진 주소를 몰라도 되게 해, NEXT_PUBLIC_* 로 127.0.0.1 이
// 브라우저 번들에 박제되던 문제(배포 시 홈/저널/마이/궁합 fetch 전멸)를 제거한다.
// 엔진 주소는 서버 전용 env(WOLUNE_ENGINE_URL)에서만 읽는다. 같은 오리진이라 CORS 무관.
//
// ★ 본 경로는 POST(JSON 본문)다 — GET 쿼리스트링은 Netlify 함수 로그에 출생정보(생년월일·
//   출생지)를 남겼다(인계서 개인정보 백로그). POST 본문은 액세스 로그에 남지 않는다.
//   프록시→엔진 구간은 GET 을 유지한다: 엔진이 이미 로그에서 쿼리스트링을 지우고,
//   엔진 API 를 바꾸면 앱(Flutter)과의 계약도 함께 움직여야 하기 때문이다.
import { chartQuery, type SajuInput } from "../../../lib/sajuInput";

export const dynamic = "force-dynamic"; // 매 요청 계산(캐시 금지)

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

// GET 쿼리든 POST 본문이든 같은 규칙으로 정규화해 엔진에 넘긴다(엔진이 기대하는 파라미터만 통과).
async function proxy(raw: Record<string, unknown>): Promise<Response> {
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const input: SajuInput = {
    date: str("date"),
    time: str("time") || undefined,
    city: str("city") || undefined,
    gender: str("gender") === "male" ? "male" : "female",
    calendar: str("calendar") === "lunar" ? "lunar" : "solar",
    // GET 폴백은 "1", POST 본문은 boolean — 둘 다 받는다.
    is_leap_month: raw["is_leap_month"] === "1" || raw["is_leap_month"] === true || undefined,
  };
  const extra: Record<string, string> = {};
  for (const k of ["target_date", "target_year", "target_month"]) {
    const v = str(k);
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

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  // ⚠ 파싱 성공 ≠ 객체. 본문 "null"·"[]"·"3" 은 전부 유효한 JSON 이라 위 catch 를 지나치고,
  //   proxy 안에서 raw[k] 접근이 TypeError 로 터져 400 대신 500 이 나간다(로그도 더럽힌다).
  //   봇·헬스체커·잘못된 재시도가 실제로 이런 본문을 보낸다.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  return proxy(parsed as Record<string, unknown>);
}

// 옛 번들 폴백 — 배포 직후 아직 열려 있던 탭은 예전 번들로 GET 을 쏜다. 그들을 깨뜨리지
// 않기 위해서만 남겨둔다. 새 코드는 전부 POST(fetchChart)를 쓴다.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  return proxy(Object.fromEntries(sp.entries()));
}
