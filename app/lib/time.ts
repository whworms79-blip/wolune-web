// 시간 문자열 변환 유틸 — 여러 화면(사주 입력·궁합·홈·저널)에서 공용.
// 한 곳에서 관리해 표기 규칙이 화면마다 어긋나는 것을 막는다.

export const pad = (n: number) => (n < 10 ? "0" : "") + n;

// "오전 11:11" / "오후 3:30" / "23:05" → "HH:MM" (없으면 "")
export function parseTime(s: string): string {
  s = (s || "").trim();
  if (!s) return "";
  const pm = /오후|pm/i.test(s);
  const am = /오전|am/i.test(s);
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  if (pm && h < 12) h += 12; // 오후 3시 → 15
  if (am && h === 12) h = 0; // 오전 12시 → 00
  return `${pad(h)}:${m[2]}`;
}

// "23:05" → "오후 11:05" (저장된 24시간 표기를 폼 표시용으로)
export function to12h(hhmm: string): string {
  const m = (hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  const ap = h < 12 ? "오전" : "오후";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${ap} ${h12}:${m[2]}`;
}
