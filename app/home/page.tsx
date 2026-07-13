"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSajuInput, chartUrl, chartQuery, type SajuInput } from "../lib/sajuInput";
import { pad } from "../lib/time";
import "./home.css";

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const MoonStars = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M18 15.5A7 7 0 1 1 9.5 6a5.5 5.5 0 0 0 8.5 9.5Z" /><path d="M18 4l.6 1.6L20 6l-1.4.4L18 8l-.6-1.6L16 6l1.4-.4Z" /></svg>);
const CircleCheck = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);
const MoodSmile = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M8.5 14a4 4 0 0 0 7 0" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const Heart = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const NotebookPen = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M5 4h9v6M5 4v16h11" /><path d="M9 4v16M9 9h4" /><path d="M18 14l3 3-4.5 1.5L18 14Z" /></svg>);
const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const ChevronRight = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M9 6l6 6-6 6" /></svg>);

/* ---------- 매핑 ---------- */
const EL_KO: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
const FIELD_KO: Record<string, string> = { wealth: "재물", love: "애정", health: "건강", growth: "성장" };
const FIELD_ORDER = ["wealth", "love", "health", "growth"] as const;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

interface Chart {
  five_elements?: Record<string, { pct: number }>;
  calc_meta?: { true_solar_time_applied?: boolean };
  daily_fortune?: {
    date?: string;
    overall_score: number;
    tone_line: string;
    matched_field?: string;
    fields?: Record<string, number>;
  };
}

type State =
  | { status: "loading" }
  | { status: "no-input" }
  | { status: "error" }
  | { status: "ready"; chart: Chart; input: SajuInput };

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "좋은 아침이에요";
  if (h >= 11 && h < 17) return "좋은 오후예요";
  if (h >= 17 && h < 21) return "좋은 저녁이에요";
  return "좋은 밤이에요";
}
function todayLabel(dateStr?: string): string {
  let d: Date;
  if (dateStr) {
    const [y, m, day] = dateStr.split("-").map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date();
  }
  return `오늘, ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일`;
}
function weatherOf(score: number): { title: string; desc: string } {
  if (score >= 65) return { title: "맑게 트이는 하루", desc: "마음이 가볍게 열리기 좋은 흐름이에요." };
  if (score >= 55) return { title: "잔잔히 맑은 하루", desc: "잔잔하게 마음을 고르기 좋은 흐름이에요." };
  if (score >= 45) return { title: "포근한 흐림", desc: "포근하게 머무르기 좋은 흐름이에요." };
  return { title: "고요한 흐림", desc: "마음을 안으로 쉬어주기 좋은 흐름이에요." };
}

export default function HomePage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let cancelled = false;

    (async () => {
      const input = await loadSajuInput();
      if (cancelled) return;
      if (!input) {
        clearTimeout(timer);
        setState({ status: "no-input" });
        return;
      }
      const now = new Date();
      const target = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      fetch(chartUrl(input, { target_date: target }), { cache: "no-store", signal: controller.signal })
        .then((r) => {
          if (!r.ok) throw new Error("bad");
          return r.json();
        })
        .then((chart: Chart) => { if (!cancelled) setState({ status: "ready", chart, input }); })
        .catch(() => { if (!cancelled) setState({ status: "error" }); })
        .finally(() => clearTimeout(timer));
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // ── 로딩 ──
  if (state.status === "loading") {
    return (
      <main className="home">
        <div className="home-state">
          <div className="loader" aria-hidden="true">
            <span className="loader__ring" />
            <span className="loader__mark"><Moon /></span>
          </div>
          <p className="wl-body-s wl-text-secondary">오늘의 흐름을 불러오는 중…</p>
        </div>
      </main>
    );
  }

  // ── 저장된 사주 없음(첫 방문) ──
  if (state.status === "no-input") {
    return (
      <main className="home">
        <div className="home-state">
          <span className="home-state__mark" aria-hidden="true"><Moon /></span>
          <h2 className="wl-title-m">먼저 사주를 확인해주세요</h2>
          <p className="wl-body wl-text-secondary">
            생년월일을 한 번만 알려주시면, 매일 여기서 오늘의 흐름을 볼 수 있어요.
          </p>
          <Link className="wl-btn wl-btn--primary home-state__cta" href="/saju">
            내 사주 확인하러 가기
          </Link>
        </div>
      </main>
    );
  }

  // ── 엔진 오류 ──
  if (state.status === "error") {
    return (
      <main className="home">
        <div className="home-state">
          <span className="home-state__mark" aria-hidden="true"><Moon /></span>
          <h2 className="wl-title-m">오늘의 흐름을 불러오지 못했어요</h2>
          <p className="wl-body wl-text-secondary">
            계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요.
          </p>
          <Link className="wl-btn wl-btn--primary home-state__cta" href="/saju">
            사주 다시 확인하기
          </Link>
        </div>
      </main>
    );
  }

  // ── 정상: 오늘의 운세 ──
  const { chart, input } = state;
  const df = chart.daily_fortune;
  const fe = chart.five_elements || {};
  const score = df?.overall_score ?? 0;
  const weather = weatherOf(score);
  const trueSolar = !!chart.calc_meta?.true_solar_time_applied;
  const resultHref = `/saju/result?${chartQuery(input).toString()}`;

  // 오행 막대 — 강한 순, 라벨만(값 없음), 최댓값 44px
  const bars = (Object.keys(fe) as string[])
    .map((k) => ({ key: k, pct: fe[k].pct }))
    .sort((a, b) => b.pct - a.pct);
  const maxPct = bars[0]?.pct || 1;

  const matchedKo = df?.matched_field ? FIELD_KO[df.matched_field] : "";

  return (
    <main className="home">
      <div className="home__scroll">
        {/* 인사 */}
        <header className="greeting">
          <div>
            <h1 className="wl-title-l greeting__hello">{timeGreeting()}</h1>
            <p className="wl-body-s wl-text-secondary greeting__date">{todayLabel(df?.date)}</p>
          </div>
          <span className="greeting__moon" aria-hidden="true"><MoonStars /></span>
        </header>

        {/* 신뢰 배지 */}
        <div className="home__trust">
          <span className="wl-trust-badge">
            <CircleCheck /> {trueSolar ? "진태양시로 정밀 계산됨" : "표준시 기준 계산됨"}
          </span>
        </div>

        <div className="wl-card-list">
          {/* 오늘의 감정 날씨 */}
          <section className="wl-card wl-card--gold" aria-labelledby="weather-label">
            <span className="wl-section-label" id="weather-label">오늘의 감정 날씨</span>
            <div className="weather">
              <span className="weather__icon" aria-hidden="true"><MoodSmile /></span>
              <div className="weather__text">
                <span className="wl-title-m weather__title">{weather.title}</span>
                <span className="wl-body-s wl-text-secondary">{weather.desc}</span>
              </div>
            </div>
            <div className="wl-reflection" style={{ marginTop: 16 }}>
              오늘 나를 가장 편하게 해줄 한 가지는 무엇일까요?
            </div>
          </section>

          {/* 오늘의 운세 */}
          <section className="wl-card" aria-labelledby="fortune-label">
            <span className="wl-section-label" id="fortune-label">오늘의 운세</span>
            <div className="fortune">
              <span className="wl-score-ring" aria-hidden="true">
                <span className="wl-score-ring__value">{score}</span>
                <span className="wl-score-ring__label">오늘</span>
              </span>
              <div className="fortune__body">
                <span className="wl-title-m fortune__title">{df?.tone_line ?? "오늘의 흐름"}</span>
                <span className="wl-body-s wl-text-secondary">
                  {matchedKo
                    ? `오늘은 ${matchedKo} 쪽으로 기운이 모이는 흐름이에요.`
                    : "오늘의 기운을 잔잔히 살펴보는 하루예요."}
                </span>
              </div>
            </div>

            {/* 분야별 점수 */}
            <div className="fortune-fields" aria-label="분야별 점수">
              {FIELD_ORDER.map((f) => {
                const v = Math.max(0, Math.min(100, df?.fields?.[f] ?? 0));
                return (
                  <div className="ff-row" key={f}>
                    <div className="ff-label">
                      <span className="wl-body-s wl-text-secondary">{FIELD_KO[f]}</span>
                      <span className="wl-body-s wl-text-tertiary">{v}</span>
                    </div>
                    <div className="wl-progress">
                      <div className="wl-progress__fill" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 오늘의 오행 흐름 */}
            <div
              className="wl-element-bars fortune__bars"
              role="img"
              aria-label={`오늘의 오행 흐름: ${bars[0] ? EL_KO[bars[0].key] : ""} 강함, ${bars.length ? EL_KO[bars[bars.length - 1].key] : ""} 약함`}
            >
              {bars.map((b, i) => (
                <div key={b.key} className={`wl-element-bar${i === 0 ? " wl-element-bar--strong" : ""}`}>
                  <div
                    className={`wl-element-bar__fill wl-element-bar__fill--${b.key}`}
                    style={{ height: `${Math.round((b.pct / maxPct) * 44)}px` }}
                  />
                  <span className="wl-element-bar__label">{EL_KO[b.key]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 오늘 기분 기록하기 (무드저널 입구 — 페이지는 다음 조각) */}
        <div className="section-gap">
          <span className="wl-section-label home__quick-label">오늘의 나</span>
          <Link className="mood-entry" href="/journal">
            <span className="mood-entry__icon" aria-hidden="true"><NotebookPen /></span>
            <span className="mood-entry__text">
              <span className="mood-entry__title">오늘 기분 기록하기</span>
              <span className="mood-entry__desc">지금 마음을 한 줄로 남겨보세요</span>
            </span>
            <span className="mood-entry__chevron" aria-hidden="true"><ChevronRight /></span>
          </Link>
        </div>

        {/* 바로 들어가기 */}
        <div className="section-gap">
          <span className="wl-section-label home__quick-label">바로 들어가기</span>
          <div className="quick">
            <Link className="quick__card" href={resultHref}>
              <span className="quick__icon" aria-hidden="true"><LayoutGrid /></span>
              <span className="quick__title">내 사주</span>
              <span className="quick__desc">나의 타고난 결을 다시 보기</span>
            </Link>
            <Link className="quick__card quick__card--rose" href="/compatibility">
              <span className="quick__icon" aria-hidden="true"><Heart /></span>
              <span className="quick__title">궁합</span>
              <span className="quick__desc">소중한 사람과의 결 맞춰보기</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 하단 4탭 */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <button className="wl-bottom-nav__tab wl-bottom-nav__tab--active" type="button" aria-current="page">
          <Moon /><span>오늘</span>
        </button>
        <Link className="wl-bottom-nav__tab" href="/journal">
          <Notebook /><span>기록</span>
        </Link>
        <Link className="wl-bottom-nav__tab" href={resultHref}>
          <LayoutGrid /><span>사주</span>
        </Link>
        <Link className="wl-bottom-nav__tab" href="/my">
          <User /><span>마이</span>
        </Link>
      </nav>
    </main>
  );
}
