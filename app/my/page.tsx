"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadSajuInput,
  clearSajuInput,
  chartUrl,
  type SajuInput,
} from "../lib/sajuInput";
import { clearMoodJournal } from "../lib/moodJournal";
import {
  currentEmail,
  currentName,
  isAnonymous,
  linkGoogle,
  onAuthChange,
  signOutToAnon,
} from "../lib/firebase";
import { KakaoButton } from "../lib/LinkAccount";
import "./my.css";

const APP_VERSION = "0.1.0";

// 엔진이 없을 때도 정확도 섹션이 뜨도록 한 폴백(엔진 calc_meta.limitations와 동일 취지).
const FALLBACK_LIMITATIONS = [
  "균시차 근사식(실측 최대 ~1.4분·12월, RMS ~38초), 정밀 천체력 미적용",
  "시간대/DST·한국 표준자오선 이력 미반영",
  "자시(子時) 경계 룰셋 미적용",
  "오행 분포는 지장간 미포함(천간·지지 8글자)",
];

// 우리가 정확히 계산하는 것(브랜드 차별점) — 정적.
const STRENGTHS = [
  "진태양시 보정 (경도차 + 균시차)",
  "입춘 기준 연주(年柱) 전환",
  "절기 기준 월주(月柱) 전환",
  "자시(子時) 경계 — 일관된 야자시 규칙",
  "음력 · 윤달 정확 변환",
];

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
const CheckCircle = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);
const InfoIcon = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>);
const Bell = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10.5 20a2 2 0 0 0 3 0" /></svg>);
const Trash = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>);
const Shield = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /></svg>);
const Pencil = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M4 20h4L18 10l-4-4L4 16v4Z" /><path d="M13.5 6.5l4 4" /></svg>);

/* ---------- 표시용 헬퍼 ---------- */
const EL_KO: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

function fmtBirth(date: string): string {
  const m = date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}년 ${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일` : date;
}
// "23:05" → "오후 11:05"
function fmtTime(hhmm?: string): string {
  if (!hhmm) return "모름";
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return hhmm;
  const h = parseInt(m[1], 10);
  const ap = h < 12 ? "오전" : "오후";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${ap} ${h12}:${m[2]}`;
}

interface Chart {
  character?: { name_ko: string; name_en: string; tagline?: string; day_master_element?: string };
  calc_meta?: { limitations?: string[]; engine_version?: string };
}

export default function MyPage() {
  const [input, setInput] = useState<SajuInput | null>(null);
  const [chart, setChart] = useState<Chart | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState("");
  // 로그인 상태
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<{ name: string | null; email: string | null }>({
    name: null,
    email: null,
  });
  const [linking, setLinking] = useState(false);

  // 인증 상태 변화 구독(로그인/로그아웃 시 UI 갱신)
  useEffect(() => {
    return onAuthChange(() => {
      setSignedIn(!isAnonymous());
      setAccount({ name: currentName(), email: currentEmail() });
    });
  }, []);

  async function handleGoogle() {
    if (linking) return;
    setLinking(true);
    const r = await linkGoogle();
    setLinking(false);
    setSignedIn(!isAnonymous());
    setAccount({ name: currentName(), email: currentEmail() });
    if (r === "linked") {
      setToast("구글 계정과 연결됐어요. 이제 기기를 바꿔도 그대로예요.");
    } else if (r === "switchedToExisting") {
      setToast("기존 구글 계정으로 로그인했어요.");
    } else if (r === "failed") {
      setToast("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } else {
      return; // 취소는 조용히
    }
    window.setTimeout(() => setToast(""), 2600);
  }

  async function handleSignOut() {
    await signOutToAnon(); // 로그아웃 → 새 익명 계정(사주·기록 없음)
    setSignedIn(false);
    setAccount({ name: null, email: null });
    setToast("로그아웃했어요.");
    // 화면이 이전 계정의 사주를 메모리에 들고 있으므로 랜딩으로 완전히 리셋한다.
    // (안 그러면 로그아웃했는데도 이전 사주가 계속 보인다)
    window.setTimeout(() => {
      window.location.href = "/";
    }, 900);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let cancelled = false;

    (async () => {
      const saved = await loadSajuInput();
      if (cancelled) return;
      setInput(saved);
      setReady(true);
      if (!saved) {
        clearTimeout(timer);
        return;
      }
      fetch(chartUrl(saved), { cache: "no-store", signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((c: Chart | null) => { if (!cancelled) setChart(c); })
        .catch(() => { if (!cancelled) setChart(null); })
        .finally(() => clearTimeout(timer));
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  async function handleReset() {
    setInput(null);
    setChart(null);
    setConfirmOpen(false);
    setToast("내 데이터를 모두 초기화했어요");
    window.setTimeout(() => setToast(""), 2400);
    await Promise.all([clearSajuInput(), clearMoodJournal()]);
  }

  const character = chart?.character;
  const limitations =
    chart?.calc_meta?.limitations && chart.calc_meta.limitations.length > 0
      ? chart.calc_meta.limitations
      : FALLBACK_LIMITATIONS;
  const engineVer = chart?.calc_meta?.engine_version || "0.3.0";

  const avatarChar = character?.name_ko?.trim()?.charAt(0) || "나";
  const birthLine = input
    ? `${fmtBirth(input.date)}${input.calendar === "lunar" ? " (음력)" : ""} · ${input.city || "서울"}`
    : "";

  return (
    <main className="screen">
      <div className="screen__scroll">
        <header className="my-head">
          <h1 className="wl-title-l">마이</h1>
        </header>

        <div className="wl-card-list">
          {/* 프로필 + 캐릭터 요약 */}
          <section className="wl-card wl-card--gold">
            <div className="profile">
              <span className="profile__avatar" aria-hidden="true">{avatarChar}</span>
              <div className="profile__body">
                <span className="wl-title-m profile__name">
                  {character ? character.name_ko : input ? "내 사주" : "게스트"}
                </span>
                {character ? (
                  <span className="wl-caption profile__char">
                    {character.name_ko} · {character.name_en}
                  </span>
                ) : (
                  <span className="wl-body-s wl-text-secondary">
                    {input ? "캐릭터를 불러오는 중…" : "아직 사주 정보가 없어요"}
                  </span>
                )}
                {birthLine && <span className="wl-body-s wl-text-secondary">{birthLine}</span>}
              </div>
            </div>
          </section>

          {/* 내 사주 정보 */}
          {ready && (
            <section className="wl-card">
              <span className="wl-section-label">내 사주 정보</span>
              {input ? (
                <>
                  <div className="info-list" style={{ marginTop: 10 }}>
                    <div className="info-row">
                      <span className="info-row__key">생년월일</span>
                      <span className="info-row__val">
                        {fmtBirth(input.date)}{input.calendar === "lunar" ? " (음력)" : " (양력)"}
                        {input.calendar === "lunar" && input.is_leap_month ? " · 윤달" : ""}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-row__key">태어난 시간</span>
                      <span className="info-row__val">{fmtTime(input.time)}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-row__key">태어난 곳</span>
                      <span className="info-row__val">{input.city || "서울"}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-row__key">성별</span>
                      <span className="info-row__val">{input.gender === "male" ? "남성" : "여성"}</span>
                    </div>
                    {character?.day_master_element && (
                      <div className="info-row">
                        <span className="info-row__key">일간 오행</span>
                        <span className="info-row__val">{EL_KO[character.day_master_element] || character.day_master_element}</span>
                      </div>
                    )}
                  </div>
                  <Link className="wl-btn wl-btn--primary info-edit" href="/saju?edit=1">
                    <Pencil /> 수정하기
                  </Link>
                </>
              ) : (
                <div className="info-empty" style={{ marginTop: 10 }}>
                  <span className="wl-body-s info-empty__text">
                    생년월일을 한 번만 알려주시면, 여기서 내 사주와 캐릭터를 볼 수 있어요.
                  </span>
                  <Link className="wl-btn wl-btn--primary" href="/saju">
                    사주 입력하러 가기
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* 계산 정확도 · 한계 (차별점) */}
          <section className="wl-card">
            <span className="wl-section-label">계산 정확도</span>
            <p className="wl-body-s wl-text-secondary accuracy__intro" style={{ marginTop: 10 }}>
              Wolune는 정확하게 계산하되, 한계를 숨기지 않아요. 진태양시·입춘·절기·자시·윤달을
              바르게 반영하고, 균시차만 근사식(겨울 최대 ~1.4분 오차)을 씁니다.
            </p>

            <div className="accuracy__group accuracy__group--good">
              <span className="accuracy__group-label"><CheckCircle /> 정확히 계산해요</span>
              <ul className="accuracy__ul">
                {STRENGTHS.map((s) => (<li key={s}>{s}</li>))}
              </ul>
            </div>

            <div className="accuracy__group accuracy__group--limit">
              <span className="accuracy__group-label"><InfoIcon /> 숨기지 않는 한계</span>
              <ul className="accuracy__ul">
                {limitations.map((s) => (<li key={s}>{s}</li>))}
              </ul>
            </div>

            <p className="wl-caption accuracy__version">만세력 엔진 v{engineVer}</p>
          </section>

          {/* 계정 */}
          <div>
            <span className="wl-section-label section-label">계정</span>
            <section className="wl-card account-card">
              {signedIn ? (
                <div className="account-signed">
                  <span className="account-avatar" aria-hidden="true"><CheckCircle /></span>
                  <span className="account-info">
                    <span className="account-name">{account.name || account.email || "구글 계정"}</span>
                    {account.email && account.email !== account.name && (
                      <span className="account-email">{account.email}</span>
                    )}
                  </span>
                  <button type="button" className="account-signout" onClick={handleSignOut}>
                    로그아웃
                  </button>
                </div>
              ) : (
                <>
                  <span className="account-title">로그인하고 안전하게 보관하기</span>
                  <span className="account-desc">
                    카카오·구글 계정과 연결하면 기기를 바꾸거나 브라우저가 달라져도 사주와 기록이 그대로 남아요.
                  </span>
                  {/* 한국 사용자 1순위 — 카카오를 위에 */}
                  <div className="account-ctas">
                    <KakaoButton disabled={linking} />
                    <button
                      type="button"
                      className="google-btn"
                      onClick={handleGoogle}
                      disabled={linking}
                    >
                      {linking ? (
                        "연결 중…"
                      ) : (
                        <>
                          <span className="google-g" aria-hidden="true">G</span>
                          구글로 계속하기
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* 곧 만나요 */}
          <div>
            <span className="wl-section-label section-label">곧 만나요</span>
            <section className="wl-card settings">
              <div className="setting-row setting-row--soon">
                <span className="setting-row__icon" aria-hidden="true"><Bell /></span>
                <span className="setting-row__label">
                  <span className="setting-row__title">푸시 알림</span>
                  <span className="setting-row__desc">오늘의 감정 날씨를 살며시</span>
                </span>
                <span className="soon-badge">준비 중</span>
              </div>
            </section>
          </div>

          {/* 데이터 관리 */}
          <div>
            <span className="wl-section-label section-label">데이터 관리</span>
            <section className="wl-card">
              <button type="button" className="danger-btn" onClick={() => setConfirmOpen(true)}>
                <Trash /> 내 데이터 초기화
              </button>
              <p className="wl-caption data-note">
                이 기기에 저장된 사주 정보와 무드저널 기록을 모두 지워요. 되돌릴 수 없어요.
              </p>
            </section>
          </div>
        </div>

        {/* 앱 정보 */}
        <div className="app-info">
          <span className="app-info__mark" aria-hidden="true"><Moon /></span>
          <span className="wl-body app-info__promise">달빛처럼, 곁에서 비춰주는</span>
          <span className="wl-caption app-info__ver">Wolune v{APP_VERSION}</span>
        </div>

        <p className="wl-caption privacy-note">
          <Shield /> 내 데이터는 안전하게 클라우드에 보관되며, 언제든 초기화할 수 있어요.
        </p>
      </div>

      {/* 초기화 확인 모달 */}
      {confirmOpen && (
        <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="confirm-modal__backdrop" onClick={() => setConfirmOpen(false)} />
          <div className="confirm-modal__card">
            <h2 className="wl-title-m confirm-modal__title" id="confirm-title">내 데이터를 초기화할까요?</h2>
            <p className="wl-body-s confirm-modal__body">
              사주 정보와 무드저널 기록이 모두 삭제돼요. 이 작업은 되돌릴 수 없어요.
            </p>
            <div className="confirm-modal__actions">
              <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setConfirmOpen(false)}>
                취소
              </button>
              <button type="button" className="danger-btn" onClick={handleReset}>
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="my-toast" role="status" aria-live="polite">{toast}</div>}

      {/* 하단 4탭 — 마이 활성 */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><Moon /><span>오늘</span></Link>
        <Link className="wl-bottom-nav__tab" href="/journal"><Notebook /><span>기록</span></Link>
        <Link className="wl-bottom-nav__tab" href="/saju"><LayoutGrid /><span>사주</span></Link>
        <button className="wl-bottom-nav__tab wl-bottom-nav__tab--active" type="button" aria-current="page">
          <User /><span>마이</span>
        </button>
      </nav>
    </main>
  );
}
