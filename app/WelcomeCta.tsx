"use client";

// 랜딩 CTA — 첫 방문자와 **돌아온 사용자**에게 다른 길을 낸다.
//
// 로그아웃하면 새 익명 uid 가 되어 이 랜딩으로 떨어진다. 그대로 두면 신규 사용자와 똑같은
// 화면이라, 무심코 "내 사주 보기 → 생년월일 입력"으로 가서 **새 계정에 새 사주**를 만든다.
// 옛 기록은 Firestore 에 멀쩡히 살아 있는데 화면에서 사라져 "없어졌다"고 느낀다.
//
// 그래서 돌아온 사용자에겐 **로그인이 기본 경로**, '새로 시작하기'는 작은 탈출구로 뒤집는다.
// 랜딩 자체는 서버 컴포넌트(SEO)로 남기고, localStorage 를 읽어야 하는 이 부분만 클라이언트다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasSignedInBefore, lastProvider, type Provider } from "./lib/returning";
import { linkGoogle } from "./lib/firebase";
import { chartQuery, loadSajuInput } from "./lib/sajuInput";
import { KakaoButton } from "./lib/LinkAccount";

export function WelcomeCta() {
  const router = useRouter();
  const [returning, setReturning] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [error, setError] = useState("");

  // 서버 렌더 결과와 어긋나지 않도록, 마운트 후에 읽는다.
  useEffect(() => {
    setReturning(hasSignedInBefore());
    setProvider(lastProvider());
  }, []);

  // 로그인 → 옛 계정으로 복귀. 사주가 있으면 결과로 바로 보낸다(돌아온 걸 즉시 보여준다).
  async function signInGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await linkGoogle();
    if (res === "canceled") {
      setBusy(false);
      return;
    }
    if (res === "failed") {
      setBusy(false);
      setError("로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const saved = await loadSajuInput();
    router.replace(saved ? `/saju/result?${chartQuery(saved).toString()}` : "/saju");
  }

  if (!returning) {
    // 첫 방문 — 지금까지의 화면 그대로.
    // (서버 렌더 시점에도 이쪽이 나오므로 SEO 문구가 그대로 HTML 에 남는다.)
    return (
      <>
        <p className="tagline">달빛처럼, 곁에서 비춰주는</p>
        <p className="tagline-en">Your gentle guide through life&rsquo;s tides</p>

        <p className="hero__intro">
          운명을 점치지 않습니다. 어려울 때 곁에서 조용히 길을 비춰주는 동행. 달이 어둠을
          몰아내지 않고 은은히 밝히듯, <strong>Wolune</strong>은 단정하지 않고 함께
          들여다봅니다.
        </p>

        <Link className="cta" href="/saju">
          내 사주 보기
          <span className="cta__arrow" aria-hidden="true">
            →
          </span>
        </Link>
        <p className="footnote">생년월일만 있으면 시작할 수 있어요</p>
      </>
    );
  }

  // KakaoButton 은 내부에서 startKakaoLogin() 을 부른다(카카오 인증 페이지로 이동 →
  // /auth/kakao/callback 이 finishKakaoLogin 으로 마무리). 여기선 렌더만 한다.
  const kakao = <KakaoButton key="kakao" disabled={busy} label="카카오로 계속하기" />;
  const google = (
    <button
      key="google"
      type="button"
      className="cta welcome-cta__google"
      onClick={signInGoogle}
      disabled={busy}
    >
      구글로 계속하기
    </button>
  );
  // 마지막에 쓴 방법을 위로 — 어떤 버튼을 크게 보여줄지에만 쓴다(식별 정보 아님).
  const order = provider === "google" ? [google, kakao] : [kakao, google];

  return (
    <div className="welcome-cta">
      {/* 돌아온 사용자 — "당신을 기억한다"는 말이 먼저다. */}
      <p className="tagline">다시 만나 반가워요</p>
      <p className="hero__intro welcome-cta__intro">
        로그인하면 사주와 기록이 그대로 돌아와요.
      </p>

      {order}
      {error && (
        <p className="wl-body-s welcome-cta__error" role="alert">
          {error}
        </p>
      )}

      {/* 탈출구 — 눈에 띄지 않게. 여기가 곧 '새 계정으로 다시 시작'하는 길이다. */}
      <button
        type="button"
        className="welcome-cta__fresh"
        onClick={() => setConfirmFresh(true)}
        disabled={busy}
      >
        처음이신가요?&nbsp; 새로 시작하기
      </button>

      {confirmFresh && (
        <div
          className="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fresh-title"
        >
          <div
            className="confirm-modal__backdrop"
            onClick={() => setConfirmFresh(false)}
          />
          <div className="confirm-modal__card">
            <h2 className="wl-title-m confirm-modal__title" id="fresh-title">
              새로 시작할까요?
            </h2>
            <p className="wl-body-s confirm-modal__body">
              기존 기록과는 별개로 시작해요. 나중에 로그인하면 예전 기록을 다시 볼 수 있어요.
            </p>
            <div className="confirm-modal__actions">
              <button
                type="button"
                className="wl-btn wl-btn--ghost"
                onClick={() => setConfirmFresh(false)}
              >
                취소
              </button>
              <button type="button" className="wl-btn" onClick={() => router.push("/saju")}>
                새로 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
