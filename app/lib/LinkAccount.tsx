"use client";

// 계정 연결 유도 — "가입은 감동 뒤에". 앱(link_account_prompt.dart)과 동일한 정책·문구.
//
// ★ 원칙 (어제 로그아웃 경고에서 세운 것과 동일)
//   · 겁주지 않는다. "사라져요" 같은 공포 소구 금지. **사실만** 말한다.
//   · "잃을까 봐 가입시키기"가 아니라 **"소중한 걸 지키게 돕기"**.
//   · "나중에"는 항상 있고, 눌러도 불이익 없다.
//
// ★ 타이밍 — 감동의 크기 순으로 힘을 싣는다
//   ① 첫 사주 결과 직후    → **약한** 인라인 카드. 아직 "지킬 게 생긴" 시점이 아니다.
//   ② 기록 7건~           → 중간 카드. 통찰이 열리면(=③) 뜨지 않는다(중복 유도 방지).
//   ③ **통찰 해제(10건)**  → **진짜 유도.** "나만의 것"이 처음 생기는 순간.
//   셋 다 익명일 때만. "나중에"로 닫으면 그 지점은 다시 조르지 않는다.

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

// 지점별 "나중에" 플래그 — 하나를 닫아도 다른 지점은 살아 있다.
const K_RESULT_DISMISSED = "wolune_link_prompt_result_dismissed";
const K_JOURNAL_DISMISSED = "wolune_link_prompt_journal_dismissed";
const K_INSIGHT_DISMISSED = "wolune_link_prompt_insight_dismissed";

// ② 저널 카드 임계값. 3건은 너무 일렀다(애착이 생기기 전).
// 7 = 일주일치 기록 — 습관이 붙기 시작하고 "내 것"이라는 감각이 생기는 지점.
// 통찰(10건)이 열리면 ②는 뜨지 않고 ③에 자리를 내준다.
export const JOURNAL_CARD_MIN_ENTRIES = 7;

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

/** ② 기록 카드를 띄울지. 통찰이 열렸으면 ③이 대신하므로 뜨지 않는다. */
export function shouldShowJournalCard(
  entryCount: number,
  insightUnlocked: boolean,
): boolean {
  return (
    isAnonymous() &&
    !insightUnlocked && // ③과 중복 유도 방지
    entryCount >= JOURNAL_CARD_MIN_ENTRIES &&
    !hasFlag(K_JOURNAL_DISMISSED)
  );
}

/** ③ 통찰 해제 카드를 띄울지 — 이번 설계의 핵심 지점. */
export function shouldShowInsightCard(insightUnlocked: boolean): boolean {
  return isAnonymous() && insightUnlocked && !hasFlag(K_INSIGHT_DISMISSED);
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
const SproutMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20v-8M12 12c0-3 2-5 5-5 0 3-2 5-5 5ZM12 14c0-2.5-1.7-4-4-4 0 2.5 1.7 4 4 4Z" />
  </svg>
);

/** 연결 버튼 두 개 + "나중에" — 세 카드가 공유한다. */
function LinkCtas({
  kakaoLabel,
  googleLabel,
  busy,
  onGoogle,
  onLater,
}: {
  kakaoLabel: string;
  googleLabel: string;
  busy: boolean;
  onGoogle: () => void;
  onLater: () => void;
}) {
  return (
    <div className="link-card__ctas">
      <KakaoButton label={kakaoLabel} disabled={busy} />
      <div className="link-card__actions">
        <button
          type="button"
          className="wl-btn wl-btn--primary"
          onClick={onGoogle}
          disabled={busy}
        >
          {busy ? "연결 중…" : googleLabel}
        </button>
        <button type="button" className="link-later" onClick={onLater} disabled={busy}>
          나중에
        </button>
      </div>
    </div>
  );
}

/**
 * ① 첫 사주 결과 직후 — **약한** 인라인 카드(모달 아님).
 *
 * 예전엔 모달이었고, 게다가 "뜨기만 해도" 플래그가 박혀 평생 한 번의 기회가 소진됐다.
 * 사주를 처음 본 순간은 아직 지킬 것이 쌓이기 전이다 — 여기선 조용히 알리기만 하고,
 * 힘은 통찰이 열리는 순간(③)에 싣는다.
 * 플래그는 **"나중에"를 실제로 눌렀을 때만** 박힌다.
 */
export function LinkResultCard() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSignedIn();
      if (cancelled) return;
      if (isAnonymous() && !hasFlag(K_RESULT_DISMISSED)) setShow(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  async function handleLink() {
    setBusy(true);
    const ok = await doLink();
    setBusy(false);
    if (ok) setShow(false);
  }
  function later() {
    setFlag(K_RESULT_DISMISSED); // 실제로 닫았을 때만 기록한다
    setShow(false);
  }

  return (
    <section className="wl-card link-card" aria-label="계정 연결 안내">
      <div className="link-card__head">
        <span className="link-card__mark"><MoonMark /></span>
        <span className="wl-body-l">이 사주, 계정에 담아둘 수 있어요</span>
      </div>
      <p className="link-card__body">
        지금은 이 브라우저에만 있어요. 카카오나 구글 계정과 연결하면 기기를 바꿔도
        사주와 앞으로의 기록이 그대로 이어져요.
      </p>
      <LinkCtas
        kakaoLabel="카카오로 연결"
        googleLabel="구글로 연결"
        busy={busy}
        onGoogle={handleLink}
        onLater={later}
      />
    </section>
  );
}

/** ② 기록이 쌓였을 때(7건~, 통찰 전) — 기록 화면 인라인 카드. */
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
        <span className="wl-body-l">{days}일치 기록이 쌓였어요</span>
      </div>
      {/* 공포 소구 금지 — "사라져요"가 아니라 "이어져요"(사실) */}
      <p className="link-card__body">
        연결해두면 기기를 바꿔도 이 기록이 그대로 이어져요.
      </p>
      <LinkCtas
        kakaoLabel="카카오로 연결"
        googleLabel="구글로 연결"
        busy={busy}
        onGoogle={handleLink}
        onLater={later}
      />
    </section>
  );
}

/**
 * ③ 통찰이 처음 열린 순간 — **이번 설계의 핵심.**
 * 사용자가 "이건 나만의 것"이라고 처음 느끼는 유일한 타이밍.
 * 축하의 연장선처럼 통찰 카드 바로 아래 이어 붙인다(link-card--insight).
 * 겁주지 않는다 — "사라진다"가 아니라 **"계속 자란다"**(미래·성장).
 */
export function LinkInsightCard({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleLink() {
    setBusy(true);
    const ok = await doLink();
    setBusy(false);
    if (ok) onDone();
  }
  function later() {
    setFlag(K_INSIGHT_DISMISSED);
    onDone();
  }

  return (
    <section className="wl-card link-card link-card--insight" aria-label="계정 연결 안내">
      <div className="link-card__head">
        <span className="link-card__mark"><SproutMark /></span>
        {/* ⚠ 패턴 유무와 무관하게 **참인 문장**이어야 한다.
            예전엔 "당신만의 패턴이 열렸어요 / 10번의 기록이 만든, 다른 누구에게도 없는
            결이에요"라고 했는데, 정작 위 카드가 "아직 쏠린 결이 없어요"라고 말하는 경우가
            흔하다. 없는 결을 있다고 하면 그 순간 신뢰를 잃는다.
            대신 **10번의 기록** 자체는 언제나 사실이고, 오직 이 사람만 쌓을 수 있다. */}
        <span className="wl-body-l">이제 당신의 결이 보이기 시작해요</span>
      </div>
      <p className="link-card__body">
        10번의 기록은 당신만 쌓을 수 있어요.
        연결해두면 기기를 바꿔도 그대로 이어져요.
      </p>
      <LinkCtas
        kakaoLabel="카카오로 연결"
        googleLabel="구글로 연결"
        busy={busy}
        onGoogle={handleLink}
        onLater={later}
      />
    </section>
  );
}
