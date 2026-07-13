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
  encodePerson,
  type CompatChart,
  type CompatView,
} from "../lib/compatibility";
import CompatResult from "./CompatResult";
import { pad, parseTime, to12h } from "../lib/time";
import { CITIES } from "../lib/cities";
import "./compatibility.css";

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
const ShareIcon = () => (<svg viewBox="0 0 24 24" {...ico}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>);
const LinkIcon = () => (<svg viewBox="0 0 24 24" {...ico}><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" /></svg>);
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
  | { status: "result"; view: CompatView; shareA: string; shareB: string }
  | { status: "error" };

export default function CompatibilityPage() {
  const [me, setMe] = useState<PersonState>(DEFAULT_ME);
  const [you, setYou] = useState<PersonState>(DEFAULT_YOU);
  const [phase, setPhase] = useState<Phase>({ status: "form" });
  const [savedHref, setSavedHref] = useState("/saju");
  const [copied, setCopied] = useState(false);

  // 저장된 내 사주가 있으면 '나' 자동 채움 + 사주 탭 링크 준비
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSajuInput();
      if (cancelled || !saved) return;
      setMe(fromSaved(saved));
      setSavedHref(`/saju/result?${chartQuery(saved).toString()}`);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase.status === "loading") return;
    setPhase({ status: "loading" });

    const inA = toInput(me);
    const inB = toInput(you);
    void saveSajuInput(inA); // 내 정보는 저장 → 다음 방문 자동 채움(백그라운드)

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
      // 공유 링크용 파라미터(두 사람 입력을 URL에 담는다) — 결과 화면 공유 버튼에서 사용
      const shareA = encodePerson(me.name, inA);
      const shareB = encodePerson(you.name, inB);
      setPhase({ status: "result", view, shareA, shareB });
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch {
      setPhase({ status: "error" });
    } finally {
      clearTimeout(timer);
    }
  }

  // 결과 공유: 웹 공유 API(모바일 공유 시트) 우선, 없으면 링크 복사
  async function handleShare(shareA: string, shareB: string) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/compatibility/share?a=${shareA}&b=${shareB}`;
    const title = "우리 둘의 궁합 — Wolune";
    const text = "생일만으로 보는 두 사람의 결. 나도 궁금하다면?";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* 사용자가 공유 시트를 취소 — 조용히 넘어감 */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* 클립보드 불가(권한 등) — 그래도 안내는 띄운다 */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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
          <CompatResult
            view={phase.view}
            footer={
              <>
                <div className="compat-actions">
                  <button
                    className="wl-btn wl-btn--rose"
                    type="button"
                    onClick={() => handleShare(phase.shareA, phase.shareB)}
                  >
                    <ShareIcon /> {copied ? "링크가 복사됐어요!" : "결과 공유하기"}
                  </button>
                  <button
                    className="wl-btn wl-btn--ghost"
                    type="button"
                    onClick={() => setPhase({ status: "form" })}
                  >
                    <HeartLine /> 다른 사람과 다시 보기
                  </button>
                </div>
                <p className="wl-caption share-note">
                  <LinkIcon /> 링크를 받은 친구는 가입 없이 바로 볼 수 있어요
                </p>
              </>
            }
          />
        </div>
      )}

      {/* 하단 4탭 (궁합은 별도 탭이 아니라 사주 탭 계열 진입 — 활성 표시는 두지 않음) */}
      <nav className="home__nav wl-bottom-nav" aria-label="주요 메뉴">
        <Link className="wl-bottom-nav__tab" href="/home"><Moon /><span>오늘</span></Link>
        <Link className="wl-bottom-nav__tab" href="/journal"><Notebook /><span>기록</span></Link>
        <Link className="wl-bottom-nav__tab" href={savedHref}><LayoutGrid /><span>사주</span></Link>
        <Link className="wl-bottom-nav__tab" href="/my"><UserIcon /><span>마이</span></Link>
      </nav>
    </main>
  );
}
