// Wolune 사주 결과 — 두 진입 경로를 함께 지원한다.
//
//   1) 파라미터 있는 진입 (?date=...&city=...) — **공유·익명 입력 제출**.
//      로그인 없이 보는 사람(궁합 공유로 유입 등)과 방금 입력한 사람은 URL 값으로 계산한다.
//      여기는 async 서버 컴포넌트(SSR)가 서버에서 엔진을 호출해 렌더 → 기존 동작 그대로.
//
//   2) 파라미터 없는 진입 (/saju/result) — **로그인/익명 본인이 자기 사주 보기**.
//      URL·브라우저 기록에 개인정보를 싣지 않으려고, 클라이언트가 Firestore 에서 사주를 읽어
//      렌더한다(ResultFromStore). 저장된 사주가 없으면 입력 화면으로 보낸다.
//
// ⚠ 공유 링크(/compatibility/share)와 OG 라우트는 이 파일과 무관 — 그대로 둔다.
import { isCompleteChart, type EngineChart } from "./chart";
import { getGlossary } from "../../lib/glossary";
import { chartQuery, type SajuInput } from "../../lib/sajuInput";
import { FallbackState } from "./ui";
import ResultView from "./ResultView";
import ResultFromStore from "./ResultFromStore";

// 엔진 주소(기본 로컬). 서버→엔진 호출이라 CORS 무관.
const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

// searchParams 값은 string | string[] → 첫 값만
function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

type FetchResult =
  | { ok: true; chart: EngineChart }
  | { ok: false; reason: "engine_down" | "bad_response" };

// 서버에서 엔진 호출 (타임아웃 6초, 실패해도 throw 대신 결과 객체 반환)
async function fetchChart(sp: Record<string, string | string[] | undefined>): Promise<FetchResult> {
  // 들어온 쿼리를 chartQuery 규칙으로 정규화(엔진이 기대하는 파라미터만 통과).
  const input: SajuInput = {
    date: one(sp.date),
    time: one(sp.time) || undefined,
    city: one(sp.city) || undefined,
    gender: one(sp.gender) === "male" ? "male" : "female",
    calendar: one(sp.calendar) === "lunar" ? "lunar" : "solar",
    is_leap_month: one(sp.is_leap_month) === "1" || undefined,
  };
  const params = chartQuery(input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${ENGINE}/v1/chart?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: "bad_response" };
    const chart = (await res.json()) as unknown;
    if (!isCompleteChart(chart)) {
      return { ok: false, reason: "bad_response" };
    }
    return { ok: true, chart };
  } catch {
    return { ok: false, reason: "engine_down" };
  } finally {
    clearTimeout(timer);
  }
}

export default async function SajuResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // 용어사전은 두 경로 모두가 쓴다(개인정보 아님). 서버에서 한 번 받아 내려준다.
  const glossary = await getGlossary();

  // ── 2) 파라미터 없이 진입 → 본인 사주를 Firestore 에서 읽어 클라에서 렌더 ──
  if (!one(sp.date)) {
    return <ResultFromStore glossary={glossary} />;
  }

  // ── 1) 파라미터 있는 진입(공유·익명) → 서버에서 엔진 호출해 렌더 ──
  const result = await fetchChart(sp);
  if (!result.ok) {
    return (
      <FallbackState
        title="지금은 사주를 불러오지 못했어요"
        body="계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  return <ResultView chart={result.chart} glossary={glossary} />;
}
