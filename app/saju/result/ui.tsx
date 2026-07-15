"use client";

// 결과 화면의 공용 껍데기 — 상단 바(Screen)·폴백 안내(FallbackState)·아이콘·오행 색 매핑.
// 서버 렌더 경로(page.tsx: 파라미터 있는 진입)와 클라 렌더 경로(ResultFromStore: 무파라미터
// 진입, Firestore 에서 읽기)가 **같은 모양**을 쓰도록 한곳에 모은다.
import Link from "next/link";
import "./result.css";

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
export const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
export const ChevronDown = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M6 9l6 6 6-6" /></svg>);
export const Droplet = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3.5c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10Z" /></svg>);
export const Route = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></svg>);
export const CircleCheck = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);
export const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
export const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
export const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
export const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
export const Heart = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);

export const EL_HAN_CLASS: Record<string, string> = {
  wood: "wl-el-wood", fire: "wl-el-fire", earth: "wl-el-earth",
  metal: "wl-el-metal", water: "wl-el-water",
};

// 상단 바 + 화면 껍데기 (모든 상태 공통)
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="screen">
      <header className="topbar">
        <Link className="topbar__back" href="/saju?edit=1" aria-label="수정"><ChevronLeft /></Link>
        <h1 className="wl-heading">내 사주</h1>
      </header>
      {children}
    </main>
  );
}

export function FallbackState({ title, body }: { title: string; body: string }) {
  return (
    <Screen>
      <div className="result-fallback">
        <span className="result-fallback__mark" aria-hidden="true"><Moon /></span>
        <h2 className="wl-title-m">{title}</h2>
        <p className="wl-body wl-text-secondary">{body}</p>
        <Link className="wl-btn wl-btn--primary result-fallback__cta" href="/saju?edit=1">
          생년월일 입력하러 가기
        </Link>
      </div>
    </Screen>
  );
}

// 사주를 불러오는 중 — 무파라미터 진입(Firestore 읽기 → 엔진 계산) 동안 표시.
// 라우트 로딩(loading.tsx)과 같은 로더를 써서 결이 이어지게 한다.
export function LoadingState() {
  return (
    <Screen>
      <div className="result-loading">
        <div className="loader" aria-hidden="true">
          <span className="loader__ring" />
          <span className="loader__mark"><Moon /></span>
        </div>
        <h2 className="wl-title-m">진태양시로 정밀하게 계산하고 있어요</h2>
        <p className="wl-body-s wl-text-secondary">잠시만요, 당신의 흐름을 읽는 중</p>
      </div>
    </Screen>
  );
}
