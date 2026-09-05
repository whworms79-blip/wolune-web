import { describe, it, expect, beforeEach, vi } from "vitest";

// 지키려는 것: **"문서 없음"을 한 번에 믿지 않는다.**
//
// 2026-07-29 라이브 로그로 확인된 버그:
//   카카오 signInWithCustomToken 직후의 읽기가, 멀쩡히 있는 users/{uid} 를
//   에러도 없이 "문서 없음"으로 돌려줬다. 서로 무관한 두 코드(readConsent, applyCarryOver)가
//   같은 문서를 동시에 "비었다"고 읽었고, 몇 초 뒤 /home 에서는 정상적으로 읽혔다.
//   getDocFromServer 로 소스를 서버로 강제해도 막히지 않았다(1차 수정 16e1ddc 가 실패한 이유).

const h = vi.hoisted(() => ({
  getDocFromServer: vi.fn<(ref: unknown) => Promise<Snap>>(),
  getDoc: vi.fn(), // 쓰이면 안 된다 — 감시용
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
}));

type Snap = { exists: () => boolean; data: () => unknown };

vi.mock("firebase/firestore", () => ({
  doc: h.doc,
  getDoc: h.getDoc,
  getDocFromServer: h.getDocFromServer,
}));
vi.mock("./firebase", () => ({ db: {} }));

const { readUserDoc } = await import("./firestoreRead");

/** 있는 문서 */
const present = (data: unknown): Snap => ({ exists: () => true, data: () => data });
/** 없는 문서 — 진짜 없을 수도, 토큰 교체 창의 거짓 응답일 수도 있다 */
const missing = (): Snap => ({ exists: () => false, data: () => undefined });

const NOW = [0, 0] as const; // 시험에선 기다리지 않는다

beforeEach(() => {
  h.getDocFromServer.mockReset();
  h.getDoc.mockReset();
});

describe("readUserDoc", () => {
  it("문서가 있으면 한 번만 읽고 바로 돌려준다 (있는 경우 추가 비용 0)", async () => {
    h.getDocFromServer.mockResolvedValue(present({ consent: { privacy: true } }));

    const snap = await readUserDoc("uid-1", NOW);

    expect(snap.exists()).toBe(true);
    expect(h.getDocFromServer).toHaveBeenCalledTimes(1);
  });

  it("★ 첫 읽기가 거짓 '없음'이어도 재확인해서 찾아낸다", async () => {
    h.getDocFromServer
      .mockResolvedValueOnce(missing()) // 토큰 교체 창 — 거짓 없음
      .mockResolvedValueOnce(present({ consent: { privacy: true } }));

    const snap = await readUserDoc("bx6KyF5", NOW);

    expect(snap.exists()).toBe(true);
    expect(h.getDocFromServer).toHaveBeenCalledTimes(2);
  });

  it("★ 대조: 재확인이 없으면(retryMs=[]) 거짓 '없음'을 그대로 믿는다 — 이게 버그였다", async () => {
    h.getDocFromServer
      .mockResolvedValueOnce(missing()) // 토큰 교체 창 — 거짓 없음
      .mockResolvedValueOnce(present({ consent: { privacy: true } }));

    const snap = await readUserDoc("bx6KyF5", []);

    expect(snap.exists()).toBe(false); // ← 바로 위 시험과 같은 입력인데 결과가 뒤집힌다
    expect(h.getDocFromServer).toHaveBeenCalledTimes(1);
  });

  it("정말 없는 문서는 재확인을 다 해도 없음 (신규 사용자 — 시트가 떠야 한다)", async () => {
    h.getDocFromServer.mockResolvedValue(missing());

    const snap = await readUserDoc("new-uid", NOW);

    expect(snap.exists()).toBe(false);
    expect(h.getDocFromServer).toHaveBeenCalledTimes(3); // 최초 1 + 재확인 2
  });

  it("두 번째 재확인에서 발견돼도 잡아낸다", async () => {
    h.getDocFromServer
      .mockResolvedValueOnce(missing())
      .mockResolvedValueOnce(missing())
      .mockResolvedValueOnce(present({ sajuInput: {} }));

    const snap = await readUserDoc("slow", NOW);

    expect(snap.exists()).toBe(true);
    expect(h.getDocFromServer).toHaveBeenCalledTimes(3);
  });

  it("★ 캐시 폴백이 있는 getDoc 은 절대 쓰지 않는다", async () => {
    h.getDocFromServer.mockResolvedValue(present({}));
    await readUserDoc("uid-1", NOW);
    expect(h.getDoc).not.toHaveBeenCalled();
  });

  it("읽기 실패는 삼키지 않고 throw 한다 ('없음'과 '못 읽음'은 다르다)", async () => {
    h.getDocFromServer.mockRejectedValue(new Error("permission-denied"));
    await expect(readUserDoc("uid-1", NOW)).rejects.toThrow(/permission-denied/);
  });

  it("기본 재확인 간격이 설정돼 있다 (호출부가 인자 없이 써도 재확인된다)", async () => {
    vi.useFakeTimers();
    h.getDocFromServer
      .mockResolvedValueOnce(missing())
      .mockResolvedValueOnce(present({ consent: { privacy: true } }));

    const p = readUserDoc("bx6KyF5"); // retryMs 생략 → 기본값
    await vi.advanceTimersByTimeAsync(300);
    const snap = await p;

    expect(snap.exists()).toBe(true);
    expect(h.getDocFromServer).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("★★ '있지만 내용이 빈' 스냅샷도 재확인한다 — 2026-09-05 진짜 원인", async () => {
    // Firestore 콘솔로 확정: 그 계정엔 consent 도 sajuInput 도 멀쩡히 있는데,
    // 카카오 로그인 직후의 읽기는 **exists 는 true 인데 내용이 빈** 스냅샷을 돌려줬다.
    // 예전 구현은 exists() 만 보고 그걸 정답으로 받아 즉시 반환했다 → 동의 시트 재노출.
    // 이 시험이 깨지면 그 버그가 그대로 돌아온다.
    const real = { consent: { privacy: true, age14: true, version: "2026-07-14" } };
    h.getDocFromServer
      .mockResolvedValueOnce(present({})) // 있지만 비어 있음 ← 믿으면 안 되는 답
      .mockResolvedValueOnce(present(real));

    const snap = await readUserDoc("bx6KyF5", NOW);

    expect(h.getDocFromServer).toHaveBeenCalledTimes(2); // 한 번 더 물었다
    expect(snap.data()).toEqual(real);
  });

  it("★ 기본 예산이 3초를 넘는다 — 850ms 로는 모자랐다(2026-09-05 라이브)", async () => {
    // 이 값을 줄이면 그때 그 버그가 그대로 돌아온다. 실측에서 토큰 교체 창이
    // 850ms(= 옛 기본값 [250,600])를 넘겨, 동의 판정과 이어붙이기가 같은 문서를
    // 함께 "비었다"고 읽었다. 있는 문서는 첫 읽기에 오므로 예산을 늘려도 비용은 0이다.
    vi.useFakeTimers();
    h.getDocFromServer.mockResolvedValue(missing()); // 끝까지 안 보이는 상황

    const p = readUserDoc("bx6KyF5");
    await vi.advanceTimersByTimeAsync(3000);
    // 3초 시점에도 아직 재확인 중이어야 한다(= 예산이 3초보다 길다)
    const callsAt3s = h.getDocFromServer.mock.calls.length;

    await vi.advanceTimersByTimeAsync(5000);
    await p;

    expect(h.getDocFromServer.mock.calls.length).toBeGreaterThan(callsAt3s);
    expect(h.getDocFromServer.mock.calls.length).toBeGreaterThanOrEqual(5);
    vi.useRealTimers();
  });
});
