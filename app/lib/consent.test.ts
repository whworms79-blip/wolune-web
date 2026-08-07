import { describe, it, expect, beforeEach, vi } from "vitest";

// 지키려는 것
//  · readConsent 는 **readUserDoc**(= "없음"을 재확인하는 읽기)을 쓴다.
//    평범한 getDoc 으로 되돌리면 2026-07-29 버그가 재발한다 — auth 토큰 교체 직후의 읽기가
//    멀쩡한 문서를 "없음"으로 돌려줘, 이미 동의한 계정에 동의 시트가 떴다.
//    (읽기 재확인 자체의 동작은 firestoreRead.test.ts 가 지킨다. 여기선 판정만 본다.)
//  · 읽지 못한 것("모름")과 동의가 없는 것("없음")을 구분한다.
//  · saveConsent 는 실패를 성공한 척하지 않는다.

const h = vi.hoisted(() => ({
  readUserDoc: vi.fn<(uid: string) => Promise<{ data: () => unknown }>>(),
  setDoc: vi.fn<(ref: unknown, data: unknown, opts?: unknown) => Promise<void>>(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join("/") })),
  ensureSignedIn: vi.fn<() => Promise<string>>(),
}));

vi.mock("firebase/firestore", () => ({ doc: h.doc, setDoc: h.setDoc }));
vi.mock("./firebase", () => ({ db: {}, ensureSignedIn: h.ensureSignedIn }));
vi.mock("./firestoreRead", () => ({ readUserDoc: h.readUserDoc }));

const { readConsent, saveConsent, isConsentValid, CONSENT_VERSION } = await import("./consent");

const snapOf = (data: unknown) => ({ data: () => data });

const validConsent = {
  privacy: true,
  age14: true,
  at: "2026-07-28T07:01:05.401Z",
  version: "2026-07-14",
};

beforeEach(() => {
  h.readUserDoc.mockReset();
  h.setDoc.mockReset();
  h.setDoc.mockResolvedValue(undefined);
  h.ensureSignedIn.mockReset();
  h.ensureSignedIn.mockResolvedValue("uid-1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("readConsent", () => {
  it("★ 재확인 읽기(readUserDoc)를 쓴다 — 평범한 getDoc 으로 되돌리면 안 된다", async () => {
    h.readUserDoc.mockResolvedValue(snapOf({ consent: validConsent }));

    await readConsent("bx6KyF5");

    expect(h.readUserDoc).toHaveBeenCalledTimes(1);
    expect(h.readUserDoc).toHaveBeenCalledWith("bx6KyF5");
  });

  it("유효한 동의가 있으면 yes (uid 를 함께 실어 돌려준다)", async () => {
    h.readUserDoc.mockResolvedValue(snapOf({ consent: validConsent }));
    await expect(readConsent("bx6KyF5")).resolves.toEqual({ uid: "bx6KyF5", status: "yes" });
  });

  it("문서가 정말 없으면 no — 신규는 시트가 떠야 한다(법적 요건)", async () => {
    h.readUserDoc.mockResolvedValue(snapOf(undefined));
    await expect(readConsent("new-uid")).resolves.toEqual({ uid: "new-uid", status: "no" });
  });

  it("낡은 버전의 동의는 no", async () => {
    h.readUserDoc.mockResolvedValue(
      snapOf({ consent: { ...validConsent, version: "2026-07-01" } }),
    );
    await expect(readConsent("old")).resolves.toEqual({ uid: "old", status: "no" });
  });

  it("★ 읽기가 실패하면 no 가 아니라 unknown (모름 ≠ 없음)", async () => {
    h.readUserDoc.mockRejectedValue(new Error("permission-denied"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readConsent("bx6KyF5")).resolves.toEqual({ uid: "bx6KyF5", status: "unknown" });
    expect(spy).toHaveBeenCalled(); // 조용히 넘기지 않는다
  });
});

describe("saveConsent — 실패를 성공한 척하지 않는다", () => {
  it("성공하면 true, 현재 버전으로 기록한다", async () => {
    await expect(saveConsent()).resolves.toBe(true);
    const payload = h.setDoc.mock.calls[0][1] as {
      consent: { version: string; privacy: boolean; age14: boolean };
    };
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
