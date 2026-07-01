"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DateField, { type DateValue } from "../saju/DateField";
import {
  loadSajuInput,
  saveSajuInput,
  chartUrl,
  chartQuery,
  type SajuInput,
} from "../lib/sajuInput";
import {
  buildCompatibility,
  type CompatChart,
  type CompatView,
} from "../lib/compatibility";
import "./compatibility.css";

/* ---------- 시간 파싱/표시 ---------- */
const pad = (n: number) => (n < 10 ? "0" : "") + n;

// "오전 11:11" / "오후 3:30" / "23:05" → "HH:MM" (없으면 "")
function parseTime(s: string): string {
  s = (s || "").trim();
  if (!s) return "";
  const pm = /오후|pm/i.test(s);
  const am = /오전|am/i.test(s);
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "";
  let h = parseInt(m[1], 10);
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return `${pad(h)}:${m[2]}`;
}

// "23:05" → "오후 11:05" (저장된 24시간 표기를 폼 표시용으로)
function to12h(hhmm: string): string {
  const m = (hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const h = parseInt(m[1], 10);
  const ap = h < 12 ? "오전" : "오후";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${ap} ${h12}:${m[2]}`;
}

/* ---------- 사람 입력 상태 ---------- */
interface PersonState {
  name: string;
  birth: DateValue;
  time: string;
  unknownTime: boolean;
  city: string;
  gender: "여성" | "남성";
  calendar: "solar" | "lunar";
  leap: boolean;
}

const DEFAULT_ME: PersonState = {
  name: "나",
  birth: { year: 1996, month: 3, day: 14 },
  time: "오전 11:11",
  unknownTime: false,
  city: "서울",
  gender: "여성",
  calendar: "solar",
  leap: false,
};
const DEFAULT_YOU: PersonState = {
  name: "",
  birth: { year: 1994, month: 7, day: 20 },
  time: "",
  unknownTime: true,
  city: "서울",
  gender: "남성",
  calendar: "solar",
  leap: false,
};

function fromSaved(inp: SajuInput): PersonState {
  const [y, mo, d] = inp.date.split("-").map(Number);
  return {
    name: "나",
    birth: { year: y, month: mo, day: d },
    time: inp.time ? to12h(inp.time) : "",
    unknownTime: !inp.time,
    city: inp.city || "서울",
    gender: inp.gender === "male" ? "남성" : "여성",
    calendar: inp.calendar,
    leap: !!inp.is_leap_month,
  };
}

function toInput(p: PersonState): SajuInput {
  const time = p.unknownTime ? undefined : parseTime(p.time) || undefined;
  const isLunar = p.calendar === "lunar";
  return {
    date: `${p.birth.year}-${pad(p.birth.month)}-${pad(p.birth.day)}`,
    time,
    city: p.city.trim() || undefined,
    gender: p.gender === "남성" ? "male" : "female",
    calendar: isLunar ? "lunar" : "solar",
    is_leap_month: isLunar && p.leap ? true : undefined,
  };
}

const CITIES = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "수원",
  "춘천", "강릉", "원주", "청주", "천안", "전주", "목포", "여수", "포항",
  "경주", "창원", "진주", "제주", "서귀포",
];

/* ---------- 인라인 아이콘 ---------- */
const ico = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ClockIcon = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
const MapPinIcon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M18 11.5c0 4-6 9.5-6 9.5s-6-5.5-6-9.5a6 6 0 0 1 12 0Z" /><circle cx="12" cy="11" r="2.2" /></svg>);
const UserIcon = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="8" r="4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const HeartIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);
const HeartLine = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 20s-7-4.5-9.2-9A4.5 4.5 0 0 1 12 6.5 4.5 4.5 0 0 1 21.2 11C19 15.5 12 20 12 20Z" /></svg>);
const ChevronLeft = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M15 6l-6 6 6 6" /></svg>);
const CircleCheck = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="12" cy="12" r="9" /><path d="M8.5 12l2.4 2.4 4.6-4.8" /></svg>);
const Check = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M5 12l5 5L20 6" /></svg>);
const Flame = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 .5-2 1.5 2 2.5 3.5 2.5 5.5a5 5 0 0 1-10 0C7 12 10 9 12 3Z" /></svg>);
const Notebook = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 4v16M9 9h6M9 13h4" /></svg>);
const LayoutGrid = () => (<svg viewBox="0 0 24 24" {...ico}><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>);
const Moon = MoonIcon;

/* 한 사람 입력 묶음 */
function PersonFields({
  role,
  value,
  onChange,
}: {
  role: "me" | "you";
  value: PersonState;
  onChange: (v: PersonState) => void;
}) {
  const set = (patch: Partial<PersonState>) => onChange({ ...value, ...patch });
  const isLunar = value.calendar === "lunar";
  const isMe = role === "me";
  const listId = `city-${role}`;

  return (
    <section className={`wl-card person-card ${isMe ? "person-card--me" : "person-card--you"}`}>
      <div className="person-card__head">
        <span className="person-card__badge" aria-hidden="true">{isMe ? "나" : "너"}</span>
        <span className="wl-title-m person-card__title">{isMe ? "나의 정보" : "상대방 정보"}</span>
      </div>

      <div className="form-grid">
        {/* 이름 */}
        <div className="wl-field">
          <label className="wl-field__label" htmlFor={`name-${role}`}>이름 (선택)</label>
          <div className="input-wrap">
            <span className="input-wrap__icon" aria-hidden="true"><UserIcon /></span>
            <input
              className="wl-input"
              id={`name-${role}`}
              type="text"
              value={value.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={isMe ? "나" : "상대방"}
              autoComplete="off"
              maxLength={12}
            />
          </div>
        </div>

        {/* 생년월일 + 양/음력 + 윤달 */}
        <div className="wl-field">
          <span className="wl-field__label">생년월일</span>
          <DateField value={value.birth} onChange={(b) => set({ birth: b })} />

          <div className="wl-segmented cal-seg" role="group" aria-label="달력 기준">
            <button
              type="button"
              className={`wl-segmented__item${!isLunar ? " wl-segmented__item--selected" : ""}`}
              aria-pressed={!isLunar}
              onClick={() => set({ calendar: "solar", leap: false })}
            >
              양력
            </button>
            <button
              type="button"
              className={`wl-segmented__item${isLunar ? " wl-segmented__item--selected" : ""}`}
              aria-pressed={isLunar}
              onClick={() => set({ calendar: "lunar" })}
            >
              음력
            </button>
          </div>

          {isLunar && (
            <>
              <p className="cal-hint wl-caption">
                <MoonIcon /> <span>위 날짜를 음력으로 입력해주세요</span>
              </p>
              <div className="leap-row">
                <span className="wl-body-s wl-text-secondary">윤달(閏月)로 태어났어요</span>
                <button
                  type="button"
                  className="wl-toggle"
                  role="switch"
                  aria-checked={value.leap}
                  aria-label="윤달 여부"
                  onClick={() => set({ leap: !value.leap })}
                />
              </div>
            </>
          )}
        </div>

        {/* 태어난 시간 + 모름 */}
        <div className="wl-field">
          <label className="wl-field__label" htmlFor={`time-${role}`}>태어난 시간</label>
          <div className="time-row">
            <div className="input-wrap">
              <span className="input-wrap__icon" aria-hidden="true"><ClockIcon /></span>
              <input
                className="wl-input"
                id={`time-${role}`}
                type="text"
                value={value.unknownTime ? "" : value.time}
                onChange={(e) => set({ time: e.target.value })}
                placeholder="예: 오전 11:11"
                disabled={value.unknownTime}
              />
            </div>
            <button
              type="button"
              className={`wl-chip${value.unknownTime ? " wl-chip--selected" : ""}`}
              aria-pressed={value.unknownTime}
              onClick={() => set({ unknownTime: !value.unknownTime })}
            >
              모름
            </button>
          </div>
        </div>

        {/* 태어난 곳 + 성별 */}
        <div className="form-row">
          <div className="wl-field">
            <label className="wl-field__label" htmlFor={`city-input-${role}`}>태어난 곳</label>
            <div className="input-wrap">
              <span className="input-wrap__icon" aria-hidden="true"><MapPinIcon /></span>
              <input
                className="wl-input"
                id={`city-input-${role}`}
                type="text"
                list={listId}
                value={value.city}
                onChange={(e) => set({ city: e.target.value })}
                placeholder="예: 서울"
                autoComplete="off"
              />
            </div>
            <datalist id={listId}>
              {CITIES.map((c) => (<option key={c} value={c} />))}
            </datalist>
          </div>

          <div className="wl-field">
            <span className="wl-field__label" id={`gender-${role}`}>성별</span>
            <div className="wl-segmented" role="group" aria-labelledby={`gender-${role}`}>
              {(["여성", "남성"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`wl-segmented__item${value.gender === g ? " wl-segmented__item--selected" : ""}`}
                  aria-pressed={value.gender === g}
                  onClick={() => set({ gender: g })}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type Phase =
  | { status: "form" }
  | { status: "loading" }
  | { status: "result"; view: CompatView }
  | { status: "error" };

export default function CompatibilityPage() {
  const [me, setMe] = useState<PersonState>(DEFAULT_ME);
  const [you, setYou] = useState<PersonState>(DEFAULT_YOU);
  const [phase, setPhase] = useState<Phase>({ status: "form" });
  const [savedHref, setSavedHref] = useState("/saju");

  // 저장된 내 사주가 있으면 '나' 자동 채움 + 사주 탭 링크 준비
  useEffect(() => {
    const saved = loadSajuInput();
    if (saved) {
      setMe(fromSaved(saved));
      setSavedHref(`/saju/result?${chartQuery(saved).toString()}`);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase.status === "loading") return;
    setPhase({ status: "loading" });

    const inA = toInput(me);
    const inB = toInput(you);
    saveSajuInput(inA); // 내 정보는 저장 → 다음 방문 자동 채움

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const [ra, rb] = await Promise.all([
        fetch(chartUrl(inA), { cache: "no-store", signal: controller.signal }),
        fetch(chartUrl(inB), { cache: "no-store", signal: controller.signal }),
      ]);
      if (!ra.ok || !rb.ok) throw new Error("bad_response");
      const [ca, cb] = (await Promise.all([ra.json(), rb.json()])) as [CompatChart, CompatChart];
      if (!ca?.pillars || !ca?.five_elements || !cb?.pillars || !cb?.five_elements) {
        throw new Error("bad_response");
      }
      const view = buildCompatibility(ca, cb, me.name, you.name);
      setPhase({ status: "result", view });
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch {
      setPhase({ status: "error" });
    } finally {
      clearTimeout(timer);
    }
  }

  const isResult = phase.status === "result";

  return (
    <main className="screen">
      {/* 상단 바 */}
      <header className="topbar">
        {isResult ? (
          <button
            className="topbar__btn"
            type="button"
            aria-label="다시 입력"
            onClick={() => setPhase({ status: "form" })}
          >
            <ChevronLeft />
          </button>
        ) : (
          <Link className="topbar__btn" href="/home" aria-label="홈으로">
            <ChevronLeft />
          </Link>
        )}
        <h1 className="wl-heading topbar__title">궁합</h1>
      </header>

      {/* ── 입력 폼 ── */}
      {(phase.status === "form" || phase.status === "loading") && (
        <div className="screen__scroll">
          <div className="compat-intro">
            <h2 className="compat-intro__title">두 사람의 결을 맞춰봐요</h2>
            <p className="wl-body-s wl-text-secondary compat-intro__sub">
              생년월일만 있으면 돼요. 서로 잘 통하는 점과 배려하면 좋은 점을 살펴드릴게요.
            </p>
          </div>

          <form className="compat-form" onSubmit={handleSubmit} autoComplete="off">
            <PersonFields role="me" value={me} onChange={setMe} />

            <div className="pair-divider" aria-hidden="true"><HeartIcon /></div>

            <PersonFields role="you" value={you} onChange={setYou} />

            <div className="compat-submit">
              <button
                type="submit"
                className="wl-btn wl-btn--rose"
                disabled={phase.status === "loading"}
              >
                <HeartLine />{" "}
                {phase.status === "loading" ? "궁합을 살펴보는 중…" : "궁합 보기"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 오류 ── */}
      {phase.status === "error" && (
        <div className="compat-state">
          <span className="compat-state__mark" aria-hidden="true"><HeartLine /></span>
          <h2 className="wl-title-m">지금은 궁합을 불러오지 못했어요</h2>
          <p className="wl-body wl-text-secondary">
            계산 서버와 연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            className="wl-btn wl-btn--rose"
            type="button"
            style={{ width: "auto", padding: "13px 26px", marginTop: 8 }}
            onClick={() => setPhase({ status: "form" })}
          >
            다시 입력하기
          </button>
        </div>
      )}

      {/* ── 결과 ── */}
      {phase.status === "result" && (
        <div className="screen__scroll">
          <div className="pair">
            <div className="person person--gold">
              <span className="person__avatar" aria-hidden="true">{phase.view.a.initial}</span>
              <span className="person__name">{phase.view.a.name}</span>
              <span className="person__el">{phase.view.a.elLabel}</span>
            </div>
            <span className="pair__heart" aria-hidden="true"><HeartIcon /></span>
            <div className="person person--rose">
              <span className="person__avatar" aria-hidden="true">{phase.view.b.initial}</span>
              <span className="person__name">{phase.view.b.name}</span>
              <span className="person__el">{phase.view.b.elLabel}</span>
            </div>
          </div>

          <div className="wl-card-list">
            {/* 궁합 점수 */}
            <section className="wl-card wl-card--rose" aria-labelledby="score-title">
              <div className="score">
                <span className="wl-score-ring wl-score-ring--rose" aria-label={`궁합 점수 ${phase.view.score}점`}>
                  <span className="wl-score-ring__value">{phase.view.score}</span>
                  <span className="wl-score-ring__label">궁합</span>
                </span>
                <div className="score__body">
                  <span className="wl-title-m" id="score-title">{phase.view.summary.title}</span>
                  <span className="wl-body-s wl-voice score__en">{phase.view.summary.en}</span>
                  <span className="wl-body wl-text-secondary">{phase.view.summary.tagline}</span>
                </div>
              </div>
            </section>

            {/* 잘 맞는 결 */}
            <section className="wl-card insight insight--good">
              <div className="insight__head">
                <span className="insight__icon" aria-hidden="true"><Check /></span>
                <span className="wl-section-label insight__label--good">잘 맞는 결</span>
              </div>
              <p className="wl-body wl-text-secondary">{phase.view.good}</p>
            </section>

            {/* 다정한 긴장 */}
            <section className="wl-card insight insight--tension">
              <div className="insight__head">
                <span className="insight__icon" aria-hidden="true"><Flame /></span>
                <span className="wl-section-label insight__label--tension">다정한 긴장</span>
              </div>
              <p className="wl-body wl-text-secondary">{phase.view.tension}</p>
            </section>

            {/* 성찰 */}
            <div className="wl-reflection">{phase.view.reflection}</div>

            {/* 신뢰 배지 */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <span className="wl-trust-badge">
                <CircleCheck /> 진태양시로 정밀 계산됨
              </span>
            </div>

            <div className="compat-submit">
              <button
                className="wl-btn wl-btn--rose"
                type="button"
                onClick={() => setPhase({ status: "form" })}
              >
                <HeartLine /> 다른 사람과 다시 보기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 4탭 (궁합은 별도 탭이 아니라 사주 탭 계열 진입 — 활성 표시는 두지 않음) */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><Moon /><span>오늘</span></Link>
        <Link className="wl-bottom-nav__tab" href="/journal"><Notebook /><span>기록</span></Link>
        <Link className="wl-bottom-nav__tab" href={savedHref}><LayoutGrid /><span>사주</span></Link>
        <button className="wl-bottom-nav__tab" type="button" disabled><UserIcon /><span>마이</span></button>
      </nav>
    </main>
  );
}
