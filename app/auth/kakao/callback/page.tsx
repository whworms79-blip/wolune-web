"use client";

// 카카오 인가코드 콜백 — 코드를 서버(Netlify 함수)로 보내 커스텀 토큰을 받고 로그인 완료.
// 카카오 개발자 콘솔의 Redirect URI 와 정확히 같은 경로여야 한다: /auth/kakao/callback

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUid, finishKakaoLogin, isAnonymous } from "../../../lib/firebase";
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

      // ★ 인가 코드는 **일회용**이다. 이 화면이 다시 열리면(새로고침·뒤로가기) 이미 쓴 코드로
      //   또 교환을 시도하고, 카카오가 거부해 401 이 난다. 그러면 **이미 로그인됐는데도**
      //   "연결에 실패했어요" 가 뜨고 마이로 튕긴다(2026-09-05 라이브 콘솔에서 관측).
      //   → 읽는 즉시 주소에서 지운다. 뒤로 와도 code 가 없으니 재시도 자체가 일어나지 않는다.
      //   (덤: 인가 코드가 주소창·브라우저 기록에 남지 않는다)
      if (code || err) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      if (err || !code) {
        // 코드가 없다 — 취소했거나, 이미 처리하고 주소에서 지운 뒤 새로고침한 것이다.
        // 후자라면 **이미 로그인돼 있다.** "취소됐어요" 는 그 사람에게 틀린 말이다.
        await confirmUid();
        const done = !err && !isAnonymous();
        setMsg(
          done ? "이미 연결돼 있어요. 돌아갑니다…" : "연결이 취소됐어요. 잠시 후 돌아갑니다…",
        );
        window.setTimeout(() => router.replace(done ? "/home" : "/my"), 1200);
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
