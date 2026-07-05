"use client";

// 사주 용어 툴팁 — 용어에 밑줄+ⓘ, 탭하면 한 줄 설명 팝오버.
// 모바일 우선: 탭 토글 + 바깥 탭/ESC로 닫기, 다른 용어를 열면 기존 것은 자동으로 닫힘.
import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, INLINE_TERMS } from "./glossaryData";

const OPEN_EVENT = "wl-glossary:open";

export function GlossaryTerm({
  term,
  label,
  triggerClassName,
}: {
  term: string;
  label?: string;
  triggerClassName?: string;
}) {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== id) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOther as EventListener);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOther as EventListener);
    };
  }, [open, id]);

  // 사전에 없는 용어는 평범한 텍스트로(깨짐 방지)
  if (!entry) return <>{label ?? term}</>;

  return (
    <span className="gloss" ref={ref}>
      <button
        type="button"
        className={triggerClassName ? `${triggerClassName} gloss__trigger` : "gloss__term"}
        aria-expanded={open}
        aria-label={`${term} 뜻 보기`}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
            return next;
          });
        }}
      >
        {label ?? term}
        <span className="gloss__mark" aria-hidden="true">ⓘ</span>
      </button>
      {open && (
        <span className="gloss__pop" role="tooltip">
          <span className="gloss__pop-title">
            {term}
            {entry.hanja ? <span className="gloss__hanja">{entry.hanja}</span> : null}
          </span>
          <span className="gloss__pop-body">{entry.short}</span>
        </span>
      )}
    </span>
  );
}

// 본문 문장에서 알려진 용어를 찾아 자동으로 툴팁으로 감싼다(나머지는 그대로).
const TERM_RE = new RegExp(`(${INLINE_TERMS.join("|")})`, "g");

export function GlossaryText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(TERM_RE); // 캡처그룹 → 매칭 용어가 홀수 인덱스로 남는다
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <GlossaryTerm key={i} term={part} /> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
