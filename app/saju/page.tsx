"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DateField, { type DateValue } from "./DateField";
import { saveSajuInput, chartQuery, type SajuInput } from "../lib/sajuInput";
import { pad, parseTime } from "../lib/time";
import { CITIES } from "../lib/cities";
import "./saju.css";

/* ---------- 인라인 아이콘(Tabler 톤, currentColor 스트로크) ---------- */
type IconProps = { className?: string };
const ico = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M18 11.5c0 4-6 9.5-6 9.5s-6-5.5-6-9.5a6 6 0 0 1 12 0Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9.5 12l1.8 1.8 3.2-3.4" />
    </svg>
  );
}
function ClockHint() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 1.8" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ico}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function MoonIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" {...ico}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

/* 상단 달 마크 — 초승달이 작은 점(별)을 품은 형태 (목업과 동일) */
function IntroMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path d="M21 4.2A11 11 0 1 0 25.8 19 8.2 8.2 0 0 1 21 4.2Z" fill="var(--gold)" />
      <circle cx="19.5" cy="10.5" r="2.3" fill="var(--text-primary)" />
    </svg>
  );
}

const SIJIN = [
  ["자시", "23:30~01:30"], ["축시", "01:30~03:30"],
  ["인시", "03:30~05:30"], ["묘시", "05:30~07:30"],
  ["진시", "07:30~09:30"], ["사시", "09:30~11:30"],
  ["오시", "11:30~13:30"], ["미시", "13:30~15:30"],
  ["신시", "15:30~17:30"], ["유시", "17:30~19:30"],
  ["술시", "19:30~21:30"], ["해시", "21:30~23:30"],
];

export default function SajuInputPage() {
  const [birth, setBirth] = useState<DateValue>({ year: 1996, month: 3, day: 14 });
  // 위 생년월일은 예시(placeholder)일 뿐 — 사용자가 달력에서 실제로 고르기 전엔 제출을 막아
  // 남의 생일이 조용히 내 사주로 저장·전파되는 것을 방지한다.
  const [dateChosen, setDateChosen] = useState(false);
  const [showDateHint, setShowDateHint] = useState(false);
  const [birthTime, setBirthTime] = useState("오전 11:11");
  const [birthPlace, setBirthPlace] = useState("서울");
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"여성" | "남성">("여성");
  const [unknownTime, setUnknownTime] = useState(false);
  const [leapMonth, setLeapMonth] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const isLunar = calendar === "lunar";

  // 양력으로 돌아가면 윤달 해제(목업 로직과 동일)
  function selectCalendar(next: "solar" | "lunar") {
    setCalendar(next);
    if (next === "solar") setLeapMonth(false);
  }

  // 모달 ESC 닫기
  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // 입력값을 엔진 형식으로 변환 → /saju/result로 이동(결과 페이지가 서버에서 엔진 호출)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    // 생년월일을 실제로 고르지 않았으면 제출 차단(예시값이 그대로 저장되는 것을 방지)
    if (!dateChosen) {
      setShowDateHint(true);
      return;
    }
    setBusy(true);

    const time = unknownTime ? undefined : parseTime(birthTime) || undefined;
    const input: SajuInput = {
      date: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
      time, // 모름/미입력이면 생략(엔진 기본 00:00)
      city: birthPlace.trim() || undefined,
      gender: gender === "남성" ? "male" : "female",
      calendar: isLunar ? "lunar" : "solar",
      is_leap_month: isLunar && leapMonth ? true : undefined,
    };

    saveSajuInput(input); // 홈(/home)에서 매번 재입력 없이 불러오도록 저장
    router.push(`/saju/result?${chartQuery(input).toString()}`);
  }

  return (
    <main className="screen">
      <div className="screen__scroll">
        {/* 상단 중앙: 달 마크 + 인사 */}
        <header className="intro">
          <span className="intro__mark" aria-hidden="true">
            <IntroMark />
          </span>
          <h1 className="intro__title">만나서 반가워요</h1>
          <p className="wl-body wl-text-secondary intro__sub">
            당신을 알아가기 위해, 태어난 순간을 알려주세요
          </p>
        </header>

        <form className="form" autoComplete="off" onSubmit={handleSubmit}>
          {/* 1. 생년월일 + 양/음력 + (음력 시) 윤달 */}
          <div className="wl-field">
            <span className="wl-field__label">생년월일</span>
            <DateField
              value={birth}
              onChange={(v) => {
                setBirth(v);
                setDateChosen(true);
                setShowDateHint(false);
              }}
            />

            <div
              className="wl-segmented cal-seg"
              role="group"
              aria-label="달력 기준"
            >
              <button
                type="button"
                className={`wl-segmented__item${
                  !isLunar ? " wl-segmented__item--selected" : ""
                }`}
                aria-pressed={!isLunar}
                onClick={() => selectCalendar("solar")}
              >
                양력
              </button>
              <button
                type="button"
                className={`wl-segmented__item${
                  isLunar ? " wl-segmented__item--selected" : ""
                }`}
                aria-pressed={isLunar}
                onClick={() => selectCalendar("lunar")}
              >
                음력
              </button>
            </div>

            {isLunar && (
              <p className="cal-hint wl-caption wl-text-tertiary">
                <MoonIcon />
                <span>위 생년월일을 음력 날짜로 입력해주세요</span>
              </p>
            )}

            {isLunar && (
              <>
                <div className="leap-row">
                  <span className="wl-body-s wl-text-secondary">
                    윤달(閏月)로 태어났어요
                  </span>
                  <button
                    type="button"
                    className="wl-toggle"
                    role="switch"
                    aria-checked={leapMonth}
                    aria-label="윤달 여부"
                    onClick={() => setLeapMonth((v) => !v)}
                  />
                </div>
                <p className="leap-hint wl-caption wl-text-tertiary">
                  윤달에 태어났다면 켜주세요
                </p>
              </>
            )}
          </div>

          {/* 2. 태어난 시간 + 모름 칩 */}
          <div className="wl-field">
            <label className="wl-field__label" htmlFor="birth-time">
              태어난 시간
            </label>
            <div className="time-row">
              <div className="input-wrap">
                <span className="input-wrap__icon" aria-hidden="true">
                  <ClockIcon />
                </span>
                <input
                  className="wl-input"
                  id="birth-time"
                  type="text"
                  value={unknownTime ? "" : birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  placeholder="예: 오전 11:11"
                  disabled={unknownTime}
                />
              </div>
              <button
                type="button"
                className={`wl-chip${unknownTime ? " wl-chip--selected" : ""}`}
                aria-pressed={unknownTime}
                onClick={() => setUnknownTime((v) => !v)}
              >
                모름
              </button>
            </div>
            <button
              type="button"
              className="sijin-link"
              onClick={() => setModalOpen(true)}
            >
              <ClockHint /> 12간지 시간표 보기
            </button>
          </div>

          {/* 3. 태어난 곳 — 앱과 동일하게 목록에서만 선택(엔진이 아는 도시 → 진태양시 보정 정확) */}
          <div className="wl-field">
            <label className="wl-field__label" htmlFor="birth-place">
              태어난 곳
            </label>
            <div className="input-wrap">
              <span className="input-wrap__icon" aria-hidden="true">
                <MapPinIcon />
              </span>
              <select
                className="wl-input city-select"
                id="birth-place"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <p className="wl-caption wl-text-tertiary" style={{ marginTop: 6 }}>
              목록에 없으면 가장 가까운 도시를 골라주세요. 인근 도시면 결과가 거의 같아요.
            </p>
          </div>

          {/* 4. 성별 세그먼트 */}
          <div className="wl-field">
            <span className="wl-field__label" id="gender-label">
              성별
            </span>
            <div
              className="wl-segmented"
              role="group"
              aria-labelledby="gender-label"
            >
              {(["여성", "남성"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`wl-segmented__item${
                    gender === g ? " wl-segmented__item--selected" : ""
                  }`}
                  aria-pressed={gender === g}
                  onClick={() => setGender(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 개인정보 안내 */}
          <div className="privacy">
            <span className="privacy__icon" aria-hidden="true">
              <ShieldIcon />
            </span>
            <p className="wl-body-s wl-text-secondary">
              태어난 시각·장소는 정확한 계산에만 쓰고, 안전하게 보관해요.
            </p>
          </div>

          {/* CTA — 누르면 입력값으로 /saju/result 이동(서버가 엔진 호출) */}
          <div className="cta">
            <button type="submit" className="wl-btn wl-btn--primary wl-btn--moonlit" disabled={busy}>
              <MoonIcon /> {busy ? "계산하는 중…" : "내 사주 보기"}
            </button>
            {showDateHint && (
              <p className="cta__note" role="alert">먼저 생년월일을 선택해 주세요.</p>
            )}
          </div>
        </form>
      </div>

      {/* 12간지 시간표 모달 */}
      {modalOpen && (
        <div className="sijin-modal">
          <div
            className="sijin-modal__backdrop"
            onClick={() => setModalOpen(false)}
          />
          <div
            className="sijin-modal__card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sijin-title"
          >
            <div className="sijin-modal__head">
              <h2 className="wl-title-m" id="sijin-title">
                12간지 시간표
              </h2>
              <button
                type="button"
                className="sijin-modal__close"
                aria-label="닫기"
                onClick={() => setModalOpen(false)}
              >
                <XIcon />
              </button>
            </div>
            <p className="wl-caption wl-text-tertiary sijin-modal__note">
              시간대는 대략값이에요 — 진태양시 보정 전 기준이라, 시진 경계
              근처라면 앞뒤로 함께 살펴보세요.
            </p>
            <ul className="sijin-grid">
              {SIJIN.map(([name, time]) => (
                <li key={name}>
                  <span className="sijin-grid__name">{name}</span>
                  <span className="sijin-grid__time">{time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
