"use client";

import { useEffect, useRef, useState } from "react";

export interface DateValue {
  year: number;
  month: number; // 1-12
  day: number;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const firstWeekday = (y: number, m: number) => new Date(y, m - 1, 1).getDay();

const svg = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const CalIcon = () => (
  <svg viewBox="0 0 24 24" {...svg}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M4 11h16" />
  </svg>
);
const PrevIcon = () => (<svg viewBox="0 0 24 24" {...svg}><path d="M15 6l-6 6 6 6" /></svg>);
const NextIcon = () => (<svg viewBox="0 0 24 24" {...svg}><path d="M9 6l6 6-6 6" /></svg>);

export default function DateField({
  value,
  onChange,
}: {
  value: DateValue;
  onChange: (v: DateValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: value.year, month: value.month });
  const rootRef = useRef<HTMLDivElement>(null);

  // 열 때 현재 선택값으로 달력 뷰 동기화
  useEffect(() => {
    if (open) setView({ year: value.year, month: value.month });
  }, [open, value.year, value.month]);

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 연도 목록: 올해 → 1920 (생년월일용). 팝오버 열릴 때만 렌더되어 SSR 불일치 없음
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1920; y--) years.push(y);

  function stepMonth(delta: number) {
    setView((v) => {
      let m = v.month + delta;
      let y = v.year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      if (y < 1920) { y = 1920; m = 1; }
      if (y > currentYear) { y = currentYear; m = 12; }
      return { year: y, month: m };
    });
  }

  function pick(day: number) {
    onChange({ year: view.year, month: view.month, day });
    setOpen(false);
  }

  const nDays = daysInMonth(view.year, view.month);
  const lead = firstWeekday(view.year, view.month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= nDays; d++) cells.push(d);

  return (
    <div className="datepicker" ref={rootRef}>
      <div className="input-wrap">
        <span className="input-wrap__icon" aria-hidden="true"><CalIcon /></span>
        <button
          type="button"
          className="wl-input datepicker__trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="datepicker__value">
            {value.year}년 {value.month}월 {value.day}일
          </span>
        </button>
      </div>

      {open && (
        <div className="datepicker__pop" role="dialog" aria-label="생년월일 선택">
          <div className="datepicker__head">
            <button type="button" className="datepicker__nav" onClick={() => stepMonth(-1)} aria-label="이전 달">
              <PrevIcon />
            </button>
            <div className="datepicker__selects">
              <select
                className="datepicker__select"
                aria-label="연도"
                value={view.year}
                onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                className="datepicker__select"
                aria-label="월"
                value={view.month}
                onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>
            <button type="button" className="datepicker__nav" onClick={() => stepMonth(1)} aria-label="다음 달">
              <NextIcon />
            </button>
          </div>

          <div className="datepicker__grid" role="grid">
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`datepicker__wd${i === 0 ? " datepicker__wd--sun" : ""}${i === 6 ? " datepicker__wd--sat" : ""}`}
              >
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) {
                return <span key={`e${i}`} className="datepicker__day datepicker__day--empty" aria-hidden="true" />;
              }
              const wd = (lead + d - 1) % 7;
              const selected =
                value.year === view.year && value.month === view.month && value.day === d;
              return (
                <button
                  key={d}
                  type="button"
                  className={`datepicker__day${wd === 0 ? " datepicker__day--sun" : ""}${wd === 6 ? " datepicker__day--sat" : ""}${selected ? " datepicker__day--selected" : ""}`}
                  onClick={() => pick(d)}
                  aria-pressed={selected}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
