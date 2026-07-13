// Firebase 초기화 + 익명 로그인.
// 여기 값들은 공개 클라이언트 키다(보안규칙으로 본인 데이터만 접근). 브라우저에서만 동작.
// 앱(Flutter)과 동일한 프로젝트(wolune-d2268)·동일한 Firestore 스키마(users/{uid}).
// 옛 localStorage → 클라우드 자동이전은 제거함(출시 전이라 보호할 레거시 데이터가 없고,
// 브라우저에 남은 옛 값이 새 익명 계정으로 딸려 들어가 혼란을 줬다).

import { getApp, getApps, initializeApp } from "firebase/app";
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
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);

let signInPromise: Promise<string> | null = null;

// 익명 로그인 보장. 한 세션에서 1번만 실행되도록 프라미스를 캐시한다.
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
export async function linkGoogle(): Promise<GoogleLinkResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await ensureSignedIn();
    const current = auth.currentUser;
    if (current && current.isAnonymous) {
      try {
        await linkWithPopup(current, provider);
        return "linked";
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (
          code === "auth/credential-already-in-use" ||
          code === "auth/email-already-in-use"
        ) {
          const cred = GoogleAuthProvider.credentialFromError(
            e as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
          );
          if (cred) {
            await signInWithCredential(auth, cred);
          } else {
            await signInWithPopup(auth, provider);
          }
          return "switchedToExisting";
        }
        throw e;
      }
    } else {
      await signInWithPopup(auth, provider);
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
    await signInWithCustomToken(auth, body.customToken);
    return body.switched ? "switchedToExisting" : "linked";
  } catch {
    return "failed";
  }
}

// 로그아웃 → 앱이 계속 쓰이도록 즉시 익명으로 되돌린다.
// (연결된 데이터는 구글 계정에 안전히 남아, 다시 로그인하면 복구됨)
export async function signOutToAnon(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    /* 무시 */
  }
  signInPromise = null; // 다음 ensureSignedIn이 새 익명 로그인
  await ensureSignedIn();
}
