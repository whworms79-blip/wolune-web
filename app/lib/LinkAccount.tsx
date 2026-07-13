"use client";

// 계정 연결(구글) 유도 — "가입은 감동 뒤에". 앱(link_account_prompt.dart)과 동일한 정책.
// ① 첫 사주 결과 직후 → 모달 1회
// ② 무드 기록이 쌓였을 때 → 기록 화면 인라인 카드
// 둘 다 익명일 때만, "나중에"로 닫으면 다시 조르지 않는다.

import { useEffect, useState } from "react";
import { ensureSignedIn, isAnonymous, linkGoogle, startKakaoLogin } from "./firebase";

/** 카카오 버튼(브랜드 컬러). 한국 사용자 1순위라 위에 둔다. */
export function KakaoButton({
  label = "카카오로 계속하기",
  disabled,
}: {
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="kakao-btn"
      onClick={() => startKakaoLogin()}
      disabled={disabled}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="kakao-btn__mark">
        <path
          fill="currentColor"
          d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.5 1.7 4.7 4.2 6l-1 3.7c-.1.3.3.6.6.4l4.4-2.9c.3 0 .7.1 1 .1 5.1 0 9.2-3.2 9.2-7.3S17.1 3 12 3z"
        />
      </svg>
      {label}
    </button>
  );
}

const K_RESULT_SHOWN = "wolune_link_prompt_result_shown";
const K_JOURNAL_DISMISSED = "wolune_link_prompt_journal_dismissed";

function hasFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function setFlag(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* 프라이빗 모드 등 — 무시 */
  }
}

// 연결 실행. 연결/전환됐으면 true.
async function doLink(): Promise<boolean> {
  const r = await linkGoogle();
  return r === "linked" || r === "switchedToExisting";
}

/** 기록 화면 카드를 띄울지(익명 + 3일 이상 + 안 닫았음). auth 준비 후 호출할 것. */
export function shouldShowJournalCard(entryCount: number): boolean {
  return isAnonymous() && entryCount >= 3 && !hasFlag(K_JOURNAL_DISMISSED);
}

const MoonMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);
const CloudMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 18 18Z" />
  </svg>
);

/** ① 첫 사주 결과 직후 — 모달(평생 1회, 익명일 때만). 결과를 음미할 시간을 준 뒤 뜬다. */
export function LinkResultPrompt() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    (async () => {
      await ensureSignedIn();
      if (cancelled || !isAnonymous() || hasFlag(K_RESULT_SHOWN)) return;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setFlag(K_RESULT_SHOWN); // 한 번만 조른다
        setOpen(true);
      }, 1400);
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  async function handleLink() {
    setBusy(true);
    const ok = await doLink();
    setBusy(false);
    if (ok) setOpen(false);
  }

  return (
    <div className="link-overlay" role="dialog" aria-modal="true" aria-labelledby="link-title">
      <div className="link-sheet">
        <span className="link-sheet__mark"><MoonMark /></span>
        <h2 className="wl-title-m" id="link-title">이 사주, 잃지 않게 저장할까요?</h2>
        <p className="link-sheet__body">
          지금은 이 브라우저에만 담겨 있어요. 카카오나 구글 계정과 연결하면 기기를 바꾸거나
          브라우저가 달라져도 사주와 기록이 그대로 남아요.
        </p>
        <div className="link-sheet__ctas">
          <KakaoButton disabled={busy} />
          <button
            type="button"
            className="wl-btn wl-btn--primary"
            onClick={handleLink}
            disabled={busy}
          >
            {busy ? "연결 중…" : "구글로 계속하기"}
          </button>
        </div>
        <button
          type="button"
          className="link-later"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          나중에
        </button>
      </div>
    </div>
  );
}

/** ② 기록이 쌓였을 때 — 기록 화면 인라인 카드. */
export function LinkAccountCard({
  days,
  onDone,
}: {
  days: number;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleLink() {
    setBusy(true);
    const ok = await doLink();
    setBusy(false);
    if (ok) onDone();
  }
  function later() {
    setFlag(K_JOURNAL_DISMISSED);
    onDone();
  }

  return (
    <section className="wl-card link-card" aria-label="계정 연결 안내">
      <div className="link-card__head">
        <span className="link-card__mark"><CloudMark /></span>
        <span className="wl-body-l">기록이 {days}일 쌓였어요</span>
      </div>
      <p className="link-card__body">
        지금 연결하지 않으면 브라우저를 비우거나 기기를 바꿀 때 이 기록이 사라져요.
        카카오나 구글 계정과 연결해 안전하게 남겨두세요.
      </p>
      <div className="link-card__ctas">
        <KakaoButton label="카카오로 연결" disabled={busy} />
        <div className="link-card__actions">
          <button
            type="button"
            className="wl-btn wl-btn--primary"
            onClick={handleLink}
            disabled={busy}
          >
            {busy ? "연결 중…" : "구글로 연결"}
          </button>
          <button type="button" className="link-later" onClick={later} disabled={busy}>
            나중에
          </button>
        </div>
      </div>
    </section>
  );
}
