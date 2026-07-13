"use client";

// 사주 용어 툴팁 — 용어에 밑줄+ⓘ, 탭하면 한 줄 설명 팝오버.
// 모바일 우선: 탭 토글 + 바깥 탭/ESC로 닫기, 다른 용어를 열면 기존 것은 자동으로 닫힘.
//
// 사전 내용은 엔진(GET /v1/glossary)에서 온다. 서버 컴포넌트가 lib/glossary.ts 로 받아
// <GlossaryProvider> 로 내려주고, 여기서는 그걸 읽기만 한다 — 클라이언트는 사전을
// 따로 받아오지 않는다(요청 0회).
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GlossaryData, GlossTerm } from "../../lib/glossary";

const OPEN_EVENT = "wl-glossary:open";

interface GlossaryCtx {
  terms: Record<string, GlossTerm>;
  inline: string[];
}

// 프로바이더가 없어도 화면이 깨지진 않는다(용어는 평범한 텍스트로 렌더).
const Ctx = createContext<GlossaryCtx>({ terms: {}, inline: [] });

export function GlossaryProvider({
  data,
  children,
}: {
  data: GlossaryData;
  children: React.ReactNode;
}) {
  const value = useMemo<GlossaryCtx>(() => {
    const terms: Record<string, GlossTerm> = {};
    for (const t of data.terms) terms[t.key] = t;
    return { terms, inline: data.inline_terms };
  }, [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// SSR에서 useLayoutEffect 경고를 피하면서 클라이언트에선 페인트 전에 위치 보정.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function GlossaryTerm({
  term,
  label,
  triggerClassName,
}: {
  term: string;
  label?: string;
  triggerClassName?: string;
}) {
  const entry = useContext(Ctx).terms[term];
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);

  // 팝오버가 화면 밖으로 넘치면(overflow-x: clip에 잘림) 뷰포트 안으로 민다.
  useIsoLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return;
    const t = btnRef.current.getBoundingClientRect();
    const w = popRef.current.offsetWidth; // transform 영향 없는 실제 폭
    const centerX = t.left + t.width / 2;
    const margin = 10;
    let s = 0;
    if (centerX - w / 2 < margin) s = margin - (centerX - w / 2);
    else if (centerX + w / 2 > window.innerWidth - margin)
      s = window.innerWidth - margin - (centerX + w / 2);
    setShift(s);
  }, [open]);

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
        ref={btnRef}
        type="button"
        className={triggerClassName ? `${triggerClassName} gloss__trigger` : "gloss__term"}
        aria-expanded={open}
        aria-label={`${term} 뜻 보기`}
        onClick={() => {
          setShift(0); // 새로 열 때 보정값 초기화(정확한 측정을 위해)
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
        <span
          className="gloss__pop"
          role="tooltip"
          ref={popRef}
          style={shift ? { transform: `translateX(calc(-50% + ${shift}px))` } : undefined}
        >
          <span className="gloss__pop-title">
            {entry.name}
            {entry.hanja ? <span className="gloss__hanja">{entry.hanja}</span> : null}
          </span>
          <span className="gloss__pop-body">{entry.short}</span>
        </span>
      )}
    </span>
  );
}

// 본문 문장에서 알려진 용어를 찾아 자동으로 툴팁으로 감싼다(나머지는 그대로).
// 어떤 용어를 자동으로 잡을지는 엔진이 정한다(inline_terms) — 한 글자 용어(형·파·쇠…)는
// 본문에서 오탐이 나므로 엔진이 빼고 준다.
export function GlossaryText({ text }: { text: string }) {
  const { inline } = useContext(Ctx);
  const re = useMemo(
    () => (inline.length ? new RegExp(`(${inline.join("|")})`, "g") : null),
    [inline],
  );
  if (!text) return null;
  if (!re) return <>{text}</>;
  const parts = text.split(re); // 캡처그룹 → 매칭 용어가 홀수 인덱스로 남는다
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <GlossaryTerm key={i} term={part} /> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
