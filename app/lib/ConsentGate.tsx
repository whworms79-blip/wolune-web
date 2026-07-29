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
import { readConsent, saveConsent, type ConsentStatus } from "./consent";
import { ensureSignedIn, onAuthChange } from "./firebase";

interface ConsentApi {
  /** 저장 직전에 호출. 이미 동의했으면 즉시 true. 아니면 시트를 띄우고 결과를 기다린다. */
  requestConsent: () => Promise<boolean>;
  /** 홈 진입 시 부드럽게 한 번 권한다(닫아도 그만). */
  promptIfNeeded: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔬 임시 계측 (2026-07-28) — "새 시크릿에서 동의 시트가 또 뜨는" 원인 추적용.
//    원인 확정 후 **이 블록과 wlog(...) 호출을 전부 지운다.** grep: "🔬 임시 계측"
//    OAuth 흐름은 자동화가 안 되고, status 가 "no" 로 굳는 순간을 로컬에서 재현하지 못해
//    라이브 콘솔로만 관측할 수 있다.
const wlog = (...a: unknown[]) => {
  try {
    console.log("[wl]", ...a);
  } catch {
    /* 무시 */
  }
};
// ─────────────────────────────────────────────────────────────────────────────

const Ctx = createContext<ConsentApi>({
  requestConsent: async () => true,
  promptIfNeeded: () => {},
});

export function useConsent(): ConsentApi {
  return useContext(Ctx);
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  // "unknown" = 아직 모른다(확인 전이거나 읽기 실패). "no" 와 구분한다 — 아래 정책 참고.
  const [status, setStatus] = useState<ConsentStatus>("unknown");
  const [open, setOpen] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);
  // 지금 계정 — onAuthChange 가 알려준 **가장 마지막** uid 를 동기적으로 담아둔다.
  // 판정이 돌아왔을 때 "이 답이 지금 계정 것인가"를 가리는 기준이다.
  const currentUidRef = useRef<string | null>(null);

  // 로그인/로그아웃/전환으로 **uid 가 바뀔 때마다** 지금 계정 기준으로 동의를 다시 확인한다.
  //
  // ★ 왜 필요한가: 이 Provider 는 루트 레이아웃 상주라 클라이언트 이동으론 재마운트되지 않는다.
  //   예전엔 마운트 때 딱 한 번만 확인해서, 익명 상태에서 잡힌 consented=false 가 로그인 뒤에도
  //   남았다. 그래서 **이미 동의한 계정**으로 로그인했는데도 동의 시트가 떴다(특히 카카오 —
  //   콜백이 새 페이지라 익명 상태에서 마운트 → false 고정 → 로그인돼도 재확인 없음).
  //   판정은 구글·카카오 공통으로 여기 한 곳에서만 한다(로그인 경로마다 따로 손대지 않게).
  //
  // onAuthChange(onAuthStateChanged)는 구독 즉시 현재 사용자로 한 번, 이후 전환마다 발화한다.
  // 전환 순간 consented 를 null(미확인)로 되돌려, 재확인이 끝나기 전 요청도 지금 계정 기준으로
  // 새로 읽게 한다(낡은 값 사용 방지). 신규·미동의 계정은 여전히 false → 시트 정상 노출(법적 요건).
  useEffect(() => {
    let alive = true;
    wlog("provider mount, path =", typeof window !== "undefined" ? location.pathname : "?");
    const unsub = onAuthChange((u) => {
      if (!alive) return;
      const uid = u?.uid ?? null;
      wlog(
        "auth fire  uid =", uid,
        " anon =", (u as { isAnonymous?: boolean } | null)?.isAnonymous,
        " path =", typeof window !== "undefined" ? location.pathname : "?",
      );
      currentUidRef.current = uid; // ★ 동기적으로 먼저 갱신 — 착지 대조의 기준점
      setStatus("unknown");
      // 로그아웃 상태에선 읽지 않는다. (예전엔 여기서 hasCurrentConsent 가
      //  ensureSignedIn 을 불러 **판정이 익명 계정을 만들어냈다.**)
      if (!uid) return;
      wlog("read issued  ", uid);
      readConsent(uid).then((v) => {
        if (!alive) {
          wlog("land(dead)   ", v.uid, "=>", v.status);
          return;
        }
        wlog(
          "land         ", v.uid, "=>", v.status,
          " | ref =", currentUidRef.current,
          v.uid === currentUidRef.current ? " → 반영" : " → 폐기",
        );
        // ★★ 이 답이 **지금 계정** 것일 때만 반영한다.
        //
        // 로그아웃→재로그인은 uid 가 null → 새 익명 A2 → 카카오 X 로 연달아 바뀌고,
        // 발화마다 뜬 판정들의 완료 순서는 보장되지 않는다. 게다가 A2 판정은 uid 가 X 로
        // 바뀐 뒤 옛 문서 읽기가 보안 규칙에 걸려 **늦게** 실패하는 경향이 있다.
        // 예전엔 늦게 착지한 답이 이겨서, 이미 동의한 계정에 시트가 다시 떴다.
        //
        // 이 한 줄로 판정 기준이 "언제 도착했나" → "누구에 대한 답인가" 로 바뀐다.
        // 착지 순서가 어떻든 결과가 같아진다(확률을 낮추는 게 아니라 변수를 없앤다).
        if (v.uid !== currentUidRef.current) return;
        setStatus(v.status);
      });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const openSheet = useCallback(() => {
    setAgreePrivacy(false);
    setAgreeAge(false);
    setSaveFailed(false);
    setOpen(true);
  }, []);

  // 저장 직전 게이트 — **엄격하게.** "yes" 가 아니면 통과시키지 않는다.
  // "unknown"(읽기 실패 등)이면 지금 한 번 더 읽어보고, 그래도 모르면 시트를 띄운다.
  // 동의를 확인하지 못한 채로 개인정보를 저장하지 않는다(법적 요건).
  const requestConsent = useCallback(async (): Promise<boolean> => {
    wlog("requestConsent  status =", status, " ref =", currentUidRef.current);
    if (status === "yes") return true;
    if (status === "unknown") {
      // 저장하려는 순간이라 계정이 없으면 만든다(쓰기 경로).
      const uid = currentUidRef.current ?? (await ensureSignedIn());
      const v = await readConsent(uid);
      // 여기서도 같은 대조 — 재확인하는 사이에 계정이 또 바뀌었을 수 있다.
      if (v.uid === currentUidRef.current) setStatus(v.status);
      if (v.status === "yes") return true;
    }
    openSheet();
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, [status, openSheet]);

  // 홈 진입용 부드러운 권유 — **보수적으로.** 결과를 기다리지 않는다(닫아도 그만).
  // ★ 모를 땐 조르지 않는다. 읽기 실패를 "동의 안 함"으로 오해해 시트를 띄우는 것이
  //   바로 이번 버그의 증상이었다. 확정된 "no" 일 때만 권한다.
  const promptIfNeeded = useCallback(() => {
    wlog("promptIfNeeded  status =", status, " ref =", currentUidRef.current);
    if (status !== "no") return;
    wlog("★ 시트 연다 (status=no)");
    void requestConsent();
  }, [status, requestConsent]);

  function settle(ok: boolean) {
    setOpen(false);
    resolverRef.current?.(ok);
    resolverRef.current = null;
  }

  async function onAgree() {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);
    const ok = await saveConsent();
    setSaving(false);
    if (!ok) {
      // ★ 저장 실패 — 시트를 닫지 않고 settle 도 부르지 않는다.
      //   저장을 기다리던 호출부가 "동의됨"으로 오해하고 진행하면, 동의 기록 없이
      //   개인정보가 저장된다. 사용자는 다시 시도하거나 "나중에"로 빠져나갈 수 있다.
      setSaveFailed(true);
      return;
    }
    setStatus("yes");
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

            {saveFailed && (
              <p className="consent-sheet__error" role="alert">
                저장하지 못했어요. 잠시 후 다시 시도해 주세요.
              </p>
            )}
            <button
              type="button"
              className="wl-btn wl-btn--primary consent-sheet__cta"
              disabled={!agreed || saving}
              onClick={onAgree}
            >
              {saving ? "저장하는 중…" : saveFailed ? "다시 시도" : "동의하고 계속"}
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
