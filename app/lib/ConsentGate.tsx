"use client";

// 동의 게이트 — 기존 사용자(consent 없는 uid)와 방침 개정 시 재동의를 받는 장치.
//
// 정책:
//   · 읽기는 허용 — 이미 저장된 사주·기록을 보는 건 동의 없이도 가능(기존 사용자를 쫓아내지 않는다).
//   · 쓰기는 차단 — 새 데이터를 저장하려는 순간(무드 기록·궁합 등) 시트를 띄우고, 동의해야 저장.
//   · 홈 진입 시 한 번 부드럽게 권한다. "나중에"로 닫을 수 있다(전면 차단 아님).
//
// 사용:
//   const { requestConsent, promptIfNeeded } = useConsent();
//   if (!(await requestConsent())) return;   // ← 저장 직전에 호출
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { hasCurrentConsent, saveConsent } from "./consent";

interface ConsentApi {
  /** 저장 직전에 호출. 이미 동의했으면 즉시 true. 아니면 시트를 띄우고 결과를 기다린다. */
  requestConsent: () => Promise<boolean>;
  /** 홈 진입 시 부드럽게 한 번 권한다(닫아도 그만). */
  promptIfNeeded: () => void;
}

const Ctx = createContext<ConsentApi>({
  requestConsent: async () => true,
  promptIfNeeded: () => {},
});

export function useConsent(): ConsentApi {
  return useContext(Ctx);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  // null = 아직 확인 전
  const [consented, setConsented] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [saving, setSaving] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    let alive = true;
    hasCurrentConsent().then((ok) => {
      if (alive) setConsented(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const openSheet = useCallback(() => {
    setAgreePrivacy(false);
    setAgreeAge(false);
    setOpen(true);
  }, []);

  const requestConsent = useCallback(async (): Promise<boolean> => {
    // 확인 전이면 지금 확인
    const ok = consented ?? (await hasCurrentConsent());
    if (ok) {
      setConsented(true);
      return true;
    }
    openSheet();
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [consented, openSheet]);

  const promptIfNeeded = useCallback(() => {
    // 홈 진입용 — 결과를 기다리지 않는다(닫아도 그만)
    void requestConsent();
  }, [requestConsent]);

  function settle(ok: boolean) {
    setOpen(false);
    resolverRef.current?.(ok);
    resolverRef.current = null;
  }

  async function onAgree() {
    if (saving) return;
    setSaving(true);
    await saveConsent();
    setConsented(true);
    setSaving(false);
    settle(true);
  }

  const agreed = agreePrivacy && agreeAge;

  return (
    <Ctx.Provider value={{ requestConsent, promptIfNeeded }}>
      {children}
      {open && (
        <div
          className="consent-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
        >
          {/* 배경 탭 = 나중에(강요하지 않는다) */}
          <button
            type="button"
            className="consent-overlay__scrim"
            aria-label="나중에"
            onClick={() => settle(false)}
          />
          <div className="consent-sheet">
            <span className="consent-sheet__grip" aria-hidden="true" />
            <h2 className="consent-sheet__title" id="consent-title">
              확인 한 번만 받을게요
            </h2>
            <p className="consent-sheet__lead">
              기록을 남기려면 개인정보 수집·이용에 대한 동의가 필요해요.
              이미 보고 계신 사주와 기록은 그대로 두셔도 됩니다.
            </p>

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
                    개인정보 수집·이용에 동의합니다.{" "}
                    <span className="consent__req">필수</span>
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

            <button
              type="button"
              className="wl-btn wl-btn--primary consent-sheet__cta"
              disabled={!agreed || saving}
              onClick={onAgree}
            >
              {saving ? "저장하는 중…" : "동의하고 계속"}
            </button>
            <button
              type="button"
              className="consent-sheet__later"
              onClick={() => settle(false)}
            >
              나중에
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
