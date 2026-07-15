// 로그인하면서 **옛 계정으로 전환될 때**, 익명으로 쌓아둔 것을 옛 계정으로 이어붙인다.
//
// 왜 필요한가:
//   로그인 결과가 switchedToExisting 이면 uid 가 바뀐다(익명 A → 옛 계정 B). 데이터는
//   users/{uid} 에 묶여 있으니, 방금 익명으로 입력한 사주·기록이 **눈앞에서 사라진다.**
//   실제로 지워진 게 아니라 A 문서에 그대로 있는데, 사용자에겐 증발로 보인다.
//   가져올 수 있는 걸 그냥 버리고 있었다.
//
// ★ 절대 함부로 덮어쓰지 않는다:
//   · 옛 계정이 **비어 있을 때만** 자동으로 옮긴다(잃을 게 없으니 묻지 않는다).
//   · 둘 다 있으면 **묻는다**(사용자가 고르기 전엔 아무것도 안 쓴다).
//   · moods 는 날짜별이라 겹칠 수 있다 → **옛 것이 이긴다.** 겹치지 않는 날짜만 더한다.
//     기존 기록을 덮으면 이번엔 반대로 진짜 손실이 난다. 익명 쪽은 로그인 전 며칠치라
//     겹쳐봐야 하루 이틀이고, 옛 것은 오래 쌓인 진짜 기록이다.
//
// ⚠ 익명 문서는 **지우지 못한다.** 보안 규칙이 `request.auth.uid == uid` 라, 전환 후엔
//   그 문서에 쓸 권한이 없다. 전환 **전에** 지우면 전환이 실패했을 때 진짜로 날아간다.
//   그래서 남겨둔다(고아 데이터). 정리는 admin 배치의 몫 — 백로그.
import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { SajuInput } from "./sajuInput";
import type { MoodEntry } from "./moodJournal";
import type { Consent } from "./consent";

export interface AnonSnapshot {
  uid: string;
  saju: SajuInput | null;
  moods: MoodEntry[];
  consent: Consent | null;
}

export type CarryOutcome =
  /** 익명 쪽에 아무것도 없고 옛 계정에도 없음 — 신규. 아무 말도 하지 않는다. */
  | { kind: "none" }
  /** 익명 쪽이 비어 있었다 — 그냥 옛 기록으로 돌아온 것. */
  | { kind: "returned" }
  /** 옛 계정이 비어 있어 자동으로 옮겼다. */
  | { kind: "carried"; saju: boolean; moods: number }
  /** 양쪽 다 사주가 있다 — 물어봐야 한다. (moods 는 이미 안전하게 병합됨) */
  | { kind: "conflict"; snapshot: AnonSnapshot; moods: number };

/// 전환 **직전**(아직 익명일 때) 호출. 지금 uid 의 데이터를 통째로 읽어둔다.
export async function captureAnon(): Promise<AnonSnapshot | null> {
  const u = auth.currentUser;
  if (!u || !u.isAnonymous) return null; // 익명이 아니면 옮길 게 없다
  try {
    const uid = u.uid;
    const [userSnap, moodSnap] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      getDocs(collection(db, "users", uid, "moods")),
    ]);
    const data = userSnap.data();
    return {
      uid,
      saju: (data?.sajuInput as SajuInput | undefined) ?? null,
      consent: (data?.consent as Consent | undefined) ?? null,
      moods: moodSnap.docs.map((d) => d.data() as MoodEntry),
    };
  } catch {
    return null; // 못 읽었으면 이어붙이기를 포기한다(로그인 자체는 막지 않는다)
  }
}

/// 전환 **후**(옛 계정으로 로그인된 상태) 호출. 안전하게 이어붙이고 결과를 알려준다.
export async function applyCarryOver(snap: AnonSnapshot): Promise<CarryOutcome> {
  const u = auth.currentUser;
  if (!u || u.uid === snap.uid) return { kind: "none" }; // 전환이 아니면 할 일 없음

  const uid = u.uid;
  const [userSnap, moodSnap] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(collection(db, "users", uid, "moods")),
  ]);
  const old = userSnap.data();
  const oldSaju = (old?.sajuInput as SajuInput | undefined) ?? null;
  const oldConsent = (old?.consent as Consent | undefined) ?? null;
  const oldDates = new Set(moodSnap.docs.map((d) => d.id));

  // ── moods: 겹치지 않는 날짜만 더한다(옛 것이 이긴다) ──
  const fresh = snap.moods.filter((m) => m.date && !oldDates.has(m.date));
  const batch = writeBatch(db);
  for (const m of fresh) {
    // undefined 는 Firestore 가 거부한다 → 정의된 값만.
    batch.set(doc(db, "users", uid, "moods", m.date), {
      date: m.date,
      mood: m.mood,
      tags: m.tags ?? [],
      note: m.note ?? "",
      updatedAt: m.updatedAt ?? new Date().toISOString(),
      ...(m.fortune ? { fortune: m.fortune } : {}),
    });
  }

  // ── 동의: 옛 계정에 없고 익명 쪽에 있으면 함께 옮긴다 ──
  //    (안 옮기면 방금 동의한 사람에게 동의 시트가 또 뜬다)
  const carryConsent = !oldConsent && !!snap.consent;
  if (carryConsent) {
    batch.set(doc(db, "users", uid), { consent: snap.consent }, { merge: true });
  }

  // ── 사주: 옛 계정이 비어 있을 때만 자동으로. 둘 다 있으면 **쓰지 않고 묻는다.** ──
  const canAutoSaju = !!snap.saju && !oldSaju;
  if (canAutoSaju) {
    batch.set(doc(db, "users", uid), { sajuInput: snap.saju }, { merge: true });
  }

  if (fresh.length || carryConsent || canAutoSaju) await batch.commit();

  if (snap.saju && oldSaju) {
    return { kind: "conflict", snapshot: snap, moods: fresh.length };
  }
  if (canAutoSaju || fresh.length) {
    return { kind: "carried", saju: canAutoSaju, moods: fresh.length };
  }
  return oldSaju ? { kind: "returned" } : { kind: "none" };
}

/// 충돌을 사용자가 "방금 것으로 교체"로 정했을 때만 호출. 그 전엔 아무것도 안 쓴다.
export async function replaceSajuWithAnon(snap: AnonSnapshot): Promise<void> {
  const u = auth.currentUser;
  if (!u || !snap.saju) return;
  const batch = writeBatch(db);
  batch.set(doc(db, "users", u.uid), { sajuInput: snap.saju }, { merge: true });
  await batch.commit();
}

// ── 로그인 코드와 화면을 잇는 다리 ──
// 전환은 lib/firebase.ts 안에서 일어나고, 안내는 화면(CarryOverDialog)이 띄운다.
// 로그인 진입점이 여러 곳이라(마이·랜딩·사주입력·카카오 콜백) 각자 처리하게 두면
// 한 곳을 빠뜨린다 → 전환이 일어난 곳이 어디든 이벤트 하나로 모은다.
export const CARRY_EVENT = "wl-carryover";

let pending: AnonSnapshot | null = null;

/// firebase.ts 가 전환 직전에 찍어둔다.
export function stashPending(snap: AnonSnapshot | null): void {
  pending = snap;
}

/// 전환 후 firebase.ts 가 알린다 → CarryOverDialog 가 받아 처리한다.
export function announceSwitched(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CARRY_EVENT));
}

export function consumePending(): AnonSnapshot | null {
  const p = pending;
  pending = null;
  return p;
}

// ── 전환 후 "누가 화면을 이끄는가"를 로그인 호출부에 알려주는 핸드오프 ──
//
// 전환(switchedToExisting)은 CarryOverDialog 가 이벤트로 받아 처리하는데, 그 처리 방식이
// 두 갈래다:
//   · carried/returned/conflict → 새로고침 또는 충돌 모달로 **화면을 떠맡는다**(결과까지 이끈다).
//   · none/캡처실패/이어붙이기실패 → **아무 일도 안 일어난다.**
// 후자에서 호출부(signInGoogle·카카오 콜백)가 손을 놓으면, 버튼만 숨은 채 빈 폼에 말없이 멈춘다.
// 그래서 호출부가 "이어붙이기가 화면을 떠맡았는지"를 기다렸다가, 안 떠맡았으면 스스로
// 결과/신규 안내로 마무리하도록 이 신호를 둔다.
//   tookOver=true  → 새로고침/충돌모달이 이끈다 → 호출부는 손 뗀다.
//   tookOver=false → 아무 일도 없다 → 호출부가 confirmUid→사주로드→결과/신규로 마무리.
let handoffResolve: ((tookOver: boolean) => void) | null = null;

/// 전환 가능성이 있는 로그인 **직전**에 무장한다(전환이 아니면 disarm 으로 정리).
export function armCarryHandoff(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    handoffResolve = resolve;
  });
}

/// CarryOverDialog 가 처리 방향을 정한 뒤 호출한다(모든 갈래에서 정확히 한 번).
export function settleCarryHandoff(tookOver: boolean): void {
  const r = handoffResolve;
  handoffResolve = null;
  r?.(tookOver);
}

/// 전환이 아니었을 때(또는 취소·실패) 호출부가 대기 프라미스를 닫는다.
export function disarmCarryHandoff(): void {
  settleCarryHandoff(false);
}
