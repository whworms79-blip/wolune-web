// 카카오ID ↔ Firebase uid 매핑 — 회귀 테스트.
//
// 지키려는 것 딱 하나: **기존 주인을 덮어쓰지 않는다.**
//   덮어쓰면 그 카카오 아이디의 사주·무드·동의가 통째로 고아가 되고, 이후 모든 로그인이
//   빈 계정으로 간다. 조용히 일어나서 며칠 뒤에야 "기록이 사라졌다"로 발견된다.
//
// 원래 버그: `if (!r.ok) return null` — 500·403·429 를 404(첫 연결)와 똑같이 취급했다.
//   그래서 Firestore 가 잠깐 흔들리면 곧바로 매핑을 지금의 빈 익명 uid 로 덮어썼다.
import { afterEach, describe, expect, it, vi } from "vitest";
import { claimMapping, getMapping } from "./kakao-auth.mjs";

const PROJECT = "wolune-d2268";
const KAKAO_ID = "1234567890";
const TOK = "fake-access-token";

const OWNER_UID = "real-account-uid"; // 사주·무드가 들어 있는 진짜 계정
const ANON_UID = "fresh-anonymous-uid"; // 시크릿 모드에서 갓 만들어진 빈 계정

/** fetch 응답 흉내 */
const res = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body ?? ""),
});

const docWith = (uid) => ({ fields: { uid: { stringValue: uid } } });

/** 이번 테스트에서 실제로 나간 PATCH(=쓰기) 호출만 추림 */
const writes = (fetchMock) =>
  fetchMock.mock.calls.filter(([, opts]) => opts?.method === "PATCH");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getMapping — 404 와 그 밖의 실패를 구분한다", () => {
  it("404 는 '첫 연결'이므로 null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(404, {})));
    await expect(getMapping(PROJECT, KAKAO_ID, TOK)).resolves.toBeNull();
  });

  it("매핑이 있으면 그 uid 를 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, docWith(OWNER_UID))));
    await expect(getMapping(PROJECT, KAKAO_ID, TOK)).resolves.toBe(OWNER_UID);
  });

  // ★ 이 버그의 핵심. null 을 돌려주면 호출부가 "첫 연결"로 알고 덮어쓴다.
  it.each([403, 429, 500, 503])("%i 는 null 이 아니라 throw", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => res(status, { error: "boom" })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(getMapping(PROJECT, KAKAO_ID, TOK)).rejects.toThrow(/매핑 조회 실패/);
  });

  it("실패를 조용히 넘기지 않는다 — 로그를 남긴다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(500, { error: "boom" })));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(getMapping(PROJECT, KAKAO_ID, TOK)).rejects.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});

describe("claimMapping — 이미 주인이 있으면 절대 덮어쓰지 않는다", () => {
  it("첫 연결이면 등록하고, 덮어쓰기 방지 조건을 건다", async () => {
    const f = vi.fn(async () => res(200, {}));
    vi.stubGlobal("fetch", f);

    await expect(claimMapping(PROJECT, KAKAO_ID, ANON_UID, TOK)).resolves.toBe(ANON_UID);

    const [url, opts] = writes(f)[0];
    expect(url).toContain("currentDocument.exists=false");
    expect(JSON.parse(opts.body).fields.uid.stringValue).toBe(ANON_UID);
  });

  it("경합으로 선점 실패하면 먼저 등록된 주인을 따른다", async () => {
    const f = vi.fn(async (_url, opts) =>
      opts?.method === "PATCH"
        ? res(400, { error: "FAILED_PRECONDITION" }) // 이미 존재
        : res(200, docWith(OWNER_UID)),
    );
    vi.stubGlobal("fetch", f);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(claimMapping(PROJECT, KAKAO_ID, ANON_UID, TOK)).resolves.toBe(OWNER_UID);
  });

  it("주인도 없고 쓰기도 실패하면 throw (빈 계정으로 로그인시키지 않는다)", async () => {
    const f = vi.fn(async (_url, opts) =>
      opts?.method === "PATCH" ? res(500, { error: "boom" }) : res(404, {}),
    );
    vi.stubGlobal("fetch", f);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(claimMapping(PROJECT, KAKAO_ID, ANON_UID, TOK)).rejects.toThrow(
      /매핑 저장 실패/,
    );
  });
});

// ── 원래 증상 그대로 재현 ──
// 시크릿 모드: 새 익명 uid 로 시작 → 카카오 로그인 → 그 순간 Firestore 가 500.
// 예전 코드는 여기서 kakaoUsers/{kakaoId} 를 ANON_UID 로 갈아치웠다.
describe("회귀 — Firestore 가 흔들려도 진짜 계정을 잃지 않는다", () => {
  it("조회가 500 이면 쓰기가 한 번도 나가지 않는다", async () => {
    const f = vi.fn(async () => res(500, { error: "transient" }));
    vi.stubGlobal("fetch", f);
    vi.spyOn(console, "error").mockImplementation(() => {});

    // 함수 핸들러가 하는 것과 같은 순서
    await expect(
      getMapping(PROJECT, KAKAO_ID, TOK).then(
        (m) => m ?? claimMapping(PROJECT, KAKAO_ID, ANON_UID, TOK),
      ),
    ).rejects.toThrow();

    expect(writes(f)).toHaveLength(0); // ← 덮어쓰기 0건. 이게 전부다.
  });
});
