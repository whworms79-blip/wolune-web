"use client";

// 카카오 인가코드 콜백 — 코드를 서버(Netlify 함수)로 보내 커스텀 토큰을 받고 로그인 완료.
// 카카오 개발자 콘솔의 Redirect URI 와 정확히 같은 경로여야 한다: /auth/kakao/callback

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUid, finishKakaoLogin } from "../../../lib/firebase";
import { chartQuery, loadSajuInput } from "../../../lib/sajuInput";
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
      if (r === "failed") {
        setMsg("연결에 실패했어요. 잠시 후 돌아갑니다…");
        window.setTimeout(() => router.replace("/my"), 1400);
        return;
      }
      setMsg("연결됐어요! 돌아갑니다…");

      // 옛 계정으로 전환됐다면 — 이어붙이기(CarryOverDialog)가 순서의 주인이다.
      // 그쪽이 병합/충돌을 처리하고 화면을 새로 그린다 → 여기서 결과로 먼저 보내면 꼬인다.
      // 마이로만 돌려보내고, 결과로 데려가는 건 이어붙이기 뒤 새로고침에 맡긴다.
      if (r === "switchedToExisting") {
        window.setTimeout(() => router.replace("/my"), 1000);
        return;
      }

      // linked — ★ 저장된 사주를 읽기 전에 currentUser(uid) 확정을 명시적으로 기다린다.
      // 사주가 있으면 결과 화면으로(구글 로그인과 동작 일치), 없으면(신규) 마이로.
      await confirmUid();
      const saved = await loadSajuInput();
      if (cancelled) return;
      const dest = saved
        ? `/saju/result?${chartQuery(saved).toString()}`
        : "/my";
      window.setTimeout(() => router.replace(dest), 1000);
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
