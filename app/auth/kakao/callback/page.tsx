"use client";

// 카카오 인가코드 콜백 — 코드를 서버(Netlify 함수)로 보내 커스텀 토큰을 받고 로그인 완료.
// 카카오 개발자 콘솔의 Redirect URI 와 정확히 같은 경로여야 한다: /auth/kakao/callback

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { finishKakaoLogin } from "../../../lib/firebase";
import "./callback.css";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("카카오 계정을 연결하는 중…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const err = params.get("error");

      if (err || !code) {
        setMsg("연결이 취소됐어요. 잠시 후 돌아갑니다…");
        window.setTimeout(() => router.replace("/my"), 1400);
        return;
      }

      const r = await finishKakaoLogin(code);
      if (cancelled) return;
      setMsg(
        r === "failed"
          ? "연결에 실패했어요. 잠시 후 돌아갑니다…"
          : "연결됐어요! 돌아갑니다…",
      );
      window.setTimeout(() => router.replace("/my"), 1000);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="screen">
      <div className="kakao-cb">
        <span className="kakao-cb__ring" aria-hidden="true" />
        <p className="wl-body wl-text-secondary">{msg}</p>
      </div>
    </main>
  );
}
