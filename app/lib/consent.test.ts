import { describe, it, expect, beforeEach, vi } from "vitest";

// 지키려는 것: **동의 판정은 캐시를 믿지 않는다.**
//
// 2026-07-29 라이브 로그로 확인된 버그:
//   카카오 signInWithCustomToken 직후 `getDoc` 이 서버가 아니라 **비어 있는 로컬 캐시**로
//   응답했다. 새 시크릿은 캐시가 비었으니 "문서 없음"이 오고, 그건 에러가 아니라 정상 응답이라
//   catch 에도 안 걸린다 → 유효한 동의가 있는 계정인데 "동의 안 함"으로 판정 → 시트가 떴다.
//   (같은 순간 applyCarryOver 도 같은 문서를 "비었다"고 읽었다.)
//
// 그래서 readConsent 는 반드시 getDocFromServer 를 쓴다. getDoc 으로 되돌리면 이 시험이 깨진다.

type Snap = { data: () => unknown };

const h = vi.hoisted(() => ({
  getDocFromServer: vi.fn<(ref: unknown) => Promise<{ data: () => unknown }>>(),
  getDoc: vi.fn<(ref: unknown) => Promise<{ data: () => unknown }>>(), // 쓰이면 안 된다 — 감시용
  setDoc: vi.fn<(ref: unknown, data: unknown, opts?: unknown) => Promise<void>>(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  ensureSignedIn: vi.fn<() => Promise<string>>(),
}));

vi.mock("firebase/firestore", () => ({
  doc: h.doc,
  getDoc: h.getDoc,
  getDocFromServer: h.getDocFromServer,
  setDoc: h.setDoc,
}));
vi.mock("./firebase", () => ({ db: {}, ensureSignedIn: h.ensureSignedIn }));

const { readConsent, saveConsent, isConsentValid, CONSENT_VERSION } = await import("./consent");

/** Firestore DocumentSnapshot 흉내 */
const snapOf = (data: unknown): Snap => ({ data: () => data });

const validConsent = {
  privacy: true,
  age14: true,
  at: "2026-07-28T07:01:05.401Z",
  version: "2026-07-14",
};

beforeEach(() => {
  h.getDocFromServer.mockReset();
  h.getDoc.mockReset();
  h.setDoc.mockReset();
  h.setDoc.mockResolvedValue(undefined);
  h.ensureSignedIn.mockReset();
  h.ensureSignedIn.mockResolvedValue("uid-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("readConsent — 캐시를 믿지 않는다", () => {
  it("★ getDoc 이 아니라 getDocFromServer 로 읽는다", async () => {
    h.getDocFromServer.mockResolvedValue(snapOf({ consent: validConsent }));

    await readConsent("bx6KyF5");

    expect(h.getDocFromServer).toHaveBeenCalledTimes(1);
    // 캐시 폴백이 있는 getDoc 은 절대 쓰지 않는다 — 이게 버그의 원인이었다.
    expect(h.getDoc).not.toHaveBeenCalled();
  });

  it("유효한 동의가 있으면 yes (uid 를 함께 실어 돌려준다)", async () => {
    h.getDocFromServer.mockResolvedValue(snapOf({ consent: validConsent }));
    await expect(readConsent("bx6KyF5")).resolves.toEqual({ uid: "bx6KyF5", status: "yes" });
  });

  it("문서가 정말 없으면 no — 신규는 시트가 떠야 한다(법적 요건)", async () => {
    h.getDocFromServer.mockResolvedValue(snapOf(undefined));
    await expect(readConsent("new-uid")).resolves.toEqual({ uid: "new-uid", status: "no" });
  });

  it("낡은 버전의 동의는 no", async () => {
    h.getDocFromServer.mockResolvedValue(
      snapOf({ consent: { ...validConsent, version: "2026-07-01" } }),
    );
    await expect(readConsent("old")).resolves.toEqual({ uid: "old", status: "no" });
  });

  it("★ 읽기가 실패하면 no 가 아니라 unknown (모름 ≠ 없음)", async () => {
    h.getDocFromServer.mockRejectedValue(new Error("permission-denied"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readConsent("bx6KyF5")).resolves.toEqual({ uid: "bx6KyF5", status: "unknown" });
    expect(spy).toHaveBeenCalled(); // 조용히 넘기지 않는다
  });
});

describe("saveConsent — 실패를 성공한 척하지 않는다", () => {
  it("성공하면 true, 현재 버전으로 기록한다", async () => {
    await expect(saveConsent()).resolves.toBe(true);
    const call = h.setDoc.mock.calls[0];
    const payload = call[1] as { consent: { version: string; privacy: boolean; age14: boolean } };
    expect(payload.consent.version).toBe(CONSENT_VERSION);
    expect(payload.consent.privacy).toBe(true);
    expect(payload.consent.age14).toBe(true);
  });

  it("실패하면 false + console.error (삼키지 않는다)", async () => {
    h.setDoc.mockRejectedValue(new Error("offline"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(saveConsent()).resolves.toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});

describe("isConsentValid — 시트 판정과 이관 판정이 쓰는 단 하나의 기준", () => {
  it.each([
    [validConsent, true],
    [{ ...validConsent, privacy: false }, false],
    [{ ...validConsent, age14: false }, false],
    [{ ...validConsent, version: "2026-07-13" }, true], // 경계: 재동의 기준과 같으면 유효
    [{ ...validConsent, version: "2026-07-12" }, false], // 경계: 하루 이르면 무효
    [null, false],
    [undefined, false],
  ])("%o → %s", (c, expected) => {
    expect(isConsentValid(c as never)).toBe(expected);
  });
});
