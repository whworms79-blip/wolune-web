"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DateField, { type DateValue } from "./DateField";
import ReturningHint from "./ReturningHint";
import {
  saveSajuInput,
  loadSajuInput,
  chartQuery,
  type SajuInput,
} from "../lib/sajuInput";
import { pad, parseTime, to12h } from "../lib/time";
import { SIJIN, sijinOfTime } from "../lib/sijin";
import SijinSelect from "./SijinSelect";
import { CITIES } from "../lib/cities";
import { saveConsent } from "../lib/consent";
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

export default function SajuInputPage() {
  const [birth, setBirth] = useState<DateValue>({ year: 1996, month: 3, day: 14 });
  // 위 생년월일은 예시(placeholder)일 뿐 — 사용자가 달력에서 실제로 고르기 전엔 제출을 막아
  // 남의 생일이 조용히 내 사주로 저장·전파되는 것을 방지한다.
  const [dateChosen, setDateChosen] = useState(false);
  const [showDateHint, setShowDateHint] = useState(false);
  // 개인정보 수집·이용 동의(필수) — 실제로 데이터를 저장하는 순간(첫 제출)에 한 번만 받는다.
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const agreed = agreePrivacy && agreeAge;
  // 태어난 시간: 기본은 시진(sijinKey) 선택. "정확한 시각을 알아요" 토글로 분까지.
  //   sijinKey === "" 면 미선택, "unknown" 이면 시간 모름.
  //   exactMode 가 켜지면 birthTime(오전/오후 HH:MM)이 우선한다.
  const [sijinKey, setSijinKey] = useState("");
  const [exactMode, setExactMode] = useState(false);
  const [birthTime, setBirthTime] = useState("오전 11:11");
  const [birthPlace, setBirthPlace] = useState("서울");
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"여성" | "남성">("여성");
  const [leapMonth, setLeapMonth] = useState(false);
  const [busy, setBusy] = useState(false);
  // 저장된 사주 확인 중(폼/결과 갈림) — 확인 전엔 폼을 깜빡 보여주지 않도록.
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const isLunar = calendar === "lunar";

  // 양력으로 돌아가면 윤달 해제(목업 로직과 동일)
  function selectCalendar(next: "solar" | "lunar") {
    setCalendar(next);
    if (next === "solar") setLeapMonth(false);
  }

  // 사주 탭 진입 처리(앱과 동일):
  // - 저장된 사주가 있고 편집(?edit=1)이 아니면 → 결과 뷰(/saju/result)로 이동(내 사주 바로 표시)
  // - 편집 모드면 → 저장값으로 폼을 채워 수정 가능하게
  // - 저장된 사주가 없으면(신규) → 빈 입력 폼
  useEffect(() => {
    let cancelled = false;
    const editMode =
      new URLSearchParams(window.location.search).get("edit") === "1";
    (async () => {
      const saved = await loadSajuInput();
      if (cancelled) return;
      if (saved && !editMode) {
        router.replace(`/saju/result?${chartQuery(saved).toString()}`);
        return; // 폼 대신 결과로 — checking 유지(스피너)
      }
      if (saved) {
        // 편집 모드: 저장값으로 폼 채우기
        const m = saved.date.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
        if (m) {
          setBirth({ year: +m[1], month: +m[2], day: +m[3] });
          setDateChosen(true);
        }
        // 편집 복귀 역매핑: 저장된 시각이 시진 중간값과 정확히 일치하면 시진 모드로,
        // 아니면 정확한 시각(exact) 모드로 되살린다.
        if (saved.time) {
          const s = sijinOfTime(saved.time);
          if (s) {
            setSijinKey(s.key);
            setExactMode(false);
          } else {
            setExactMode(true);
            setBirthTime(to12h(saved.time) || saved.time);
          }
        } else {
          setSijinKey("unknown");
        }
        if (saved.city) setBirthPlace(saved.city);
        setGender(saved.gender === "male" ? "남성" : "여성");
        setCalendar(saved.calendar);
        setLeapMonth(!!saved.is_leap_month);
      }
      setChecking(false); // 폼 표시(신규 또는 편집)
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ── 태어난 시간 → 엔진에 넘길 HH:MM ──
  // exact 모드면 분까지 입력한 값, 아니면 고른 시진의 중간값. "시간 모름"이면 undefined(시주 제외).
  const unknownTime = sijinKey === "unknown";
  function resolveTime(): string | undefined {
    if (unknownTime) return undefined;
    if (exactMode) return parseTime(birthTime) || undefined;
    const s = SIJIN.find((x) => x.key === sijinKey);
    return s?.mid; // 중간값(HH:MM) — 진태양시 보정 후에도 같은 시진에 남는다(실측)
  }
  // 시간을 아직 안 정했으면(시진 미선택 && exact 아님) 제출을 막기 위한 플래그
  const timeChosen = unknownTime || exactMode || sijinKey !== "";

  // 입력값을 엔진 형식으로 변환 → /saju/result로 이동(결과 페이지가 서버에서 엔진 호출)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    // 생년월일을 실제로 고르지 않았으면 제출 차단(예시값이 그대로 저장되는 것을 방지)
    if (!dateChosen) {
      setShowDateHint(true);
      return;
    }
    setBusy(true);

    const time = resolveTime();
    const input: SajuInput = {
      date: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
      time, // 모름/미입력이면 생략(엔진 기본 00:00)
      city: birthPlace.trim() || undefined,
      gender: gender === "남성" ? "male" : "female",
      calendar: isLunar ? "lunar" : "solar",
      is_leap_month: isLunar && leapMonth ? true : undefined,
    };

    // 동의 기록을 먼저 남기고(입증용), 그 다음에 사주를 저장한다.
    await saveConsent();
    await saveSajuInput(input); // 홈(/home)에서 매번 재입력 없이 불러오도록 저장
    router.push(`/saju/result?${chartQuery(input).toString()}`);
  }

  // 저장 사주 확인 중(신규는 폼, 기존은 결과로 이동) — 잠깐 로딩만 표시.
  if (checking) {
    return (
      <main className="screen">
        <div className="screen__scroll saju-checking">
          <span className="saju-checking__ring" aria-label="불러오는 중" />
        </div>
      </main>
    );
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

        {/* 익명 상태에서 사주를 새로 입력하려는 순간 — 무심코 새 계정으로 다시 시작하는 걸
            여기서 막는다. 겁주지 않고, 강요하지 않고, 그냥 알려준다.
            (로그인한 사용자에겐 보이지 않는다) */}
        <ReturningHint />

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

          {/* 2. 태어난 시간 — 기본은 시진 선택, 정확한 시각은 옵션 */}
          <div className="wl-field">
            <label className="wl-field__label" htmlFor="birth-sijin">
              태어난 시간
            </label>

            {/* 시진 선택(기본) — exact 모드가 아닐 때만. 커스텀 드롭다운(SijinSelect) */}
            {!exactMode && (
              <SijinSelect value={sijinKey} onChange={setSijinKey} />
            )}

            {/* 정확한 시각(옵션) — 오전/오후 + HH:MM */}
            {exactMode && (
              <div className="input-wrap">
                <span className="input-wrap__icon" aria-hidden="true">
                  <ClockIcon />
                </span>
                <input
                  className="wl-input"
                  id="birth-time"
                  type="text"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  placeholder="예: 오전 11:11"
                  autoFocus
                />
              </div>
            )}

            {/* 토글: 시진 ↔ 정확한 시각 */}
            <button
              type="button"
              className="sijin-link"
              aria-pressed={exactMode}
              onClick={() => setExactMode((v) => !v)}
            >
              <ClockHint />
              {exactMode ? "시진으로 고를게요" : "정확한 시각을 알아요"}
            </button>

            {/* 시진을 골랐을 때: 정밀함으로 유도하는 안내(겁주지 않게) */}
            {!exactMode && sijinKey !== "" && sijinKey !== "unknown" && (
              <p className="wl-caption wl-text-tertiary saju-time-note">
                시진만으로도 볼 수 있어요. 정확한 시각을 아시면 진태양시로 더 정밀하게 계산해요.
              </p>
            )}
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
              태어난 시각·장소는 정확한 계산에만 쓰고, 안전하게 보관해요.{" "}
              <Link className="privacy__link" href="/privacy">
                개인정보처리방침
              </Link>
            </p>
          </div>

          {/* 동의 — 버튼 바로 위에 담백하게. 골드 버튼보다 시각적으로 앞서지 않게 muted. */}
          <div className="consent">
            <label className="consent__row">
              <input
                type="checkbox"
                className="consent__box"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />
              <span className="consent__text">
                <span className="consent__lead">
                  개인정보 수집·이용에 동의합니다. <span className="consent__req">필수</span>
                </span>
                <span className="consent__desc">
                  생년월일·태어난 시각·태어난 곳·성별을 사주 계산과 기록 보관에 사용해요.{" "}
                  <Link className="consent__link" href="/privacy" target="_blank">
                    자세히
                  </Link>
                </span>
              </span>
            </label>
            <label className="consent__row">
              <input
                type="checkbox"
                className="consent__box"
                checked={agreeAge}
                onChange={(e) => setAgreeAge(e.target.checked)}
              />
              <span className="consent__text">
                <span className="consent__lead">
                  만 14세 이상입니다. <span className="consent__req">필수</span>
                </span>
              </span>
            </label>
          </div>

          {/* CTA — 누르면 입력값으로 /saju/result 이동(서버가 엔진 호출) */}
          <div className="saju-cta">
            <button
              type="submit"
              className="wl-btn wl-btn--primary wl-btn--moonlit"
              disabled={busy || !agreed || !timeChosen}
            >
              <MoonIcon /> {busy ? "계산하는 중…" : "내 사주 보기"}
            </button>
            {/* 비활성 사유를 은은하게 알려준다(동의 → 날짜 순으로 한 줄만) */}
            {!busy && !agreed && (
              <p className="saju-cta__note">위 두 가지에 동의하시면 사주를 봐드릴게요.</p>
            )}
            {showDateHint && (
              <p className="saju-cta__note" role="alert">먼저 생년월일을 선택해 주세요.</p>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
