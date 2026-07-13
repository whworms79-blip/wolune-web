// "이 기기에서 로그인한 적이 있다"는 표시.
//
// 왜 필요한가:
//   로그아웃하면 새 익명 uid 로 갈아탄다(signOutToAnon). 그러면 웹이 그 사람을 **완전히
//   잊어버려서**, 다시 왔을 때 신규 사용자와 똑같은 화면(랜딩 → 생년월일 입력)이 뜬다.
//   기록은 Firestore 옛 uid 에 멀쩡히 살아 있는데, 되찾는 방법을 아무도 알려주지 않는다.
//   그래서 무심코 새 계정으로 다시 시작하고 "기록이 사라졌다"고 느낀다.
//
// ⚠️ **uid 를 저장하지 않는다.** 이메일·닉네임 같은 식별 가능한 값도 남기지 않는다.
//   uid 를 안다고 그 계정에 들어갈 수 있는 것도 아니고(인증이 필요하다), 기기를 함께 쓰는
//   사람에게 이전 사용자의 존재가 드러난다. 로그아웃했는데 계정 식별자가 남는 것도 모순이다.
//   여기 남기는 건 **불리언 하나와 로그인 수단 이름뿐**이다.
//
// 기록 시점은 **로그인에 성공했을 때**다(로그아웃할 때가 아니라).
// 앱(app/lib/data/returning.dart)과 키·동작을 맞춘다.

const SEEN_KEY = "wl_returning"; // 로그인한 적 있음
const PROVIDER_KEY = "wl_last_provider"; // 'kakao' | 'google'

export type Provider = "kakao" | "google";

/// 로그인 성공 시 호출. 어떤 버튼을 크게 보여줄지 결정하는 데만 쓴다.
export function markSignedIn(provider: Provider): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
    localStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    /* 사파리 프라이빗 등 저장 불가 — 안내를 못 띄울 뿐, 동작은 그대로다 */
  }
}

/// 이 기기에서 로그인한 적이 있는가 → 랜딩을 '다시 만나 반가워요'로 바꾼다.
export function hasSignedInBefore(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/// 마지막으로 쓴 로그인 수단('kakao' | 'google' | null).
export function lastProvider(): Provider | null {
  try {
    const v = localStorage.getItem(PROVIDER_KEY);
    return v === "kakao" || v === "google" ? v : null;
  } catch {
    return null;
  }
}
