// 사주 입력값의 브라우저 저장 + 엔진 URL 빌드 (홈에서 재사용).
// /saju 계산 시 저장 → /home에서 매번 생일 재입력 없이 불러오기.

export interface SajuInput {
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (없으면 시간 모름)
  city?: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  is_leap_month?: boolean;
}

export const SAJU_STORAGE_KEY = "wolune_saju_input";

// 로컬 엔진(개발). 배포 시 NEXT_PUBLIC_WOLUNE_ENGINE_URL로 덮어씀.
export const ENGINE_URL =
  process.env.NEXT_PUBLIC_WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

export function saveSajuInput(input: SajuInput): void {
  try {
    localStorage.setItem(SAJU_STORAGE_KEY, JSON.stringify(input));
  } catch {
    /* 저장 불가(프라이빗 모드 등) — 무시 */
  }
}

export function loadSajuInput(): SajuInput | null {
  try {
    const raw = localStorage.getItem(SAJU_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as SajuInput;
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

// 엔진 API 전체 URL (브라우저에서 직접 호출 — 엔진 CORS 열려 있음)
export function chartUrl(input: SajuInput, extra?: Record<string, string>): string {
  return `${ENGINE_URL}/v1/chart?${chartQuery(input, extra).toString()}`;
}
