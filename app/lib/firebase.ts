// Firebase 초기화 + 익명 로그인.
// 여기 값들은 공개 클라이언트 키다(보안규칙으로 본인 데이터만 접근). 브라우저에서만 동작.
// 앱(Flutter)과 동일한 프로젝트(wolune-d2268)·동일한 Firestore 스키마(users/{uid}).
// 옛 localStorage → 클라우드 자동이전은 제거함(출시 전이라 보호할 레거시 데이터가 없고,
// 브라우저에 남은 옛 값이 새 익명 계정으로 딸려 들어가 혼란을 줬다).

import { getApp, getApps, initializeApp } from "firebase/app";
import { markSignedIn } from "./returning";
import { announceSwitched, captureAnon, stashPending } from "./carryOver";
import { saveLinkedProvider } from "./linkedProvider";
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4h68ksYoQS-uU4hwC-tkoZ9SAen9jbeQ",
  authDomain: "wolune-d2268.firebaseapp.com",
  projectId: "wolune-d2268",
  storageBucket: "wolune-d2268.firebasestorage.app",
  messagingSenderId: "128299763726",
  appId: "1:128299763726:web:9695363c735cba2efe545f",
  measurementId: "G-WHTPMLFJS8",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
// ⚠️ ignoreUndefinedProperties 는 선택이 아니라 **필수**다.
//
// SajuInput 의 time·city·is_leap_month, MoodEntry 의 fortune 은 전부 옵셔널이라
// 값이 없으면 `undefined` 가 된다. Firestore 는 기본 설정에서 undefined 를 만나면
// setDoc 자체를 throw 한다 — "Unsupported field value: undefined".
//
// 그래서 **양력 사용자(대다수)는 사주가 아예 저장되지 않고 있었다.**
// is_leap_month 가 undefined → setDoc throw → 저장 함수의 catch 가 조용히 삼킴
// → 홈·저널·마이가 "사주 없음"으로 보이고 크로스 디바이스 동기화도 되지 않았다.
// (localStorage 시절엔 JSON.stringify 가 undefined 키를 알아서 버려서 안 드러났다.)
//
// 옵셔널 필드를 "없음"으로 두는 건 정상적인 표현이므로, 저장 계층에서 undefined 를
// 조용히 빼도록 한다. 앱(Dart)은 null 을 쓰므로 이 문제가 없다(웹 전용).
let _db;
try {
  _db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  // 이미 초기화됐다면(핫리로드 등) 기존 인스턴스를 그대로 쓴다.
  _db = getFirestore(app);
}
export const db = _db;

// ⚠ 이 캐시는 "지금 로그인한 uid"다 — 로그인/전환/로그아웃으로 uid가 바뀌면 **반드시** 갱신해야 한다.
//
// 예전엔 첫 익명 로그인 uid 를 프라미스에 담아 고정하고, 갱신은 signOutToAnon 한 곳뿐이었다.
// 그래서 구글/카카오 로그인으로 uid 가 익명 A → 계정 B 로 바뀌어도 이 캐시는 A 였다.
// → 로그인 **후** 저장한 사주·무드·동의가 전부 익명 A(고아)로 새고, 마이·궁합은 계정 B 의
//   옛 값을 읽는 정합성 붕괴가 났다(2026-07-15 진단·수정).
//
// 이제 두 겹으로 막는다:
//   1) onAuthStateChanged 로 **모든** uid 변화를 자동 반영(로그인 경로가 몇 개든 하나도 안 빠진다)
//   2) 각 로그인 함수가 전환 직후 refreshSession() 을 직접 호출(리스너가 마이크로태스크로 늦게
//      도는 레이스에서, 로그인 직후 첫 저장이 옛 uid 로 새지 않도록)
let signInPromise: Promise<string> | null = null;

// uid 가 바뀐 직후(또는 로그아웃 후) 세션 캐시를 지금 계정으로 맞춘다.
function refreshSession(): void {
  const u = auth.currentUser;
  signInPromise = u ? Promise.resolve(u.uid) : null;
}

// ★ 진실의 원천은 auth 상태다. 로그인/전환/로그아웃 무엇이든 여기서 캐시를 갱신 → 놓치는 경로가 없다.
onAuthStateChanged(auth, (u) => {
  signInPromise = u ? Promise.resolve(u.uid) : null;
});

// 익명 로그인 보장. 아직 로그인 이력이 없을 때만 익명 로그인을 띄운다.
// (한 번 정해진 뒤엔 위 리스너가 uid 변화를 반영하므로, 여기 캐시는 항상 '지금 계정'이다.)
export function ensureSignedIn(): Promise<string> {
  if (!signInPromise) {
    signInPromise = (async () => {
      // 이전 방문의 익명 계정 복원을 기다린다(중복 계정 생성 방지).
      await auth.authStateReady();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      return auth.currentUser!.uid;
    })();
  }
  return signInPromise;
}

// ── 구글 로그인(계정 연결) — 앱과 동일 스키마/정책 ──
export type GoogleLinkResult =
  | "linked" // 익명 계정에 그대로 연결(데이터 유지)
  | "switchedToExisting" // 이미 쓰인 구글 계정 → 그 계정으로 전환
  | "canceled"
  | "failed";

export function isAnonymous(): boolean {
  return auth.currentUser?.isAnonymous ?? true;
}
export function currentEmail(): string | null {
  return auth.currentUser?.email ?? null;
}
export function currentName(): string | null {
  return auth.currentUser?.displayName ?? null;
}
export function onAuthChange(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

// 구글 계정으로 연결. 익명이면 데이터를 유지한 채 link,
// 이미 다른 계정에 연결된 구글이면 그 계정으로 로그인(전환).
// 로그인 성공 시 "이 기기에서 로그인한 적 있음"을 남긴다(uid 는 저장하지 않는다).
export async function linkGoogle(): Promise<GoogleLinkResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await ensureSignedIn();
    const current = auth.currentUser;
    if (current && current.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
        refreshSession(); // 익명→구글 승격(uid 유지지만 상태가 바뀌었으니 캐시를 맞춘다)
        markSignedIn("google");
        void saveLinkedProvider("google");
        return "linked";
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (
          code === "auth/credential-already-in-use" ||
          code === "auth/email-already-in-use"
        ) {
          // ★ 여기서 uid 가 바뀐다(익명 → 옛 계정). 바뀌기 **전에** 익명 데이터를 읽어둔다 —
          //   전환 후엔 보안 규칙상 익명 문서에 손댈 수 없다. (lib/carryOver.ts)
          stashPending(await captureAnon());

          const cred = GoogleAuthProvider.credentialFromError(
            e as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
          );
          if (cred) {
            await signInWithCredential(auth, cred);
          } else {
            await signInWithPopup(auth, provider);
          }
          refreshSession(); // ★ uid 가 익명 A → 계정 B 로 바뀌었다 — 캐시를 즉시 B 로(레이스 방지)
          markSignedIn("google");
          void saveLinkedProvider("google");
          announceSwitched(); // 화면(CarryOverDialog)이 이어붙이고 안내한다
          return "switchedToExisting";
        }
        throw e;
      }
    } else {
      await signInWithPopup(auth, provider);
      refreshSession(); // 비익명 상태에서 구글 로그인 — uid 가 바뀔 수 있으니 캐시를 맞춘다
      markSignedIn("google");
      void saveLinkedProvider("google");
      return "linked";
    }
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request"
    ) {
      return "canceled";
    }
    return "failed";
  }
}

// ── 카카오 로그인 ──
// Firebase가 카카오를 기본 지원하지 않아, 서버(Netlify 함수)가 카카오를 검증하고
// 커스텀 토큰을 발급한다. 첫 연결이면 서버가 지금 익명 uid를 그대로 승격 → 데이터 보존.
export const KAKAO_JS_KEY = "13cd958afcc9a06604ec8fcb69404d82"; // 공개 키(도메인 등록으로 보호)
const KAKAO_AUTH_FN = "/.netlify/functions/kakao-auth";
export const kakaoRedirectUri = () =>
  `${window.location.origin}/auth/kakao/callback`;

// 카카오 인가 페이지로 이동(리다이렉트 방식 — JS SDK v2는 암묵적 토큰 흐름이 없다)
export function startKakaoLogin(): void {
  const p = new URLSearchParams({
    client_id: KAKAO_JS_KEY,
    redirect_uri: kakaoRedirectUri(),
    response_type: "code",
  });
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${p.toString()}`;
}

// 콜백에서 받은 인가코드로 로그인 마무리
export async function finishKakaoLogin(code: string): Promise<GoogleLinkResult> {
  try {
    await ensureSignedIn();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return "failed";
    const res = await fetch(KAKAO_AUTH_FN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken, code, redirectUri: kakaoRedirectUri() }),
    });
    if (!res.ok) return "failed";
    const body = (await res.json()) as { customToken?: string; switched?: boolean };
    if (!body.customToken) return "failed";

    // ★ 서버가 "옛 계정으로 전환된다"고 알려준다 → 전환 **전에** 익명 데이터를 읽어둔다.
    if (body.switched) stashPending(await captureAnon());

    await signInWithCustomToken(auth, body.customToken);
    refreshSession(); // ★ 카카오 커스텀 토큰으로 uid 가 바뀌었다 — 캐시를 즉시 새 계정으로
    markSignedIn("kakao");
    void saveLinkedProvider("kakao");
    if (body.switched) announceSwitched();
    return body.switched ? "switchedToExisting" : "linked";
  } catch {
    return "failed";
  }
}

// 로그아웃 → 웹이 계속 쓰이도록 즉시 익명으로 되돌린다.
// **Firestore 의 옛 데이터는 지우지 않는다** — 같은 계정으로 다시 로그인하면 그대로 돌아온다
// (카카오는 kakaoUsers 매핑, 구글은 같은 uid).
//
// ⚠️ wl_returning 플래그는 **일부러 지우지 않는다.** 그게 요점이다 — 다시 왔을 때
// "다시 만나 반가워요"로 맞이하려면 이 기기가 그를 기억해야 한다(returning.ts 참고).
export async function signOutToAnon(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    /* 무시 */
  }
  signInPromise = null; // 다음 ensureSignedIn이 새 익명 로그인
  await ensureSignedIn();
}
