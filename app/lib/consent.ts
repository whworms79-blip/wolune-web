// 개인정보 수집·이용 동의 기록.
// 첫 사주 제출 시 받은 동의를 users/{uid}.consent 에 남겨 나중에 입증할 수 있게 한다.
// (동의 화면을 따로 만들지 않고, 실제로 데이터를 저장하는 순간 딱 한 번 받는다.)
import { doc, setDoc } from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";
import { readUserDoc } from "./firestoreRead";

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

// 동의 판정 결과.
//
// ★ **"모름"과 "동의 안 함"은 다르다.** 예전엔 읽기 실패를 catch 로 잡아 `false`(=미동의)로
//   뭉갰다. 그런데 uid 가 막 바뀐 직후엔 옛 uid 문서 읽기가 보안 규칙에 걸려
//   permission-denied 로 떨어진다 — 그걸 "동의 안 했다"로 읽으면 **이미 동의한 사람에게
//   시트가 뜬다.** 그래서 세 번째 상태를 둔다.
//
// ★ 그리고 uid 를 **결과에 함께 싣는다.** 이 답이 어느 계정에 대한 것인지 값 자체가 알고
//   있어야, 늦게 도착한 남의 계정 답이 지금 계정의 답을 덮어쓰는 사고를 막을 수 있다
//   (ConsentGate 가 착지 시점에 대조한다).
export type ConsentStatus = "yes" | "no" | "unknown";
export interface ConsentVerdict {
  uid: string;
  status: ConsentStatus;
}

// 동의를 남긴다. **성공 여부를 돌려준다.**
//
// 예전엔 실패를 빈 catch 로 삼키고 void 를 반환했다. 그래서 저장이 실패해도 화면은
// "동의됨"으로 굴고(그 세션 내내 시트가 안 뜸), 다음 전체 페이지 로드에서야 시트가
// 되살아났다 — 원인을 찾기 지독히 어려운 모양이다. 실패는 시끄러워야 한다(교훈 6).
//
// ⚠ uid 는 여기서 ensureSignedIn 으로 구한다. **저장하는 순간**이니 계정이 없으면 만드는 게
//   맞다 — 계정 생성은 쓰기 경로의 일이다(읽기 경로인 readConsent 에서는 뺐다).
export async function saveConsent(): Promise<boolean> {
  try {
    const uid = await ensureSignedIn();
    const consent: Consent = {
      privacy: true,
      age14: true,
      at: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    await setDoc(doc(db, "users", uid), { consent }, { merge: true });
    return true;
  } catch (e) {
    console.error("[consent] 동의 저장 실패", e);
    return false;
  }
}

// 이 동의 기록이 지금도 유효한가. 최신 버전일 필요는 없고, REQUIRE_RECONSENT_SINCE 이상이면 된다.
// (버전은 YYYY-MM-DD 라 문자열 비교가 곧 날짜 비교다.)
//
// ★ 동의 시트 판정(readConsent)과 로그인 시 이관 판정(carryOver)이 **같은 기준**을
//   써야 한다. 한쪽만 다르면 "이관은 했는데 시트는 뜨는" 식의 어긋남이 난다. 그래서 여기 하나로.
export function isConsentValid(c: Consent | null | undefined): boolean {
  return !!c?.privacy && !!c?.age14 && (c?.version ?? "") >= REQUIRE_RECONSENT_SINCE;
}

// **특정 uid** 의 동의를 읽는다.
//
// ★ uid 를 인자로 받는 게 핵심이다. 예전엔 이 함수가 ensureSignedIn 으로 uid 를 스스로
//   구했는데, 그러면 "어느 계정을 읽었는지"가 await 가 풀리는 시점에 정해져 호출자가 알 수
//   없었다. 로그아웃→재로그인처럼 uid 가 연달아 바뀌는 길에서, 호출자는 돌아온 답이 지금
//   계정에 대한 것인지 남은 계정에 대한 것인지 구분하지 못했다.
//
// ★ 부수 효과 제거: 예전엔 **동의를 확인하는 코드가 익명 계정을 만들어냈다**(ensureSignedIn).
//   판정은 읽기다. 계정 생성은 saveConsent 쪽에 둔다.
// ★★ 평범한 getDoc 이 아니라 **readUserDoc** 을 쓴다. 이게 이 함수의 핵심이다.
//
//   auth 가 막 바뀐 직후(카카오 signInWithCustomToken 직후)의 읽기는 멀쩡히 있는 문서를
//   **"없음"으로 돌려준다** — 에러도 아니라서 catch 에도 안 걸리고, 그대로 "동의 안 함"이 된다.
//   → 이미 동의한 계정으로 로그인했는데 동의 시트가 떴다(2026-07-29 라이브 로그로 확인).
//   자세한 경위와 왜 getDocFromServer 로도 안 막히는지는 lib/firestoreRead.ts 주석 참고.
//
//   판정은 **확인된 답만 믿는다.** 못 읽으면 "모름"이지 "없음"이 아니다.
export async function readConsent(uid: string): Promise<ConsentVerdict> {
  try {
    const snap = await readUserDoc(uid);
    return {
      uid,
      status: isConsentValid(snap.data()?.consent as Consent | undefined) ? "yes" : "no",
    };
  } catch (e) {
    // 읽지 못한 것뿐이다 — "동의 안 함"으로 단정하지 않는다.
    console.error("[consent] 동의 조회 실패", uid, e);
    return { uid, status: "unknown" };
  }
}
