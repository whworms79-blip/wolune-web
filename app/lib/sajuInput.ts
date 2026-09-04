// 사주 입력값의 클라우드 저장(Firestore: users/{uid}.sajuInput) + 엔진 URL 빌드.
// /saju 계산 시 저장 → /home·/journal 등에서 매번 재입력 없이 불러오기.
// 익명 계정으로도 저장되어 기기·브라우저가 바뀌어도 유지된다. 앱(Flutter)과 동일 스키마.

import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";

export interface SajuInput {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (없으면 시간 모름)
  city?: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  is_leap_month?: boolean;
}

export const SAJU_STORAGE_KEY = "wolune_saju_input";

// 바깥에서 들어온 값(쿼리스트링·JSON 본문) → SajuInput.
//
// 왜 한 곳인가: 이 "엔진 입력 계약"(기본값 female/solar, 빈 값은 undefined)을 손으로 두 번
// 적어 두면 반드시 어긋난다 — 실제로 프록시는 boolean is_leap_month 를 받고 SSR 경로는
// 문자열 "1" 만 받는 상태로 갈라져 있었다. 새 필드도 여기 한 줄만 늘리면 된다.
//
// [get] 은 키 하나를 문자열로 꺼내는 함수다. 쿼리스트링이든 JSON 본문이든 이 모양으로
// 감싸서 넘긴다 — 그래야 "문자열이냐 boolean 이냐" 같은 전송 형식 사정이 여기 스며들지 않는다.
export function toSajuInput(get: (key: string) => string | undefined): SajuInput {
  const v = (k: string) => (get(k) || "").trim();
  return {
    date: v("date"),
    time: v("time") || undefined,
    city: v("city") || undefined,
    gender: v("gender") === "male" ? "male" : "female",
    calendar: v("calendar") === "lunar" ? "lunar" : "solar",
    is_leap_month: v("is_leap_month") === "1" || undefined,
  };
}

export async function saveSajuInput(input: SajuInput): Promise<void> {
  try {
    const uid = await ensureSignedIn();
    // ⚠ merge:true 는 sajuInput 안의 필드까지 **병합**한다. 그래서 옵셔널 필드(time·city·
    //   is_leap_month)가 없을 때 그냥 빼면(undefined → ignoreUndefinedProperties 가 제거)
    //   기존 값이 그대로 남는다 — 편집으로 '시각→시간 모름'이나 '음력→양력'이 **반영되지 않는다.**
    //   그래서 없는 옵셔널은 deleteField() 로 명시 삭제한다.
    const sajuInput = {
      date: input.date,
      gender: input.gender,
      calendar: input.calendar,
      time: input.time ?? deleteField(),
      city: input.city ?? deleteField(),
      is_leap_month: input.is_leap_month ?? deleteField(),
    };
    await setDoc(doc(db, "users", uid), { sajuInput }, { merge: true });
  } catch {
    /* 저장 실패 — 무시(오프라인 캐시가 이후 동기화) */
  }
}

export async function clearSajuInput(): Promise<void> {
  try {
    const uid = await ensureSignedIn();
    await setDoc(
      doc(db, "users", uid),
      { sajuInput: deleteField() },
      { merge: true },
    );
  } catch {
    /* 무시 */
  }
}

export async function loadSajuInput(): Promise<SajuInput | null> {
  try {
    const uid = await ensureSignedIn();
    const snap = await getDoc(doc(db, "users", uid));
    const v = snap.data()?.sajuInput as SajuInput | undefined;
    return v && v.date ? v : null;
  } catch {
    return null;
  }
}

// 입력 → 엔진 쿼리스트링(양력/음력/윤달/도시/시간 규칙 일원화)
export function chartQuery(
  input: SajuInput,
  extra?: Record<string, string>,
): URLSearchParams {
  const p = new URLSearchParams();
  p.set("date", input.date);
  if (input.time) p.set("time", input.time);
  if (input.city) p.set("city", input.city);
  p.set("gender", input.gender);
  if (input.calendar === "lunar") {
    p.set("calendar", "lunar");
    if (input.is_leap_month) p.set("is_leap_month", "1");
  }
  if (extra) for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p;
}

// 엔진 호출 — 같은 오리진 서버 프록시(/api/engine/chart)에 **POST** 한다.
// 엔진 실주소는 서버(route.ts)의 WOLUNE_ENGINE_URL 에만 있고 브라우저 번들엔 노출되지 않는다.
// ⚠ 예전엔 GET 쿼리스트링이라 Netlify 함수 로그에 출생정보가 남았다(개인정보 백로그).
//   POST 본문은 액세스 로그에 남지 않는다.
export function fetchChart(
  input: SajuInput,
  extra?: Record<string, string>,
  init?: Pick<RequestInit, "signal">,
): Promise<Response> {
  return fetch("/api/engine/chart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, ...extra }),
    cache: "no-store",
    signal: init?.signal,
  });
}
