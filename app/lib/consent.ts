// 개인정보 수집·이용 동의 기록.
// 첫 사주 제출 시 받은 동의를 users/{uid}.consent 에 남겨 나중에 입증할 수 있게 한다.
// (동의 화면을 따로 만들지 않고, 실제로 데이터를 저장하는 순간 딱 한 번 받는다.)
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";

// 현재 방침 버전 — 새로 동의를 받을 때 이 값이 기록된다. 방침이 바뀌면 올린다.
export const CONSENT_VERSION = "2026-07-14";

// **재동의를 요구하는 최소 버전.** 이 값보다 오래된 동의만 다시 받는다.
//
// 버전이 바뀔 때마다 무조건 재동의를 받으면, 사용자에게 **유리한 변경**(수집 축소)에도
// 동의 시트가 튀어나온다. 2026-07-14 개정이 정확히 그랬다 — 무드 통찰 계산이 엔진으로
// 옮겨가면서 (a) 기분 점수가 계산 서버로 전송되기 시작했지만, 동시에 (b) 액세스 로그에서
// 생년월일·출생지가 사라졌고 (c) 메모·태그는 애초에 전송하지 않는다.
//
// 그래서 재동의 게이트는 띄우지 않는다. 대신 **조용히 넘어가지도 않는다** — 무드 기록이
// 전에 안 가던 곳으로 가기 시작하는 건 맞으므로, 통찰이 처음 열릴 때 저널에서 한 번
// 담백하게 알린다(journal/page.tsx 의 INSIGHT_NOTICE_KEY).
export const REQUIRE_RECONSENT_SINCE = "2026-07-13";

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

// 이 동의 기록이 지금도 유효한가. 최신 버전일 필요는 없고, REQUIRE_RECONSENT_SINCE 이상이면 된다.
// (버전은 YYYY-MM-DD 라 문자열 비교가 곧 날짜 비교다.)
//
// ★ 동의 시트 판정(hasCurrentConsent)과 로그인 시 이관 판정(carryOver)이 **같은 기준**을
//   써야 한다. 한쪽만 다르면 "이관은 했는데 시트는 뜨는" 식의 어긋남이 난다. 그래서 여기 하나로.
export function isConsentValid(c: Consent | null | undefined): boolean {
  return !!c?.privacy && !!c?.age14 && (c?.version ?? "") >= REQUIRE_RECONSENT_SINCE;
}

// 현재 로그인된 uid 에 유효한 동의가 있는지.
export async function hasCurrentConsent(): Promise<boolean> {
  try {
    const uid = await ensureSignedIn();
    const snap = await getDoc(doc(db, "users", uid));
    return isConsentValid(snap.data()?.consent as Consent | undefined);
  } catch {
    return false;
  }
}
