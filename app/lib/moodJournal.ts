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
