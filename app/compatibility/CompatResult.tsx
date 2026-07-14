// 궁합 결과 표시(프레젠테이션). 순수 컴포넌트 — 훅/이벤트 없음 →
// 클라이언트(/compatibility 입력 결과)·서버(/compatibility/share SSR) 양쪽에서 재사용.
// 하단 액션(공유 버튼 / "나도 내 사주" CTA)만 footer 슬롯으로 갈아끼운다.
//
// 화면의 3단 구조: 감정(점수·요약) → 재료(점수 근거·두 분의 결) → 성찰.
// ★ 점수 근거 카드의 마지막 문단(disclosure)은 절대 빼지 말 것. 궁합 점수는 사주에 원래
//   없는, 우리가 만든 숫자다 — 그걸 정직하게 밝히는 게 이 제품의 핵심이다.
import type { CompatView, BasisKind } from "../lib/compatibility";
import { GlossaryText, GlossaryTerm } from "../saju/result/Glossary";

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
const Sparkle = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></svg>);

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

// 색 규칙은 명식의 형충회합과 동일하다 — 합=라벤더 / 충=화 / 잔긴장=로즈.
const KIND_CLASS: Record<BasisKind, string> = {
  he: "basis__row--he",
  chong: "basis__row--chong",
  minor: "basis__row--minor",
  neutral: "basis__row--neutral",
};

export default function CompatResult({
  view,
  footer,
}: {
  view: CompatView;
  footer?: React.ReactNode;
}) {
  const sb = view.scoreBasis;
  const meet = view.shenshaMeet;

  return (
    <>
      <div className="pair">
        <div className="person person--gold">
          <span className="person__avatar" aria-hidden="true">{view.a.initial}</span>
          <span className="person__name">{view.a.name}</span>
          {view.a.character ? (
            <span className="person__char">{view.a.character}</span>
          ) : null}
          <span className="person__el">{view.a.elLabel}</span>
        </div>
        <span className="pair__heart" aria-hidden="true"><HeartFill /></span>
        <div className="person person--rose">
          <span className="person__avatar" aria-hidden="true">{view.b.initial}</span>
          <span className="person__name">{view.b.name}</span>
          {view.b.character ? (
            <span className="person__char">{view.b.character}</span>
          ) : null}
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

        {/* 점수 근거 — 점수 바로 아래, 접지 않는다. 우리가 만든 숫자임을 여기서 밝힌다. */}
        <section className="wl-card basis" aria-labelledby="basis-title">
          <span className="wl-section-label basis__title" id="basis-title">
            이 점수는 이렇게 나왔어요
          </span>
          <ul className="basis__rows">
            {sb.rows.map((row, i) => (
              <li key={i} className={`basis__row ${KIND_CLASS[row.kind]}`}>
                <span className="basis__chips">
                  {row.chips.map((c, j) => (
                    <span key={j} className="basis__chip">
                      <span className="basis__chip-label"><GlossaryText text={c.label} /></span>
                      <span className="basis__chip-delta">{sign(c.delta)}</span>
                    </span>
                  ))}
                </span>
                <span className="basis__note"><GlossaryText text={row.note} /></span>
              </li>
            ))}
          </ul>
          <p className="basis__disclosure">
            <GlossaryText text={sb.disclosure} />
          </p>
        </section>

        {/* 잘 맞는 결 */}
        <section className="wl-card insight insight--good">
          <div className="insight__head">
            <span className="insight__icon" aria-hidden="true"><Check /></span>
            <span className="wl-section-label insight__label--good">잘 맞는 결</span>
          </div>
          <p className="wl-body wl-text-secondary"><GlossaryText text={view.good} /></p>
        </section>

        {/* 다정한 긴장 */}
        <section className="wl-card insight insight--tension">
          <div className="insight__head">
            <span className="insight__icon" aria-hidden="true"><Flame /></span>
            <span className="wl-section-label insight__label--tension">다정한 긴장</span>
          </div>
          <p className="wl-body wl-text-secondary"><GlossaryText text={view.tension} /></p>
        </section>

        {/* 두 분의 결 — 신살 접점. 흉살도 겁주지 않고 강점의 언어로. */}
        {meet ? (
          <section className="wl-card insight insight--meet">
            <div className="insight__head">
              <span className="insight__icon" aria-hidden="true"><Sparkle /></span>
              <span className="wl-section-label insight__label--meet">두 분의 결</span>
            </div>
            <div className="meet__sides">
              {([[view.a, meet.a], [view.b, meet.b]] as const).map(([p, list], i) =>
                list.length ? (
                  <div className="meet__side" key={i}>
                    <span className="meet__who">{p.name}</span>
                    <span className="meet__chips">
                      {list.map((n) => (
                        <span className="meet__chip" key={n}>
                          <GlossaryTerm term={n} />
                        </span>
                      ))}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
            <p className="wl-body wl-text-secondary meet__line">
              <GlossaryText text={meet.line} />
            </p>
          </section>
        ) : null}

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
