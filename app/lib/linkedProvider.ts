// 계정 연결 수단을 users/{uid} 에 남긴다 — 익명/연결 비율을 Firestore 만으로 셀 수 있게.
//
// ⚠️ 개인정보: **provider 이름만** 남긴다('google' | 'kakao').
//    이메일·닉네임·uid 같은 식별 가능한 값은 절대 넣지 않는다.
//    ("이 계정이 어떤 수단으로 연결됐는가"는 그 문서의 주인만 읽을 수 있고,
//     보안 규칙상 본인 외에는 접근할 수 없다.)
//
// 왜 필요한가:
//    지금까지 users/{uid} 에는 sajuInput·consent·moods 만 있어서, Firestore 만 봐서는
//    이 사람이 익명인지 연결했는지 알 수 없었다(Firebase Auth 콘솔을 따로 봐야 했다).
//    "익명 사용자가 몇 %인가"는 계정 연결 유도를 개선하려면 반드시 필요한 숫자다.
//
// 앱(app/lib/data/linked_provider.dart)과 필드명·값을 맞춘다.
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Provider } from "./returning";

export async function saveLinkedProvider(provider: Provider): Promise<void> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(db, "users", uid), { linkedProvider: provider }, { merge: true });
  } catch {
    /* 통계용이라 실패해도 로그인은 유효하다 — 막지 않는다 */
  }
}
