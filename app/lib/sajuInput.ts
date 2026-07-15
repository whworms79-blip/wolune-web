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

// 엔진 API URL — 같은 오리진 서버 프록시(/api/engine/chart)를 거친다.
// 엔진 실주소는 서버(route.ts)의 WOLUNE_ENGINE_URL 에만 있고 브라우저 번들엔 노출되지 않는다.
export function chartUrl(input: SajuInput, extra?: Record<string, string>): string {
  return `/api/engine/chart?${chartQuery(input, extra).toString()}`;
}
