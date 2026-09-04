// 서버 전용 엔진 프록시 — 브라우저 → (같은 오리진) → 파이썬 엔진.
// 클라이언트가 엔진 주소를 몰라도 되게 해, NEXT_PUBLIC_* 로 127.0.0.1 이
// 브라우저 번들에 박제되던 문제(배포 시 홈/저널/마이/궁합 fetch 전멸)를 제거한다.
// 엔진 주소는 서버 전용 env(WOLUNE_ENGINE_URL)에서만 읽는다. 같은 오리진이라 CORS 무관.
//
// ★ 본 경로는 POST(JSON 본문)다 — GET 쿼리스트링은 Netlify 함수 로그에 출생정보(생년월일·
//   출생지)를 남겼다(인계서 개인정보 백로그). POST 본문은 액세스 로그에 남지 않는다.
//   프록시→엔진 구간은 GET 을 유지한다: 엔진이 이미 로그에서 쿼리스트링을 지우고,
//   엔진 API 를 바꾸면 앱(Flutter)과의 계약도 함께 움직여야 하기 때문이다.
import { chartQuery, toSajuInput, type SajuInput } from "../../../lib/sajuInput";

export const dynamic = "force-dynamic"; // 매 요청 계산(캐시 금지)

const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

// 정규화된 입력을 엔진에 넘긴다. 전송 형식(쿼리스트링/JSON) 사정은 각 핸들러가 흡수하고,
// 여기까지는 SajuInput 하나로만 들어온다 — 그래야 새 필드가 한 곳에서 끝난다.
async function proxy(input: SajuInput, extra: Record<string, string>): Promise<Response> {
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

// 본문에서 값 하나를 문자열로 꺼낸다. boolean true 는 "1" 로 맞춰 준다 —
// 웹 클라이언트는 is_leap_month 를 boolean 으로 보내고, 쿼리스트링은 "1" 로 보낸다.
const fromBody = (body: Record<string, unknown>) => (k: string): string | undefined => {
  const v = body[k];
  if (typeof v === "string") return v;
  if (v === true) return "1";
  return undefined;
};

const EXTRA_KEYS = ["target_date", "target_year", "target_month"] as const;
function pickExtra(get: (k: string) => string | undefined): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const k of EXTRA_KEYS) {
    const v = (get(k) || "").trim();
    if (v) extra[k] = v;
  }
  return extra;
}

export async function POST(request: Request) {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  // ⚠ 파싱 성공 ≠ 객체. 본문 "null"·"[]"·"3" 은 전부 유효한 JSON 이라 위 catch 를 지나치고,
  //   그대로 두면 필드 접근이 TypeError 로 터져 400 대신 500 이 나간다(로그도 더럽힌다).
  //   봇·헬스체커·잘못된 재시도가 실제로 이런 본문을 보낸다.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const get = fromBody(parsed as Record<string, unknown>);
  return proxy(toSajuInput(get), pickExtra(get));
}

// ⏳ 옛 번들 폴백 — **2026-10-31 이후 삭제할 것.**
//
// 배포 직후 아직 열려 있던 탭이 예전 번들로 GET 을 쏘기 때문에만 남겨 둔다. 새 코드는
// 전부 POST(fetchChart)를 쓴다. 기한을 박아 두는 이유: 이 경로로 오는 요청은 여전히
// 생년월일·출생지를 쿼리스트링에 실어 서버 로그에 남긴다 — POST 화의 목적 그 자체를
// 비켜 간다. 열려 있던 탭은 며칠이면 사라지므로, 그 뒤로는 크롤러·공유된 링크만 남는다.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const get = (k: string) => sp.get(k) ?? undefined;
  return proxy(toSajuInput(get), pickExtra(get));
}
