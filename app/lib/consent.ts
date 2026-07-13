// 개인정보 수집·이용 동의 기록.
// 첫 사주 제출 시 받은 동의를 users/{uid}.consent 에 남겨 나중에 입증할 수 있게 한다.
// (동의 화면을 따로 만들지 않고, 실제로 데이터를 저장하는 순간 딱 한 번 받는다.)
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";

// 방침이 바뀌면 이 값을 올리고, 저장된 version 과 비교해 재동의를 받는다.
export const CONSENT_VERSION = "2026-07-13";

export interface Consent {
  privacy: boolean; // 개인정보 수집·이용 동의(필수)
  age14: boolean; // 만 14세 이상(필수)
  at: string; // 동의 시각(ISO)
  version: string; // 동의한 방침 버전
}

export async function saveConsent(): Promise<void> {
  try {
    const uid = await ensureSignedIn();
    const consent: Consent = {
      privacy: true,
      age14: true,
      at: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    await setDoc(doc(db, "users", uid), { consent }, { merge: true });
  } catch {
    /* 저장 실패해도 사주 계산은 막지 않는다(오프라인 캐시가 이후 동기화) */
  }
}

// 현재 방침 버전에 동의했는지. (기존 사용자 재동의 판단용 — 다음 단계에서 사용)
export async function hasCurrentConsent(): Promise<boolean> {
  try {
    const uid = await ensureSignedIn();
    const snap = await getDoc(doc(db, "users", uid));
    const c = snap.data()?.consent as Consent | undefined;
    return !!c?.privacy && !!c?.age14 && c.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}
