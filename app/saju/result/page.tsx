// Wolune 사주 결과 — 순수 서버 컴포넌트(SSR). 데이터 바인딩만 정적 렌더.
// 지금은 엔진 미연결: sample_chart의 "고요한 호수" 값을 더미로 자리만 잡아둔다.
// 명식 접기는 네이티브 <details>, 하단 탭은 비활성 → "use client" 불필요.
import Link from "next/link";
import "./result.css";

/* ---------- 인라인 아이콘(Tabler 톤, currentColor 스트로크) ---------- */
const ico = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>
);
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" {...ico}><path d="M6 9l6 6 6-6" /></svg>
);
const Droplet = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <path d="M12 3.5c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10Z" />
  </svg>
);
const Route = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" />
    <path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
  </svg>
);
const CircleCheck = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" />
  </svg>
);
const LayoutGrid = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);
const Notebook = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" />
  </svg>
);
const User = () => (
  <svg viewBox="0 0 24 24" {...ico}>
    <circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

/* ---------- 더미 데이터 (sample_chart.json 기반 · 엔진 연결 전 자리표시) ---------- */
const CHART = {
  character: {
    name_ko: "고요한 호수",
    name_en: "The Still Lake",
    desc: "깊이 사유하고, 천천히, 그러나 단단하게 흐르는 사람",
    shensha: ["화개", "도화", "괴강"],
  },
  trueSolar: true,
  reflectChar: "‘고요함’이라는 결이 요즘의 나와 얼마나 닿아 있나요?",
  elements: {
    desc: "금(金)이 가장 강하고, 수(水)가 옅은 편이에요. 차분함과 단단함이 강점이 되는 결입니다.",
    bars: [
      { key: "metal", ko: "금", pct: "37.5", h: 96, strong: true },
      { key: "fire", ko: "화", pct: "25", h: 64, strong: false },
      { key: "wood", ko: "목", pct: "12.5", h: 32, strong: false },
      { key: "earth", ko: "토", pct: "12.5", h: 32, strong: false },
      { key: "water", ko: "수", pct: "12.5", h: 32, strong: false },
    ],
  },
  reflectElement:
    "금(金)의 단단함이 강한 당신에게, 요즘 가장 옅은 수(水)의 자리엔 무엇을 채우고 싶나요?",
  yearFlow: {
    title: "한 걸음 더 나아가는 해",
    period: "2026",
    desc:
      "2026년은 병오(丙午)년 — 일간 경금(庚)에게는 편관의 해예요. 도전과 성장의 기운이 흐르는 해 — 부담을 동력으로 바꾸기 좋은 흐름이에요. 지금은 무자(戊子) 대운(역행)을 지나는 흐름이에요.",
    tracks: [
      { label: "관계가 깊어지는 흐름", pct: 66 },
      { label: "새로 시작하기 좋은 흐름", pct: 42 },
    ],
  },
  reflectLuck:
    "지금은 무자(戊子) 대운(역행)의 큰 흐름을 지나고 있어요. 그 긴 흐름 위에서, 올해 편관의 기운은 어떤 자리에 두고 싶나요?",
  pillars: [
    { title: "시주", cells: [
      { han: "辛", el: "metal", label: "금 · 음" },
      { han: "巳", el: "fire", label: "화 · 음" },
    ] },
    { title: "일주", cells: [
      { han: "庚", el: "metal", label: "금 · 양" },
      { han: "戌", el: "earth", label: "토 · 양" },
    ] },
    { title: "월주", cells: [
      { han: "辛", el: "metal", label: "금 · 음" },
      { han: "卯", el: "wood", label: "목 · 음" },
    ] },
    { title: "연주", cells: [
      { han: "丙", el: "fire", label: "화 · 양" },
      { han: "子", el: "water", label: "수 · 양" },
    ] },
  ],
  meongsikNote:
    "일간은 경금(庚金) — 단단하고 서늘한 쇠의 기운이에요. 한자와 전문 용어는 참고용이며, 해석은 위의 사람 말 설명을 기준으로 읽어주세요.",
};

const EL_HAN_CLASS: Record<string, string> = {
  wood: "wl-el-wood", fire: "wl-el-fire", earth: "wl-el-earth",
  metal: "wl-el-metal", water: "wl-el-water",
};

export default function SajuResultPage() {
  const c = CHART;
  return (
    <main className="screen">
      {/* 상단 바 */}
      <header className="topbar">
        <Link className="topbar__back" href="/saju" aria-label="뒤로">
          <ChevronLeft />
        </Link>
        <h1 className="wl-heading">내 사주</h1>
      </header>

      <div className="screen__scroll">
        <div className="wl-card-list">
          {/* 1. 캐릭터 요약 */}
          <section className="wl-card wl-card--gold char-card" aria-labelledby="char-name">
            <span className="char-avatar" aria-hidden="true"><Droplet /></span>
            <div className="wl-character-header">
              <span className="wl-character-header__kicker">당신은</span>
              <span className="wl-character-header__name" id="char-name">
                {c.character.name_ko}
              </span>
              <span className="wl-character-header__en">{c.character.name_en}</span>
              <span className="wl-character-header__desc">{c.character.desc}</span>
              <div className="wl-character-header__chips">
                {c.character.shensha.map((s) => (
                  <span key={s} className="wl-chip wl-chip--info">{s}</span>
                ))}
              </div>
            </div>
            <span className="wl-trust-badge">
              <CircleCheck />{" "}
              {c.trueSolar ? "진태양시로 정밀 계산됨" : "표준시 기준 계산됨"}
            </span>
          </section>

          {/* 1 성찰 */}
          <div className="wl-reflection">{c.reflectChar}</div>

          {/* 2. 오행 막대 */}
          <section className="wl-card elements" aria-labelledby="el-label">
            <div className="section-label-row">
              <span className="wl-section-label" id="el-label">타고난 오행의 균형</span>
            </div>
            <p className="wl-body-s wl-text-secondary">{c.elements.desc}</p>
            <div
              className="wl-element-bars"
              role="img"
              aria-label={`오행 분포: ${c.elements.bars
                .map((b) => `${b.ko} ${b.pct}%`)
                .join(", ")}`}
            >
              {c.elements.bars.map((b) => (
                <div
                  key={b.key}
                  className={`wl-element-bar${b.strong ? " wl-element-bar--strong" : ""}`}
                >
                  <span className="wl-element-bar__value">{b.pct}%</span>
                  <div
                    className={`wl-element-bar__fill wl-element-bar__fill--${b.key}`}
                    style={{ height: `${b.h}px` }}
                  />
                  <span className="wl-element-bar__label">{b.ko}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 2 성찰 */}
          <div className="wl-reflection">{c.reflectElement}</div>

          {/* 3. 올해의 흐름 */}
          <section className="wl-card" aria-labelledby="year-label">
            <div className="section-label-row">
              <Route />
              <span className="wl-section-label" id="year-label">올해의 흐름</span>
            </div>
            <div className="yearflow__head">
              <span className="wl-title-m">{c.yearFlow.title}</span>
              <span className="yearflow__period">{c.yearFlow.period}</span>
            </div>
            <p className="wl-body wl-text-secondary" style={{ marginTop: 8 }}>
              {c.yearFlow.desc}
            </p>
            {/* ⚠ 데모 데이터: 분야별 점수는 엔진 미구현 자리표시 */}
            {c.yearFlow.tracks.map((t) => (
              <div className="yearflow__line" key={t.label}>
                <div className="yearflow__track-label">
                  <span className="wl-body-s wl-text-secondary">{t.label}</span>
                  <span className="wl-body-s wl-text-tertiary">{t.pct}%</span>
                </div>
                <div className="wl-progress">
                  <div className="wl-progress__fill" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </section>

          {/* 3 성찰 */}
          <div className="wl-reflection">{c.reflectLuck}</div>
        </div>

        {/* 4. 명식 자세히 보기 (접힘 · 네이티브 details) */}
        <details className="meongsik">
          <summary>
            <span className="meongsik__summary-left">
              <LayoutGrid />
              <span className="wl-body-l">명식 자세히 보기</span>
            </span>
            <span className="meongsik__chevron" aria-hidden="true"><ChevronDown /></span>
          </summary>
          <div className="meongsik__body">
            <div className="pillars">
              {c.pillars.map((p) => (
                <div className="pillar" key={p.title}>
                  <div className="pillar__title">{p.title}</div>
                  {p.cells.map((cell, i) => (
                    <div className="pillar__cell" key={i}>
                      <div className={`pillar__han ${EL_HAN_CLASS[cell.el]}`}>
                        {cell.han}
                      </div>
                      <div className="pillar__el">{cell.label}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="meongsik__note">{c.meongsikNote}</p>
          </div>
        </details>
      </div>

      {/* 하단 4탭 (엔진/다른 화면 연결 전 — 사주 탭만 활성, 나머지 비활성) */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <button className="wl-bottom-nav__tab" type="button" disabled>
          <Moon /><span>오늘</span>
        </button>
        <button className="wl-bottom-nav__tab" type="button" disabled>
          <Notebook /><span>기록</span>
        </button>
        <button
          className="wl-bottom-nav__tab wl-bottom-nav__tab--active"
          type="button"
          aria-current="page"
        >
          <LayoutGrid /><span>사주</span>
        </button>
        <button className="wl-bottom-nav__tab" type="button" disabled>
          <User /><span>마이</span>
        </button>
      </nav>
    </main>
  );
}
