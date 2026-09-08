// 무드저널 저장/불러오기 — 클라우드(Firestore: users/{uid}/moods/{YYYY-MM-DD}).
// 익명 계정으로도 저장되어 기기·브라우저가 바뀌어도 유지된다. 앱(Flutter)과 동일 스키마.
// 감정 기록은 민감 정보 — 본인 계정만 접근(보안규칙), 외부 공유·광고 없음, 삭제 제공.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";
import { pad } from "./time";

// 기록 시점의 그날 사주 흐름 스냅샷 (mood × 사주 연결)
export interface MoodFortune {
  score: number;
  toneLine: string;
  matchedField?: string;
  dayGanzhi?: string;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD (하루 1건, 문서 ID)
  mood: number; // 1(가라앉음) ~ 5(활기참)
  tags: string[];
  note: string;
  fortune?: MoodFortune; // 기록 당일의 daily_fortune 스냅샷
  updatedAt: string; // ISO
}

async function moodsCol() {
  const uid = await ensureSignedIn();
  return collection(db, "users", uid, "moods");
}

export async function getMoodEntry(date: string): Promise<MoodEntry | null> {
  try {
    const uid = await ensureSignedIn();
    const snap = await getDoc(doc(db, "users", uid, "moods", date));
    return snap.exists() ? (snap.data() as MoodEntry) : null;
  } catch {
    return null;
  }
}

export async function saveMoodEntry(entry: MoodEntry): Promise<void> {
  try {
    const uid = await ensureSignedIn();
    // undefined 필드는 Firestore가 거부 → 정의된 값만 담는다.
    const data: MoodEntry = {
      date: entry.date,
      mood: entry.mood,
      tags: entry.tags,
      note: entry.note,
      updatedAt: entry.updatedAt,
      ...(entry.fortune ? { fortune: entry.fortune } : {}),
    };
    await setDoc(doc(db, "users", uid, "moods", entry.date), data);
  } catch {
    /* 저장 실패 — 무시(오프라인 캐시가 이후 동기화) */
  }
}

export async function deleteMoodEntry(date: string): Promise<void> {
  try {
    const uid = await ensureSignedIn();
    await deleteDoc(doc(db, "users", uid, "moods", date));
  } catch {
    /* 무시 */
  }
}

// 모든 무드 기록 삭제(데이터 초기화용)
export async function clearMoodJournal(): Promise<void> {
  try {
    const col = await moodsCol();
    const snap = await getDocs(col);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    /* 무시 */
  }
}

// 최신순(날짜 내림차순). 문서 ID 정렬은 인덱스를 요구하므로 클라이언트에서 정렬.
export async function listMoodEntries(): Promise<MoodEntry[]> {
  try {
    const col = await moodsCol();
    const snap = await getDocs(col);
    return snap.docs
      .map((d) => d.data() as MoodEntry)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

// 오늘까지 연속 기록 일수(streak)
export async function moodStreak(today: string): Promise<number> {
  const entries = await listMoodEntries();
  const dates = new Set(entries.map((e) => e.date));
  let count = 0;
  const d = new Date(`${today}T00:00:00`);
  // 오늘 미기록이면 어제부터의 연속을 센다
  if (!dates.has(today)) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (dates.has(key)) {
      count += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

// ── §7 정서적 안전 — 지속적 저기분 ──────────────────────────────────────────
//
// PRD §7 · 디자인 시스템 §10 이 **필수**로 못 박은 가드레일이다. 앱(Flutter)에는
// 2026-09-06 에 넣었는데 **웹에는 없었다** — 웹에도 같은 무드저널이 있으므로
// 같은 약속이 걸린다(2026-09-08 대조에서 발견).
//
// ⚠ 앱 `app/lib/data/mood_store.dart` 와 **같은 값·같은 규칙**이어야 한다.
//   한쪽만 바꾸면 같은 사람이 기기에 따라 다른 대접을 받는다.

export const LOW_MOOD_WINDOW_DAYS = 14; // 되돌아보는 창
export const LOW_MOOD_THRESHOLD = 5; // 그 창 안에 하위 2단계가 이만큼이면
export const LOW_MOOD_MUTE_DAYS = 14; // 한 번 띄우면 이 기간은 다시 묻지 않는다
export const LOW_MOOD_LEVEL = 2; // 1(많이 가라앉음)·2(조금 가라앉음)

const LOW_MOOD_NOTICE_KEY = "wl_low_mood_notice_at";

/** 지속적 저기분인가 — 안내 한 번을 띄울지 정하는 값이다. **진단이 아니다.**
 *
 * ★ '연속일'이 아니라 '건수'로 세는 이유: 마음이 무거운 시기엔 기록 자체를 건너뛴다.
 *   연속을 요구하면 정작 힘든 사람에게서 조건이 먼저 깨진다. */
export function hasSustainedLowMood(entries: MoodEntry[], today: Date): boolean {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  from.setDate(from.getDate() - (LOW_MOOD_WINDOW_DAYS - 1));
  let low = 0;
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00`);
    if (Number.isNaN(d.getTime()) || d < from) continue;
    if (e.mood >= 1 && e.mood <= LOW_MOOD_LEVEL) low += 1;
  }
  return low >= LOW_MOOD_THRESHOLD;
}

/** 지금 띄워도 되는가 — 마지막 노출로부터 충분히 지났는가.
 *  반복해서 들이미는 것 자체가 §7 이 금지한 '부정 강화'다. 감지보다 이 억제가 더 중요하다.
 *  localStorage 를 못 써도(프라이빗 모드) 동작은 그대로 — 그땐 매번 띄우지 않고 넘어간다. */
export function canShowLowMoodNotice(today: Date): boolean {
  let at: string | null = null;
  try {
    at = localStorage.getItem(LOW_MOOD_NOTICE_KEY);
  } catch {
    return true; // 저장을 못 읽으면 억제도 못 한다 — 안내를 막지는 않는다
  }
  if (!at) return true;
  const last = new Date(`${at}T00:00:00`);
  if (Number.isNaN(last.getTime())) return true;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((t.getTime() - last.getTime()) / 86_400_000);
  return days >= LOW_MOOD_MUTE_DAYS;
}

export function markLowMoodNoticeShown(today: Date): void {
  const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  try {
    localStorage.setItem(LOW_MOOD_NOTICE_KEY, key);
  } catch {
    /* 저장 못 해도 안내 자체는 이미 보여줬다 */
  }
}
