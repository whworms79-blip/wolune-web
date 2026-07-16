import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ConsentProvider, useConsent } from "./ConsentGate";

// 검증 대상: ConsentGate 가 auth 전환마다 동의를 재판정하는가 (11c2e1c 수정).
//
// 버그: ConsentProvider 는 루트 상주라 재마운트되지 않는다. 예전엔 마운트 때 딱 한 번만
//   hasCurrentConsent 를 확인해서, 익명에서 잡힌 consented=false 가 로그인 후에도 남아
//   이미 동의한 계정에도 시트가 떴다(특히 카카오 콜백 새 페이지).
// 수정: onAuthChange 발화마다 consented=null 로 되돌리고 hasCurrentConsent 로 재판정.
//
// 실제 Firebase/Firestore/카카오는 건드리지 않는다 — ConsentGate 가 import 하는
//   ./firebase(onAuthChange), ./consent(hasCurrentConsent, saveConsent) 만 모킹.

// vi.mock 팩토리는 호이스팅되므로, 공유 상태·스파이를 vi.hoisted 로 만든다.
const h = vi.hoisted(() => {
  const state: { authCb: ((u: unknown) => void) | null } = { authCb: null };
  return {
    state,
    hasCurrentConsent: vi.fn<() => Promise<boolean>>(),
    saveConsent: vi.fn(async () => {}),
    // 구독 즉시 현재 사용자(테스트에선 익명 가정)로 1회 발화 → 이후 전환은 state.authCb 로 수동 발화.
    onAuthChange: (cb: (u: unknown) => void) => {
      state.authCb = cb;
      cb(null);
      return () => {};
    },
  };
});

vi.mock("./consent", () => ({
  hasCurrentConsent: h.hasCurrentConsent,
  saveConsent: h.saveConsent,
}));
vi.mock("./firebase", () => ({
  onAuthChange: h.onAuthChange,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children?: React.ReactNode }) => <a {...p}>{children}</a>,
}));

// 저장 직전 게이트를 눌러보는 최소 소비자.
function Probe() {
  const { requestConsent } = useConsent();
  return (
    <button onClick={() => void requestConsent()}>request</button>
  );
}

// auth 전환을 흉내낸다 — 상태 갱신을 유발하므로 act 로 감싼다.
async function fireAuth(user: unknown) {
  await act(async () => {
    h.state.authCb?.(user);
  });
}

beforeEach(() => {
  cleanup();
  h.hasCurrentConsent.mockReset();
  h.saveConsent.mockClear();
  h.state.authCb = null;
});

describe("ConsentGate — auth 전환 시 동의 재판정", () => {
  it("A) 익명(미동의)→유효 동의 계정 전환: 재판정으로 시트가 뜨지 않는다", async () => {
    // 마운트(익명)=false, 전환(계정)=true
    h.hasCurrentConsent
      .mockResolvedValueOnce(false) // 구독 즉시 발화(익명)
      .mockResolvedValueOnce(true); // 계정 전환 후 재판정

    render(
      <ConsentProvider>
        <Probe />
      </ConsentProvider>,
    );

    // 마운트 재판정 1회 완료를 기다린다(익명 → consented=false).
    await waitFor(() => expect(h.hasCurrentConsent).toHaveBeenCalledTimes(1));

    // 유효 동의 계정으로 전환.
    await fireAuth({ uid: "account" });

    // ★ 핵심: onAuthChange 발화마다 재판정이 1회씩 → 전환 후 2회.
    //   (수정 전 '마운트 1회'였다면 여기서 1회에 멈춰 실패한다.)
    await waitFor(() => expect(h.hasCurrentConsent).toHaveBeenCalledTimes(2));

    // 이제 저장을 시도해도(게이트) consented=true 라 시트가 뜨지 않아야 한다.
    fireEvent.click(screen.getByText("request"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    // 게이트 통과라 hasCurrentConsent 를 더 부르지도 않는다(consented 캐시 사용).
    expect(h.hasCurrentConsent).toHaveBeenCalledTimes(2);
  });

  it("B) 진짜 신규(어느 uid도 미동의): 전환 후에도 시트는 정상적으로 뜬다(법적 요건)", async () => {
    h.hasCurrentConsent.mockResolvedValue(false); // 마운트·전환 모두 미동의

    render(
      <ConsentProvider>
        <Probe />
      </ConsentProvider>,
    );

    await waitFor(() => expect(h.hasCurrentConsent).toHaveBeenCalledTimes(1));

    // 새 uid 로 전환(여전히 미동의).
    await fireAuth({ uid: "new" });
    await waitFor(() => expect(h.hasCurrentConsent).toHaveBeenCalledTimes(2));

    // 저장 시도 → 미동의라 시트가 떠야 한다.
    fireEvent.click(screen.getByText("request"));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
  });
});
