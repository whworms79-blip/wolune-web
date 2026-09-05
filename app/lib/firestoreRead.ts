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

// 재확인 간격(ms). 합계 약 3.7초까지 기다린다.
//
// ⚠ 예전엔 [250, 600] 두 번(=850ms)이었는데 **모자랐다.** 2026-09-05 라이브 로그에서
//   그 창이 850ms 를 넘겨, 동의 판정과 이어붙이기가 **같은 문서를 동시에 "비었다"고** 읽었다:
//     land bx6KyF5… => no   /   carryover 결과 = none
//   실제로는 사주도 동의도 멀쩡히 있는 계정이었다(전체 새로고침하면 정상).
//   있는 문서는 첫 읽기에 돌아오므로, 이 값을 늘려도 정상 사용자에겐 추가 비용이 0이다.
const DEFAULT_RETRY_MS = [200, 400, 800, 1200, 1100] as const;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * users/{uid} 를 서버에서 읽되, **"문서 없음"은 재확인한 뒤에만 믿는다.**
 *
 * 읽기 자체가 실패하면(권한·네트워크) **throw 한다.** 삼키지 않는다 —
 * 호출부가 "없음"과 "못 읽음"을 구분해서 판단해야 하기 때문이다.
 *
 * @param retryMs 재확인 간격(ms). 시험에서 `[0, 0]` 으로 넘겨 즉시 돌린다.
 */
/**
 * 쓸 만한 답인가 — **"문서가 있다"가 아니라 "내용이 있다"** 로 판단한다.
 *
 * ★ 2026-09-05, Firestore 콘솔로 확정한 사실:
 *   users/bx6KyF5… 에는 유효한 consent 도 sajuInput 도 멀쩡히 들어 있는데,
 *   카카오 로그인 직후의 읽기는 그 문서를 **"있지만 내용은 비어 있음"** 으로 돌려줬다.
 *   그래서 동의 판정은 no, 이어붙이기는 '사주 없음' 이 됐다(같은 원인, 서로 다른 두 코드).
 *
 *   예전 구현은 `snap.exists()` 만 봤기 때문에 이 응답을 **정답으로 받아들이고 즉시 반환**했다.
 *   "문서 없음"만 재확인하고 "내용 없음"은 재확인하지 않은 것 — 그게 7주간 안 잡힌 구멍이다.
 *
 * 정상 사용자 문서는 최소 한 필드(consent·sajuInput·linkedProvider 중 하나)를 갖는다.
 * 필드가 하나도 없는 문서는 정상 상태가 아니므로 "아직 못 받았다"로 본다.
 */
const hasContent = (snap: DocumentSnapshot): boolean =>
  snap.exists() && Object.keys(snap.data() ?? {}).length > 0;

export async function readUserDoc(
  uid: string,
  retryMs: readonly number[] = DEFAULT_RETRY_MS,
): Promise<DocumentSnapshot> {
  let snap = await getDocFromServer(doc(db, "users", uid));
  for (const ms of retryMs) {
    if (hasContent(snap)) return snap; // 내용까지 온 답이면 끝 — 추가 비용 없음
    await sleep(ms);
    snap = await getDocFromServer(doc(db, "users", uid));
  }
  // 예산을 다 써도 내용이 없다 → 진짜 없는 것으로 본다(신규 사용자).
  // 호출부는 이걸 '확정된 없음'으로 단정하지 않는다(consent.ts readConsent 참고).
  return snap;
}
