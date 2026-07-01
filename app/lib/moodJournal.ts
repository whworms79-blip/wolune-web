// 무드저널 저장/불러오기 — 지금은 localStorage, 나중에 백엔드로 교체 쉽게 헬퍼로 분리.
// 백엔드 전환 시: 이 파일의 read/write만 API 호출로 바꾸면 됨(함수 시그니처 유지, 필요 시 async 화).

// 기록 시점의 그날 사주 흐름 스냅샷 (mood × 사주 연결)
export interface MoodFortune {
  score: number;
  toneLine: string;
  matchedField?: string;
  dayGanzhi?: string;
}

export interface MoodEntry {
  date: string; // YYYY-MM-DD (하루 1건, 키)
  mood: number; // 1(가라앉음) ~ 5(활기참)
  tags: string[];
  note: string;
  fortune?: MoodFortune; // 기록 당일의 daily_fortune 스냅샷
  updatedAt: string; // ISO
}

const STORAGE_KEY = "wolune_mood_journal";
type Store = Record<string, MoodEntry>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 저장 불가(프라이빗 모드 등) — 무시 */
  }
}

export function getMoodEntry(date: string): MoodEntry | null {
  return readStore()[date] ?? null;
}

export function saveMoodEntry(entry: MoodEntry): void {
  const store = readStore();
  store[entry.date] = entry;
  writeStore(store);
}

export function deleteMoodEntry(date: string): void {
  const store = readStore();
  delete store[date];
  writeStore(store);
}

// 최신순(날짜 내림차순)
export function listMoodEntries(): MoodEntry[] {
  return Object.values(readStore()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// 오늘까지 연속 기록 일수(streak)
export function moodStreak(today: string): number {
  const store = readStore();
  let count = 0;
  const d = new Date(`${today}T00:00:00`);
  // 오늘 미기록이면 어제부터의 연속을 센다
  if (!store[today]) d.setDate(d.getDate() - 1);
  for (;;) {
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (store[key]) {
      count += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

const pad = (n: number) => (n < 10 ? "0" : "") + n;
