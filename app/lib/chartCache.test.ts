// 오늘치 차트 캐시 — 화면을 오갈 때마다 같은 답을 다시 기다리지 않게 한다.
//
// 왜 필요한가(2026-09-06 실측): 엔진은 0.5초인데 **프록시를 거치면 1.5초**다.
// Netlify 함수 호출 오버헤드라 연속 호출에도 안 줄어든다.
//
// 지키려는 것:
//   · 같은 입력·같은 날이면 **두 번째부터는 네트워크를 타지 않는다**
//   · 입력이 다르면 캐시를 쓰지 않는다(남의 사주를 보여주면 안 된다)
//   · 실패한 응답은 캐시하지 않는다(에러가 하루 종일 굳으면 안 된다)
//   · sessionStorage 를 못 써도(프라이빗 모드) 동작은 그대로다
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const h = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteField: vi.fn(),
  doc: vi.fn(),
  ensureSignedIn: vi.fn(async () => "uid-1"),
}));
vi.mock("firebase/firestore", () => ({
  doc: h.doc,
  getDoc: h.getDoc,
  setDoc: h.setDoc,
  deleteField: h.deleteField,
}));
vi.mock("./firebase", () => ({ db: {}, ensureSignedIn: h.ensureSignedIn }));

const { fetchChart } = await import("./sajuInput");

const INPUT = {
  date: "1979-06-06",
  time: "02:30",
  city: "천안",
  gender: "male" as const,
  calendar: "lunar" as const,
};
const CHART = JSON.stringify({ engine_version: "0.4.0", character: { name_ko: "고요한 호수" } });

/** 아주 작은 sessionStorage 대역 */
function installStorage(): Map<string, string> {
  const m = new Map<string, string>();
  const store = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
  vi.stubGlobal("sessionStorage", store);
  return m;
}

const okResponse = () =>
  new Response(CHART, { status: 200, headers: { "content-type": "application/json" } });

beforeEach(() => {
  installStorage();
  vi.stubGlobal("fetch", vi.fn(async () => okResponse()));
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchChart — 오늘치 캐시", () => {
  it("★ 같은 입력이면 두 번째는 네트워크를 타지 않는다", async () => {
    const first = await fetchChart(INPUT, { target_date: "2026-09-06" });
    expect(await first.json()).toEqual(JSON.parse(CHART));
    expect(fetch).toHaveBeenCalledTimes(1);

    const second = await fetchChart(INPUT, { target_date: "2026-09-06" });
    expect(await second.json()).toEqual(JSON.parse(CHART)); // 같은 답
    expect(fetch).toHaveBeenCalledTimes(1); // ← 호출이 안 늘었다
  });

  it("★ 입력이 다르면 캐시를 쓰지 않는다 (남의 사주를 보여주면 안 된다)", async () => {
    await fetchChart(INPUT, { target_date: "2026-09-06" });
    await fetchChart({ ...INPUT, date: "1990-03-15" }, { target_date: "2026-09-06" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("target_date 가 다르면(날짜 이동) 다시 부른다", async () => {
    await fetchChart(INPUT, { target_date: "2026-09-06" });
    await fetchChart(INPUT, { target_date: "2026-09-07" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("★ 실패는 캐시하지 않는다 — 에러가 하루 종일 굳으면 안 된다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("nope", { status: 502 }))
        .mockResolvedValueOnce(okResponse()),
    );

    const bad = await fetchChart(INPUT);
    expect(bad.ok).toBe(false);

    const good = await fetchChart(INPUT); // 다시 시도하면 네트워크를 탄다
    expect(good.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("sessionStorage 를 못 써도(프라이빗 모드) 동작은 그대로다", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {},
      key: () => null,
      length: 0,
    });

    const res = await fetchChart(INPUT);
    expect(await res.json()).toEqual(JSON.parse(CHART)); // 캐시만 없을 뿐 답은 온다
  });
});
