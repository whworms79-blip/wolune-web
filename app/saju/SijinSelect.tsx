"use client";

// 태어난 시간 — 시진 커스텀 드롭다운.
// 네이티브 <select> 는 옵션 팝업이 브라우저 기본 스타일이라 Wolune 톤과 안 맞았다.
// 트리거 버튼 + 커스텀 팝오버로 바꿔, 시진명(강조)·일상어(보조)를 두 줄로 보이고
// 시간대(밤/새벽/아침/낮/저녁)별로 은은히 묶는다. 선택 항목은 골드로 강조.
//
// ⚠ sijin.ts 와 마찬가지로 분 단위 구간(19:30~21:30)은 절대 노출하지 않는다 — 일상어만.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SIJIN, type Sijin } from "../lib/sijin";

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// 시간대 묶음 — 목록에 조용한 구분선 + 소제목을 준다(하루의 흐름 순).
const GROUPS: { label: string; keys: string[] }[] = [
  { label: "밤", keys: ["ja", "hae"] },
  { label: "새벽", keys: ["chuk", "in", "myo"] },
  { label: "아침·낮", keys: ["jin", "sa", "o"] },
  { label: "오후", keys: ["mi", "sin"] },
  { label: "저녁", keys: ["yu", "sul"] },
];
// 하루 흐름대로 재배열(자시·해시는 밤으로 묶어 맨 위) — GROUPS 순서를 따른다.
const ORDERED: Sijin[] = GROUPS.flatMap((g) =>
  g.keys.map((k) => SIJIN.find((s) => s.key === k)!),
);

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`sijin-dd__chev${open ? " sijin-dd__chev--open" : ""}`}
    viewBox="0 0 24 24" width="14" height="14"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const Clock = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 1.8" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 6" />
  </svg>
);

export default function SijinSelect({
  value,
  onChange,
}: {
  value: string; // "" | "unknown" | 시진 key
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected =
    value === "unknown"
      ? { name: "시간 모름", daily: "" }
      : SIJIN.find((s) => s.key === value) ?? null;

  // 바깥 클릭·ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 열리면 선택된 항목이 보이도록 스크롤
  useIso(() => {
    if (!open || !listRef.current) return;
    const sel = listRef.current.querySelector<HTMLElement>("[data-selected='true']");
    sel?.scrollIntoView({ block: "nearest" });
  }, [open]);

  function pick(key: string) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div className="sijin-dd" ref={rootRef}>
      <button
        type="button"
        id="birth-sijin"
        className="wl-input sijin-dd__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sijin-dd__ico" aria-hidden="true"><Clock /></span>
        {selected ? (
          <span className="sijin-dd__val">
            <span className="sijin-dd__val-name">{selected.name}</span>
            {selected.daily && <span className="sijin-dd__val-daily">{selected.daily}</span>}
          </span>
        ) : (
          <span className="sijin-dd__placeholder">어느 시진에 태어나셨나요?</span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <div className="sijin-dd__pop" role="listbox" aria-label="태어난 시진" ref={listRef}>
          {/* 시간 모름 — 맨 위, 구분선으로 분리 */}
          <button
            type="button"
            role="option"
            aria-selected={value === "unknown"}
            data-selected={value === "unknown"}
            className={`sijin-dd__opt sijin-dd__opt--plain${value === "unknown" ? " sijin-dd__opt--on" : ""}`}
            onClick={() => pick("unknown")}
          >
            <span className="sijin-dd__opt-name">시간 모름</span>
            {value === "unknown" && <span className="sijin-dd__opt-check"><Check /></span>}
          </button>
          <div className="sijin-dd__div" />

          {GROUPS.map((g) => (
            <div className="sijin-dd__group" key={g.label}>
              <span className="sijin-dd__group-label">{g.label}</span>
              {g.keys.map((k) => {
                const s = ORDERED.find((x) => x.key === k)!;
                const on = value === s.key;
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    data-selected={on}
                    key={s.key}
                    className={`sijin-dd__opt${on ? " sijin-dd__opt--on" : ""}`}
                    onClick={() => pick(s.key)}
                  >
                    <span className="sijin-dd__opt-name">{s.name}</span>
                    <span className="sijin-dd__opt-daily">{s.daily}</span>
                    {on && <span className="sijin-dd__opt-check"><Check /></span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
