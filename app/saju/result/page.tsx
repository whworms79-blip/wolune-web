// Wolune 사주 결과 — async 서버 컴포넌트(SSR).
// searchParams(입력값)로 서버에서 엔진(engine/server.py)을 호출 → 실제 사주로 렌더.
// 엔진이 꺼져 있으면 에러 없이 안내 화면으로 폴백.
import Link from "next/link";
import { buildView, isCompleteChart, type EngineChart } from "./chart";
import { GlossaryText, GlossaryTerm, GlossaryProvider } from "./Glossary";
import { getGlossary } from "../../lib/glossary";
import { LinkResultPrompt } from "../../lib/LinkAccount";
import "./result.css";

// 엔진 주소(기본 로컬). 서버→엔진 호출이라 CORS 무관.
const ENGINE = process.env.WOLUNE_ENGINE_URL || "http://127.0.0.1:8000";

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const ChevronDown = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M6 9l6 6 6-6" /></svg>);
const Droplet = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3.5c3.5 4 6 6.8 6 10a6 6 0 0 1-12 0c0-3.2 2.5-6 6-10Z" /></svg>);
const Route = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></svg>);
const CircleCheck = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const User = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
const Heart = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);

const EL_HAN_CLASS: Record<string, string> = {
  wood: "wl-el-wood", fire: "wl-el-fire", earth: "wl-el-earth",
  metal: "wl-el-metal", water: "wl-el-water",
};

// searchParams 값은 string | string[] → 첫 값만
function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

type FetchResult =
  | { ok: true; chart: EngineChart }
  | { ok: false; reason: "engine_down" | "bad_response" };

// 서버에서 엔진 호출 (타임아웃 6초, 실패해도 throw 대신 결과 객체 반환)
async function fetchChart(sp: Record<string, string | string[] | undefined>): Promise<FetchResult> {
  const params = new URLSearchParams();
  params.set("date", one(sp.date));
  if (one(sp.time)) params.set("time", one(sp.time));
  if (one(sp.city)) params.set("city", one(sp.city));
  params.set("gender", one(sp.gender) === "male" ? "male" : "female");
  if (one(sp.calendar) === "lunar") {
    params.set("calendar", "lunar");
    if (one(sp.is_leap_month) === "1") params.set("is_leap_month", "1");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${ENGINE}/v1/chart?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: "bad_response" };
    const chart = (await res.json()) as unknown;
    if (!isCompleteChart(chart)) {
      return { ok: false, reason: "bad_response" };
    }
    return { ok: true, chart };
  } catch {
    return { ok: false, reason: "engine_down" };
  } finally {
    clearTimeout(timer);
  }
}

// 상단 바 + 화면 껍데기 (모든 상태 공통)
function Screen({ children }: { children: React.ReactNode }) {
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

function FallbackState({ title, body }: { title: string; body: string }) {
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

export default async function SajuResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // 입력값(date) 없이 직접 진입 → 안내
  if (!one(sp.date)) {
    return (
      <FallbackState
        title="아직 사주 정보가 없어요"
        body="생년월일과 태어난 시간을 알려주시면, 진태양시로 정밀하게 계산해 드려요."
      />
    );
  }

  const result = await fetchChart(sp);

  // 엔진 꺼짐/오류 → 폴백 안내
  if (!result.ok) {
    return (
      <FallbackState
        title="지금은 사주를 불러오지 못했어요"
        body="계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요."
      />
    );
  }

  // 용어사전은 엔진이 준다(하루 캐시 + 실패 시 스냅샷 폴백). 서버에서 한 번 받아
  // 프로바이더로 내려주므로 클라이언트는 따로 요청하지 않는다.
  const glossary = await getGlossary();
  const v = buildView(result.chart, new Set(glossary.terms.map((t) => t.key)));

  return (
    <GlossaryProvider data={glossary}>
    <Screen>
      {/* 사주를 처음 본 "감동의 순간" 직후에만 계정 연결을 권한다(익명·1회) */}
      <LinkResultPrompt />
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
                      aria-label={`${m.label} ${m.god} — ${m.title}${m.current ? " (이번 달)" : ""}`}
                    >
                      <span className="months__month">{m.label}</span>
                      <span className={`months__god wl-el-${m.el}`}>{m.god}</span>
                      <span className="months__hanja">{m.ganzhi}</span>
                      {m.current && <span className="months__now">이번 달</span>}
                    </div>
                  ))}
                </div>
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
