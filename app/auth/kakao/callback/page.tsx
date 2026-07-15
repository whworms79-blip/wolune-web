"use client";

// 카카오 인가코드 콜백 — 코드를 서버(Netlify 함수)로 보내 커스텀 토큰을 받고 로그인 완료.
// 카카오 개발자 콘솔의 Redirect URI 와 정확히 같은 경로여야 한다: /auth/kakao/callback

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUid, finishKakaoLogin } from "../../../lib/firebase";
import { armCarryHandoff, disarmCarryHandoff } from "../../../lib/carryOver";
import { loadSajuInput } from "../../../lib/sajuInput";
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

      // 전환 시 이어붙이기(CarryOverDialog)가 화면을 떠맡는지 기다릴 준비.
      const handoff = armCarryHandoff();
      const r = await finishKakaoLogin(code);
      if (cancelled) {
        disarmCarryHandoff();
        return;
      }
      if (r === "failed") {
        disarmCarryHandoff();
        setMsg("연결에 실패했어요. 잠시 후 돌아갑니다…");
        window.setTimeout(() => router.replace("/my"), 1400);
        return;
      }
      setMsg("연결됐어요! 돌아갑니다…");

      if (r === "switchedToExisting") {
        // 옛 계정으로 전환 — carried/returned/conflict 면 이어붙이기가 새로고침/충돌모달로
        // 화면을 이끈다(마이로 안착). 그 경우엔 여기서 마이로만 돌려보내고 손을 뗀다.
        const tookOver = await handoff;
        if (cancelled) return;
        if (tookOver) {
          window.setTimeout(() => router.replace("/my"), 1000);
          return;
        }
        // 새로고침이 없다(양쪽 다 비었거나 실패) = 사실상 신규 → 아래 공통 마무리로.
      } else {
        disarmCarryHandoff(); // linked — 전환 아님. 대기 프라미스 정리.
      }

      // 공통 마무리 — ★ 사주를 읽기 전에 currentUser(uid) 확정을 명시적으로 기다린다.
      // 사주가 있으면 결과 화면으로(구글 로그인과 동작 일치), 없으면(신규) 마이로.
      // 결과로 갈 땐 파라미터 없이 이동 — 결과 페이지가 Firestore 에서 읽는다(개인정보 URL 노출 없음).
      await confirmUid();
      const saved = await loadSajuInput();
      if (cancelled) return;
      const dest = saved ? "/saju/result" : "/my";
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
