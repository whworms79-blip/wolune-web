import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ConsentProvider, useConsent } from "./ConsentGate";

// 검증 대상
//   (C) auth 전환이 겹칠 때, **낡은 계정의 판정이 지금 계정의 판정을 덮지 않는가** (2026-07-28).
//       로그아웃 → 재로그인은 uid 가 null → 새 익명 A2 → 카카오 X 로 연달아 바뀐다.
//       판정은 발화마다 새로 뜨는데 완료 순서는 보장되지 않는다. 예전엔 **늦게 착지한 답이
//       이겨서**, 이미 동의한 계정에 시트가 다시 떴다. 이제 답에 uid 를 실어 지금 계정 것만 반영한다.
//   (D) 동의 저장이 실패했는데 **성공한 척하지 않는가**.
//       예전엔 saveConsent 가 빈 catch 로 실패를 삼키고, onAgree 는 무조건 동의됨으로 넘어갔다.
//
// 실제 Firebase/Firestore/카카오는 건드리지 않는다 —
//   ./firebase(onAuthChange, ensureSignedIn), ./consent(readConsent, saveConsent) 만 모킹.

type Status = "yes" | "no" | "unknown";
const verdict = (uid: string, status: Status) => ({ uid, status });

const h = vi.hoisted(() => {
  const state: { authCb: ((u: unknown) => void) | null; initialUser: unknown } = {
    authCb: null,
    initialUser: null,
  };
  return {
    state,
    readConsent:
      vi.fn<(uid: string) => Promise<{ uid: string; status: "yes" | "no" | "unknown" }>>(),
    saveConsent: vi.fn<() => Promise<boolean>>(),
    ensureSignedIn: vi.fn<() => Promise<string>>(),
    // 구독 즉시 현재 사용자로 1회 발화(실제 onAuthStateChanged 와 같음) → 이후 전환은 수동.
    onAuthChange: (cb: (u: unknown) => void) => {
      state.authCb = cb;
      cb(state.initialUser);
      return () => {};
    },
  };
});

vi.mock("./consent", () => ({
  readConsent: h.readConsent,
  saveConsent: h.saveConsent,
}));
vi.mock("./firebase", () => ({
  onAuthChange: h.onAuthChange,
  ensureSignedIn: h.ensureSignedIn,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children?: React.ReactNode }) => <a {...p}>{children}</a>,
}));

/** 착지 순서를 시험에서 직접 정하기 위한 지연 프라미스 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// 저장 직전 게이트(requestConsent)와 홈 진입 권유(promptIfNeeded)를 각각 눌러보는 소비자.
function Probe() {
  const { requestConsent, promptIfNeeded } = useConsent();
  return (
    <>
      <button onClick={() => void requestConsent()}>request</button>
      <button onClick={() => promptIfNeeded()}>prompt</button>
    </>
  );
}

async function fireAuth(user: unknown) {
  await act(async () => {
    h.state.authCb?.(user);
  });
}

// 게이트를 누르고 **비동기 재확인까지 끝난 뒤** 돌려준다.
//
// ⚠ waitFor(() => expect(queryByRole("dialog")).toBeNull()) 로 "안 뜸"을 확인하면 안 된다 —
//   시트가 아직 안 열렸을 뿐인 첫 폴링에서 그냥 통과해버려, 실제로는 나중에 뜨는 경우도
//   초록으로 보인다(이 시험을 짜다 실제로 겪음). 흘려보낸 뒤 직접 단언한다.
async function clickRequestAndSettle() {
  await act(async () => {
    fireEvent.click(screen.getByText("request"));
  });
  await act(async () => {}); // status "unknown" 경로의 재확인(readConsent) 한 틱 더
}

function mount() {
  render(
    <ConsentProvider>
      <Probe />
    </ConsentProvider>,
  );
}

/** 시트의 필수 체크 2개를 켜고 CTA 를 누른다 */
async function agreeAndSubmit() {
  const boxes = screen.getAllByRole("checkbox");
  for (const b of boxes) fireEvent.click(b);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /동의하고 계속|다시 시도/ }));
  });
}

beforeEach(() => {
  cleanup();
  h.readConsent.mockReset();
  h.saveConsent.mockReset();
  h.ensureSignedIn.mockReset();
  h.state.authCb = null;
  h.state.initialUser = null;
  // 기본값: 물어본 uid 에 대해 "동의 안 함". 개별 시험이 mockReturnValueOnce 로 덮는다.
  h.readConsent.mockImplementation(async (uid) => verdict(uid, "no"));
  h.saveConsent.mockResolvedValue(true);
  h.ensureSignedIn.mockResolvedValue("created-anon");
});

describe("ConsentGate — auth 전환 시 동의 재판정", () => {
  it("A) 익명(미동의)→유효 동의 계정 전환: 재판정으로 시트가 뜨지 않는다", async () => {
    h.state.initialUser = { uid: "anon" };
    h.readConsent
      .mockResolvedValueOnce(verdict("anon", "no")) // 구독 즉시 발화(익명)
      .mockResolvedValueOnce(verdict("account", "yes")); // 계정 전환 후 재판정

    mount();
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(1));

    await fireAuth({ uid: "account" });
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(2));

    // ★ 판정은 uid 를 받아서 한다 — 어느 계정을 읽었는지가 호출에 드러나야 한다.
    expect(h.readConsent).toHaveBeenNthCalledWith(1, "anon");
    expect(h.readConsent).toHaveBeenNthCalledWith(2, "account");

    await clickRequestAndSettle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.readConsent).toHaveBeenCalledTimes(2); // "yes" 캐시 사용 — 더 읽지 않는다
  });

  it("B) 진짜 신규(어느 uid도 미동의): 전환 후에도 시트는 정상적으로 뜬다(법적 요건)", async () => {
    h.state.initialUser = { uid: "anon" };

    mount();
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(1));
    await fireAuth({ uid: "new" });
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByText("request"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
  });
});

describe("(C) 로그아웃 → 재로그인 — 낡은 판정이 지금 계정을 덮지 않는다", () => {
  it("C1) 낡은 A2 의 'no' 가 최신 X 의 'yes' 보다 늦게 착지해도 시트가 뜨지 않는다", async () => {
    h.state.initialUser = null; // 로그아웃 상태에서 콜백 페이지 마운트
    const dA2 = deferred<{ uid: string; status: Status }>();
    const dX = deferred<{ uid: string; status: Status }>();
    h.readConsent.mockReturnValueOnce(dA2.promise).mockReturnValueOnce(dX.promise);

    mount();
    await fireAuth({ uid: "A2" }); // 로그아웃이 만든 새 익명
    await fireAuth({ uid: "X" }); // signInWithCustomToken → 카카오 계정

    expect(h.readConsent).toHaveBeenNthCalledWith(1, "A2");
    expect(h.readConsent).toHaveBeenNthCalledWith(2, "X");

    // 착지 순서를 뒤집는다: 최신(X)이 먼저 끝나고, 낡은(A2)이 나중에 끝난다.
    await act(async () => {
      dX.resolve(verdict("X", "yes"));
    });
    await act(async () => {
      dA2.resolve(verdict("A2", "no")); // ← 예전엔 이게 최신 판정을 덮었다
    });

    await clickRequestAndSettle();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("C1b) 낡은 A2 가 permission-denied('unknown')로 늦게 착지해도 마찬가지다", async () => {
    // 실제로 관측된 모양: uid 가 X 로 바뀌면 옛 uid 문서 읽기가 보안 규칙에 걸려 늦게 실패한다.
    h.state.initialUser = null;
    const dA2 = deferred<{ uid: string; status: Status }>();
    const dX = deferred<{ uid: string; status: Status }>();
    h.readConsent.mockReturnValueOnce(dA2.promise).mockReturnValueOnce(dX.promise);

    mount();
    await fireAuth({ uid: "A2" });
    await fireAuth({ uid: "X" });

    await act(async () => {
      dX.resolve(verdict("X", "yes"));
    });
    await act(async () => {
      dA2.resolve(verdict("A2", "unknown"));
    });

    await clickRequestAndSettle();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("C2) 대조: 순서대로 착지해도(A2 먼저, X 나중) 정상 — 가드가 정상 경로를 깨지 않는다", async () => {
    h.state.initialUser = null;
    const dA2 = deferred<{ uid: string; status: Status }>();
    const dX = deferred<{ uid: string; status: Status }>();
    h.readConsent.mockReturnValueOnce(dA2.promise).mockReturnValueOnce(dX.promise);

    mount();
    await fireAuth({ uid: "A2" });
    await fireAuth({ uid: "X" });

    await act(async () => {
      dA2.resolve(verdict("A2", "no"));
    });
    await act(async () => {
      dX.resolve(verdict("X", "yes"));
    });

    await clickRequestAndSettle();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("C3) 지금 계정 판정이 'unknown': 홈은 침묵하고, 저장 게이트는 재확인 후 시트를 띄운다", async () => {
    h.state.initialUser = { uid: "X" };
    h.readConsent.mockResolvedValueOnce(verdict("X", "unknown"));

    mount();
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(1));

    // 홈 진입(부드러운 권유) — 모르면 조르지 않는다.
    await act(async () => {
      fireEvent.click(screen.getByText("prompt"));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.readConsent).toHaveBeenCalledTimes(1); // 다시 읽지도 않는다

    // 저장 직전(엄격한 게이트) — 한 번 더 읽고, 그래도 "yes" 가 아니면 시트.
    h.readConsent.mockResolvedValueOnce(verdict("X", "no"));
    await clickRequestAndSettle();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(h.readConsent).toHaveBeenCalledTimes(2);
  });

  it("C4) 로그아웃(u=null) 발화에선 읽지도, 익명 계정을 만들지도 않는다", async () => {
    h.state.initialUser = null;

    mount();
    await fireAuth(null); // 로그아웃 발화가 한 번 더 와도

    expect(h.readConsent).not.toHaveBeenCalled();
    expect(h.ensureSignedIn).not.toHaveBeenCalled();
  });
});

describe("(D) 동의 저장 실패를 성공한 척하지 않는다", () => {
  it("D1) 저장 실패: 시트가 닫히지 않고 에러와 '다시 시도'가 뜬다", async () => {
    h.state.initialUser = { uid: "X" };
    h.saveConsent.mockResolvedValue(false);

    mount();
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("request"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    await agreeAndSubmit();

    expect(h.saveConsent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeTruthy(); // 시트 유지
    expect(screen.getByRole("alert").textContent).toContain("저장하지 못했어요");
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });

  it("D2) 저장 성공: 시트가 닫히고 이후 게이트를 통과한다", async () => {
    h.state.initialUser = { uid: "X" };
    h.saveConsent.mockResolvedValue(true);

    mount();
    await waitFor(() => expect(h.readConsent).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByText("request"));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());

    await agreeAndSubmit();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // 이제 "yes" 라 다시 눌러도 시트가 뜨지 않고, 읽으러 가지도 않는다.
    const reads = h.readConsent.mock.calls.length;
    await clickRequestAndSettle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(h.readConsent).toHaveBeenCalledTimes(reads);
  });
});
