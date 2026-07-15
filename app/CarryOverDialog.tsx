"use client";

// 로그인하면서 옛 계정으로 전환됐을 때 — 이어붙이고, 무슨 일이 있었는지 담백하게 알린다.
//
// 예전엔 토스트 한 줄("기존 구글 계정으로 로그인했어요")이 전부였고 홈은 빈 화면이었다.
// 사용자는 방금 입력한 사주가 증발한 줄 알았다. 실제로는 익명 uid 문서에 그대로 있었다.
//
// 로그인 진입점이 여러 곳이라(마이·랜딩·사주 입력·카카오 콜백) 각 화면에 붙이면 언젠가
// 한 곳을 빠뜨린다 → 루트 레이아웃에 하나만 두고, 전환 이벤트를 받아 처리한다.
//
// 톤: 겁주지 않고 사실만. 데이터를 가져왔으면 가져왔다고, 예전 것으로 돌아왔으면 돌아왔다고.
import { useCallback, useEffect, useState } from "react";
import {
  CARRY_EVENT,
  applyCarryOver,
  consumePending,
  replaceSajuWithAnon,
  settleCarryHandoff,
  type AnonSnapshot,
  type CarryOutcome,
} from "./lib/carryOver";
import "./carryover.css";

/// 안내는 새로고침 **뒤에** 떠야 한다.
/// 화면이 익명 계정의 데이터를 메모리에 들고 있으므로, 이어붙인 뒤엔 다시 그려야 새 계정의
/// 내용이 보인다(안 그러면 "담았어요"라고 해놓고 빈 화면이다). 그래서 안내를 실어 보낸다.
const NOTICE_KEY = "wl_carry_notice";

export function CarryOverDialog() {
  const [notice, setNotice] = useState<string>("");
  const [conflict, setConflict] = useState<AnonSnapshot | null>(null);
  const [conflictMoods, setConflictMoods] = useState(0);
  const [busy, setBusy] = useState(false);

  // 안내를 남기고 화면을 다시 그린다 → 새 계정의 데이터가 보인다.
  const reloadWith = useCallback((msg: string) => {
    try {
      sessionStorage.setItem(NOTICE_KEY, msg);
    } catch {
      /* 저장 못 해도 새로고침은 한다 — 데이터가 보이는 게 우선 */
    }
    window.location.reload();
  }, []);

  // 새로고침 직후 — 앞 페이지가 남긴 안내를 띄운다.
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem(NOTICE_KEY);
      if (msg) {
        sessionStorage.removeItem(NOTICE_KEY);
        setNotice(msg);
        const t = window.setTimeout(() => setNotice(""), 5200);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* 프라이빗 모드 등 */
    }
  }, []);

  useEffect(() => {
    async function onSwitched() {
      const snap = consumePending();
      if (!snap) {
        settleCarryHandoff(false); // 옮길 게 없다 → 화면을 안 떠맡는다(호출부가 폴백)
        return;
      }

      let out: CarryOutcome;
      try {
        out = await applyCarryOver(snap);
      } catch {
        // 이어붙이기 실패 — 로그인 자체는 유효. 화면은 호출부가 결과/신규로 마무리한다.
        settleCarryHandoff(false);
        return;
      }

      if (out.kind === "conflict") {
        setConflictMoods(out.moods);
        setConflict(out.snapshot);
        settleCarryHandoff(true); // 충돌 모달로 화면을 떠맡았다(고른 뒤 새로고침→결과)
        return; // 사용자가 고르기 전엔 아무것도 쓰지 않았다
      }
      if (out.kind === "carried") {
        settleCarryHandoff(true); // 새로고침이 결과까지 이끈다
        reloadWith(carriedText(out.saju, out.moods));
      } else if (out.kind === "returned") {
        settleCarryHandoff(true);
        reloadWith("예전 기록으로 돌아왔어요.");
      } else {
        // kind === "none" — 양쪽 다 비었다 = 사실상 신규. 새로고침이 없으니
        // 호출부가 결과(없음)→신규 안내로 마무리하도록 넘긴다(빈 폼에 멈추지 않게).
        settleCarryHandoff(false);
      }
    }

    window.addEventListener(CARRY_EVENT, onSwitched);
    return () => window.removeEventListener(CARRY_EVENT, onSwitched);
  }, [reloadWith]);

  function keepOld() {
    setBusy(true);
    setConflict(null);
    reloadWith(
      conflictMoods > 0
        ? `예전 사주로 돌아왔어요. 방금 남기신 기록 ${conflictMoods}건은 함께 담았어요.`
        : "예전 사주로 돌아왔어요.",
    );
  }

  async function useNew() {
    if (!conflict) return;
    setBusy(true);
    try {
      await replaceSajuWithAnon(conflict);
    } catch {
      /* 실패해도 예전 사주가 그대로 남는다 — 잃는 건 없다 */
      setBusy(false);
      setConflict(null);
      reloadWith("바꾸지 못했어요. 예전 사주가 그대로 있어요.");
      return;
    }
    setConflict(null);
    reloadWith("방금 입력하신 사주로 바꿨어요.");
  }

  return (
    <>
      {notice && (
        <div className="carry-toast" role="status">
          {notice}
        </div>
      )}

      {conflict && (
        <div
          className="confirm-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="carry-title"
        >
          <div className="confirm-modal__backdrop" />
          <div className="confirm-modal__card">
            <h2 className="wl-title-m confirm-modal__title" id="carry-title">
              예전 사주로 돌아왔어요
            </h2>
            <p className="wl-body-s confirm-modal__body">
              이 계정엔 예전에 저장하신 사주가 있어요. 방금 입력하신 것은 어떻게 할까요?
            </p>
            {conflictMoods > 0 && (
              <p className="wl-body-s wl-text-tertiary confirm-modal__note">
                방금 남기신 기록 {conflictMoods}건은 어느 쪽을 고르셔도 함께 담겨요.
              </p>
            )}
            <div className="confirm-modal__actions">
              <button
                type="button"
                className="wl-btn wl-btn--ghost"
                onClick={useNew}
                disabled={busy}
              >
                방금 것으로 교체
              </button>
              <button type="button" className="wl-btn" onClick={keepOld} disabled={busy}>
                예전 것 유지
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function carriedText(saju: boolean, moods: number): string {
  if (saju && moods > 0) {
    return `방금 입력하신 사주와 기록 ${moods}건을 이 계정에 담았어요.`;
  }
  if (saju) return "방금 입력하신 사주를 이 계정에 담았어요.";
  return `방금 남기신 기록 ${moods}건을 이 계정에 담았어요.`;
}
