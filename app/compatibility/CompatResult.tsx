// 궁합 결과 표시(프레젠테이션). 순수 컴포넌트 — 훅/이벤트 없음 →
// 클라이언트(/compatibility 입력 결과)·서버(/compatibility/share SSR) 양쪽에서 재사용.
// 하단 액션(공유 버튼 / "나도 내 사주" CTA)만 footer 슬롯으로 갈아끼운다.
import type { CompatView } from "../lib/compatibility";

const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const HeartFill = () => (<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);
const Check = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M5 12l5 5L20 6" /></svg>);
const Flame = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 1.5 2 2.5 3.5 2.5 5.5a5 5 0 0 1-10 0C7 12 10 9 12 3Z" /></svg>);
const CircleCheck = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);

export default function CompatResult({
  view,
  footer,
}: {
  view: CompatView;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <div className="pair">
        <div className="person person--gold">
          <span className="person__avatar" aria-hidden="true">{view.a.initial}</span>
          <span className="person__name">{view.a.name}</span>
          <span className="person__el">{view.a.elLabel}</span>
        </div>
        <span className="pair__heart" aria-hidden="true"><HeartFill /></span>
        <div className="person person--rose">
          <span className="person__avatar" aria-hidden="true">{view.b.initial}</span>
          <span className="person__name">{view.b.name}</span>
          <span className="person__el">{view.b.elLabel}</span>
        </div>
      </div>

      <div className="wl-card-list">
        {/* 궁합 점수 */}
        <section className="wl-card wl-card--rose" aria-labelledby="score-title">
          <div className="score">
            <span className="wl-score-ring wl-score-ring--rose" aria-label={`궁합 점수 ${view.score}점`}>
              <span className="wl-score-ring__value">{view.score}</span>
              <span className="wl-score-ring__label">궁합</span>
            </span>
            <div className="score__body">
              <span className="wl-title-m" id="score-title">{view.summary.title}</span>
              <span className="wl-body-s wl-voice score__en">{view.summary.en}</span>
              <span className="wl-body wl-text-secondary">{view.summary.tagline}</span>
            </div>
          </div>
        </section>

        {/* 잘 맞는 결 */}
        <section className="wl-card insight insight--good">
          <div className="insight__head">
            <span className="insight__icon" aria-hidden="true"><Check /></span>
            <span className="wl-section-label insight__label--good">잘 맞는 결</span>
          </div>
          <p className="wl-body wl-text-secondary">{view.good}</p>
        </section>

        {/* 다정한 긴장 */}
        <section className="wl-card insight insight--tension">
          <div className="insight__head">
            <span className="insight__icon" aria-hidden="true"><Flame /></span>
            <span className="wl-section-label insight__label--tension">다정한 긴장</span>
          </div>
          <p className="wl-body wl-text-secondary">{view.tension}</p>
        </section>

        {/* 성찰 */}
        <div className="wl-reflection">{view.reflection}</div>

        {/* 신뢰 배지 */}
        <div className="compat-trust-row">
          <span className="wl-trust-badge">
            <CircleCheck /> 진태양시로 정밀 계산됨
          </span>
        </div>

        {footer}
      </div>
    </>
  );
}
