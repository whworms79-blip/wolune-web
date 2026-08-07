// users/{uid} 읽기 — **auth 토큰 교체 순간의 "거짓 없음"을 걸러낸다.**
//
// ── 관측된 사실 (2026-07-29, 라이브 로그) ──
// 카카오 signInWithCustomToken 직후 onAuthStateChanged 가 새 uid 로 발화하는데, 그 순간
// Firestore 클라이언트는 아직 새 토큰을 못 받은 상태다. 그 창에서 나간 읽기는
// **에러도 아니고 permission-denied 도 아닌 "문서 없음"** 으로 조용히 돌아온다.
//
//   land  bx6KyF5… => no   | ref = bx6KyF5…  → 반영     ← readConsent
//   carryover 결과 = none                                ← applyCarryOver (같은 문서)
//
// 서로 무관한 두 코드가 같은 문서를 동시에 "비었다"고 읽었다 — 우연이 아니라 구조다.
// Firestore 콘솔엔 consent 도 sajuInput 도 멀쩡히 있었고, **같은 화면의 /home 은 몇 초 뒤
// 같은 문서를 정상적으로 읽어 사주·운세를 그렸다.** 창이 짧고 지나가면 정상이라는 뜻이다.
//
// ⚠ getDocFromServer 로 소스를 서버로 강제해도 막히지 않는다(실측). 캐시냐 서버냐의 문제가
//   아니라, 토큰이 바뀌는 동안 스트림/타깃이 재수립되는 과정의 문제다. 우리가 없앨 수 없다.
//
// ── 그래서 ──
// **"없음"을 한 번에 믿지 않는다.** 없다고 나오면 잠깐 뒤 다시 확인한다.
// 진짜 없는 문서(신규 사용자)는 재확인해도 없으므로 결과가 같다 — 대가는 수백 ms 뿐이고,
// 그 대가로 "이미 동의한 사람에게 동의 시트를 다시 들이미는" 사고를 막는다.
// 있는 문서는 첫 읽기에 바로 돌아오므로 추가 비용이 0이다(대부분의 경우).
import { doc, getDocFromServer, type DocumentSnapshot } from "firebase/firestore";
import { db } from "./firebase";

/** 재확인 간격. 토큰 전파는 짧게 끝나므로 두 번이면 충분하다(실측 기준). */
const DEFAULT_RETRY_MS = [250, 600] as const;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * users/{uid} 를 서버에서 읽되, **"문서 없음"은 재확인한 뒤에만 믿는다.**
 *
 * 읽기 자체가 실패하면(권한·네트워크) **throw 한다.** 삼키지 않는다 —
 * 호출부가 "없음"과 "못 읽음"을 구분해서 판단해야 하기 때문이다.
 *
 * @param retryMs 재확인 간격(ms). 시험에서 `[0, 0]` 으로 넘겨 즉시 돌린다.
 */
export async function readUserDoc(
  uid: string,
  retryMs: readonly number[] = DEFAULT_RETRY_MS,
): Promise<DocumentSnapshot> {
  let snap = await getDocFromServer(doc(db, "users", uid));
  for (const ms of retryMs) {
    if (snap.exists()) return snap; // 있으면 끝 — 추가 비용 없음
    await sleep(ms);
    snap = await getDocFromServer(doc(db, "users", uid));
  }
  return snap; // 재확인해도 없다 → 진짜 없는 것으로 본다
}
