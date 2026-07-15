"use client";

// 결과 본문 렌더 — 엔진 차트(chart) + 용어사전(glossary)을 받아 buildView 로 사람 말로 풀어 그린다.
// 서버 경로(파라미터 진입, 공유·익명)와 클라 경로(무파라미터 진입, 로그인/익명 본인이 Firestore
// 에서 읽음)가 **같은 컴포넌트**를 쓴다 — 화면이 한 벌만 존재하도록. (개인정보 URL 노출 제거)
import Link from "next/link";
import { buildView, type EngineChart } from "./chart";
import { GlossaryText, GlossaryTerm, GlossaryProvider } from "./Glossary";
import type { GlossaryData } from "../../lib/glossary";
import { LinkResultCard } from "../../lib/LinkAccount";
import {
  Screen,
  EL_HAN_CLASS,
  Droplet,
  Route,
  CircleCheck,
  LayoutGrid,
  ChevronDown,
  Moon,
  Notebook,
  User,
  Heart,
} from "./ui";

export default function ResultView({
  chart,
  glossary,
}: {
  chart: EngineChart;
  glossary: GlossaryData;
}) {
  const v = buildView(chart, new Set(glossary.terms.map((t) => t.key)));

  return (
    <GlossaryProvider data={glossary}>
    <Screen>
      <div className="screen__scroll">
        <div className="wl-card-list">
          {/* 1. 캐릭터 요약 */}
          <section className="wl-card wl-card--gold char-card" aria-labelledby="char-name">
            <span className="char-avatar" aria-hidden="true"><Droplet /></span>
            <div className="wl-character-header">
              <span className="wl-character-header__kicker">당신은</span>
              <span className="wl-character-header__name" id="char-name">{v.character.name_ko}</span>
              <span className="wl-character-header__en">{v.character.name_en}</span>
              <span className="wl-character-header__desc">{v.character.desc}</span>
              <div className="wl-character-header__chips">
                {v.character.shensha.map((s) => (
                  <GlossaryTerm key={s} term={s} triggerClassName="wl-chip wl-chip--info" />
                ))}
              </div>
            </div>
            <span className="wl-trust-badge">
              <CircleCheck />{" "}
              {v.trueSolar ? (
                <><GlossaryTerm term="진태양시" />로 정밀 계산됨</>
              ) : (
                "표준시 기준 계산됨"
              )}
            </span>
          </section>

          <div className="wl-reflection">{v.reflectChar}</div>

          {/* 2. 오행 막대 */}
          <section className="wl-card elements" aria-labelledby="el-label">
            <div className="section-label-row">
              <span className="wl-section-label" id="el-label">타고난 오행의 균형</span>
            </div>
            <p className="wl-body-s wl-text-secondary">{v.elements.desc}</p>
            <div className="wl-element-bars" role="img" aria-label={v.elements.aria}>
              {v.elements.bars.map((b) => (
                <div key={b.key} className={`wl-element-bar${b.strong ? " wl-element-bar--strong" : ""}`}>
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

          <div className="wl-reflection">{v.reflectElement}</div>

          {/* 3. 올해의 흐름 */}
          <section className="wl-card" aria-labelledby="year-label">
            <div className="section-label-row">
              <Route />
              <span className="wl-section-label" id="year-label">올해의 흐름</span>
            </div>
            <div className="yearflow__head">
              <span className="wl-title-m">{v.yearFlow.title}</span>
              <span className="yearflow__period">{v.yearFlow.period}</span>
            </div>
            <p className="wl-body wl-text-secondary" style={{ marginTop: 8 }}>
              <GlossaryText text={v.yearFlow.desc} />
            </p>
            {v.yearFlow.tracks.map((t) => (
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

            {/* 다가오는 달(월운) — 세운의 하위 해상도라 같은 카드 안에 둔다.
                6칸을 나란히 보여주되 문장은 이번 달 하나만(6달 다 쓰면 문단 벽이 된다). */}
            {v.yearFlow.months.length > 0 && (
              <div className="months">
                <span className="wl-section-label months__label">
                  다가오는 달 · <GlossaryTerm term="월운" label="월운(月運)" />
                </span>
                <div className="months__track">
                  {v.yearFlow.months.map((m) => (
                    <div
                      key={`${m.label}-${m.ganzhi}`}
                      className={`months__col${m.current ? " months__col--current" : ""}`}
                      aria-label={`${m.label}${m.term ? ` (${m.termName} ${m.term})` : ""} ${m.god} — ${m.title}${m.current ? " (이번 달)" : ""}`}
                    >
                      <span className="months__month">{m.label}</span>
                      {/* 이 간지가 실제로 유효한 구간. 사주의 달은 절기에 바뀐다 — 8월 1~6일은
                          아직 지난 달 간지다. 작게라도 밝혀 두는 게 정직하다. */}
                      {m.term && <span className="months__term">{m.term}</span>}
                      <span className={`months__god wl-el-${m.el}`}>{m.god}</span>
                      <span className="months__hanja">{m.ganzhi}</span>
                      {m.current && <span className="months__now">이번 달</span>}
                    </div>
                  ))}
                </div>
                {v.yearFlow.months[0]?.term && (
                  <p className="months__terms-note">
                    달의 경계는 <GlossaryTerm term="절기" label="절기(節氣)" /> 기준이에요 — 1일이 아니라 입춘·입추 같은 마디에 바뀝니다.
                  </p>
                )}
                {v.yearFlow.nowMonth && (
                  <p className="wl-body-s wl-text-secondary months__tone">
                    이번 달은 <GlossaryTerm term={v.yearFlow.nowMonth.god} />의 달 —{" "}
                    {v.yearFlow.nowMonth.tone}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* 3-1. 대운의 흐름 타임라인 (10년 단위) */}
          {v.luck && (
            <section className="wl-card luck" aria-label="대운의 흐름">
              <span className="wl-section-label luck__label">
                대운의 흐름{v.luck.direction ? ` · ${v.luck.direction}` : ""}
              </span>
              <div className="luck__track">
                {v.luck.pillars.map((p) => (
                  <div
                    key={p.startAge}
                    className={`luck__col${p.current ? " luck__col--current" : ""}`}
                  >
                    <span className="luck__age">{p.startAge}세</span>
                    <span className="luck__ko">{p.ko}</span>
                    <span className="luck__hanja">{p.ganzhi}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="wl-reflection">{v.reflectLuck}</div>

          {/* 계정 연결 — 여기선 조용히 알리기만 한다(약한 유도).
              진짜 유도는 통찰이 열리는 순간(저널의 LinkInsightCard). */}
          <LinkResultCard />

          {/* 궁합 진입 — 결과를 나눠 사람을 데려오는 통로 */}
          <Link className="wl-btn wl-btn--rose" href="/compatibility">
            <Heart /> 소중한 사람과 궁합 보기
          </Link>
        </div>

        {/* 4. 명식 자세히 보기 (네이티브 details) */}
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
              {v.pillars.map((p) => (
                <div className="pillar" key={p.title}>
                  <div className="pillar__title">{p.title}</div>
                  {/* 공망 배지 자리 — 공망이 아닌 기둥도 빈 슬롯을 둬서 네 기둥의 행을 맞춘다.
                      (앱은 이 칸이 없어 공망 기둥만 아래로 밀리는데, 웹은 정렬을 유지) */}
                  <div className="pillar__void">
                    {p.isVoid && <GlossaryTerm term="공망" />}
                  </div>
                  {p.unknown ? (
                    <div className="pillar__cell">
                      <div className="pillar__han">?</div>
                      <div className="pillar__el">시간 모름</div>
                    </div>
                  ) : (
                    <>
                      {p.cells.map((cell, i) => (
                        <div className="pillar__cell" key={i}>
                          <div className={`pillar__han ${EL_HAN_CLASS[cell.el]}`}>{cell.han}</div>
                          <div className="pillar__el">{cell.label}</div>
                          {cell.god && (
                            <div className="pillar__god">
                              <GlossaryTerm term={cell.god} />
                            </div>
                          )}
                        </div>
                      ))}
                      {/* 12운성 — 단계명을 그대로 보여주되 툴팁은 그 단계 설명 */}
                      {p.twelveStage && (
                        <div className="pillar__stage">
                          <GlossaryTerm term={p.twelveStage} />
                        </div>
                      )}
                      {/* 지장간 — 한자 나열을 라벨로, 툴팁은 '지장간' 개념 설명 */}
                      {p.hiddenStems && (
                        <div className="pillar__hidden">
                          <GlossaryTerm term="지장간" label={p.hiddenStems} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            {v.godNote && (
              <p className="meongsik__godnote"><GlossaryText text={v.godNote} /></p>
            )}

            {/* 형충회합 — 네 지지 사이의 관계(앱과 동일 구성: 구분선 + 전용 섹션) */}
            <section className="relations">
              <h3 className="relations__title">
                <GlossaryTerm term="형충회합" label="형충회합(刑沖會合)" />
              </h3>
              <p className="relations__sub">네 지지 사이에 흐르는 관계예요.</p>
              {v.relations.length ? (
                <ul className="relations__list">
                  {v.relations.map((r, i) => (
                    <li className={`relation relation--${r.kind}`} key={i}>
                      <span className="relation__badge">
                        <GlossaryTerm term={r.term} label={r.label} />
                      </span>
                      <span className="relation__body">
                        {r.pillars} <span className="relation__branches">{r.branches}</span> — {r.feel}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="relations__empty">두드러진 관계가 보이지 않아요.</p>
              )}
            </section>

            <p className="meongsik__note"><GlossaryText text={v.meongsikNote} /></p>
          </div>
        </details>
      </div>

      {/* 하단 4탭 (다른 화면 연결 전 — 사주 탭만 활성) */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><Moon /><span>오늘</span></Link>
        <Link className="wl-bottom-nav__tab" href="/journal"><Notebook /><span>기록</span></Link>
        <button className="wl-bottom-nav__tab wl-bottom-nav__tab--active" type="button" aria-current="page">
          <LayoutGrid /><span>사주</span>
        </button>
        <Link className="wl-bottom-nav__tab" href="/my"><User /><span>마이</span></Link>
      </nav>
    </Screen>
    </GlossaryProvider>
  );
}
