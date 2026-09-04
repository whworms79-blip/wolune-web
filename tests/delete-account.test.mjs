// 계정 삭제 — 회귀 테스트.
//
// 지키려는 것 셋:
//   ① 하위 컬렉션(moods)을 **사용자 문서보다 먼저** 지운다.
//      Firestore 는 부모를 지워도 자식을 안 지운다. 순서가 뒤집히면 무드가 경로만 남아
//      영원히 살아 있고, 계정이 없어져 아무도 못 지운다(보안 규칙상 접근 불가).
//   ② kakaoUsers 매핑을 지운다. 남기면 그 카카오 아이디로 다시 가입한 사람이
//      **삭제된 uid 를 가리키는 유령 매핑**에 붙어 빈 계정을 받는다.
//   ③ 한 번에 다 못 지울 만큼 많아도(페이지네이션·커밋 한도) 하나도 빠뜨리지 않는다.
//
// ⚠ 이 시험은 **함수 디렉터리 밖**에 둔다. Netlify 는 netlify/functions/ 안의 모든 파일을
//   함수로 취급하는데 이름에 점이 있으면 배포가 통째로 실패한다(kakao-auth.test.mjs 전례).
import { describe, expect, it, vi } from "vitest";
import {
  listMoodDocs,
  findKakaoMappings,
  deleteDocs,
  deleteAuthUser,
} from "../netlify/functions/delete-account.mjs";

const PROJECT = "wolune-d2268";
const UID = "bx6KyF5NizOgXLq3sVXGY4mCq5M2";
const TOK = "fake-access-token";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => "" });
const fail = (status) => ({
  ok: false,
  status,
  json: async () => ({}),
  text: async () => "boom",
});

describe("무드 목록", () => {
  it("여러 페이지를 모두 모은다 — 한 페이지만 지우면 나머지가 고아로 남는다", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        ok({ documents: [{ name: `${BASE}/users/${UID}/moods/2026-01-01` }], nextPageToken: "p2" }),
      )
      .mockResolvedValueOnce(
        ok({ documents: [{ name: `${BASE}/users/${UID}/moods/2026-01-02` }] }),
      );
    const names = await listMoodDocs(PROJECT, UID, TOK, f);
    expect(names).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls[1][0]).toContain("pageToken=p2");
  });

  it("하위 컬렉션이 없으면(404) 빈 목록 — 삭제 자체는 계속돼야 한다", async () => {
    expect(await listMoodDocs(PROJECT, UID, TOK, vi.fn().mockResolvedValue(fail(404)))).toEqual([]);
  });

  it("★ 그 밖의 실패는 삼키지 않고 throw — '무드 없음'으로 오해하면 안 된다", async () => {
    // 500 을 빈 목록으로 읽으면 무드를 안 지운 채 계정만 사라진다(복구 불가).
    for (const status of [403, 429, 500, 503]) {
      await expect(
        listMoodDocs(PROJECT, UID, TOK, vi.fn().mockResolvedValue(fail(status))),
      ).rejects.toThrow(/무드 목록 실패/);
    }
  });
});

describe("카카오 매핑", () => {
  it("이 uid 를 가리키는 매핑을 찾는다", async () => {
    const f = vi.fn().mockResolvedValue(
      ok([{ document: { name: `${BASE}/kakaoUsers/4987260726` } }]),
    );
    expect(await findKakaoMappings(PROJECT, UID, TOK, f)).toEqual([
      `${BASE}/kakaoUsers/4987260726`,
    ]);
    // 쿼리가 정말 이 uid 로 걸렸는지 — 잘못 걸면 **남의 매핑을 지운다**
    const sent = JSON.parse(f.mock.calls[0][1].body);
    expect(sent.structuredQuery.where.fieldFilter.value.stringValue).toBe(UID);
    expect(sent.structuredQuery.from[0].collectionId).toBe("kakaoUsers");
  });

  it("매핑이 없으면(구글 로그인·익명) 빈 배열", async () => {
    // runQuery 는 결과가 없을 때 document 없는 행을 준다.
    const f = vi.fn().mockResolvedValue(ok([{ readTime: "2026-09-04T00:00:00Z" }]));
    expect(await findKakaoMappings(PROJECT, UID, TOK, f)).toEqual([]);
  });

  it("조회 실패는 throw — 매핑을 못 지운 채 계정만 지우면 유령 매핑이 남는다", async () => {
    await expect(
      findKakaoMappings(PROJECT, UID, TOK, vi.fn().mockResolvedValue(fail(500))),
    ).rejects.toThrow(/매핑 조회 실패/);
  });
});

describe("문서 삭제", () => {
  it("커밋 한도를 넘으면 나눠 보내되 하나도 빠뜨리지 않는다", async () => {
    const names = Array.from({ length: 900 }, (_, i) => `${BASE}/users/${UID}/moods/d${i}`);
    const f = vi.fn().mockResolvedValue(ok({}));
    await deleteDocs(PROJECT, names, TOK, f);
    expect(f).toHaveBeenCalledTimes(3); // 400 + 400 + 100
    const sentAll = f.mock.calls.flatMap((c) => JSON.parse(c[1].body).writes.map((w) => w.delete));
    expect(sentAll).toHaveLength(900);
    expect(new Set(sentAll).size).toBe(900); // 중복·누락 없음
  });

  it("삭제 실패는 throw — 조용히 넘어가면 지운 줄 알고 계정을 지운다", async () => {
    await expect(
      deleteDocs(PROJECT, [`${BASE}/users/${UID}`], TOK, vi.fn().mockResolvedValue(fail(500))),
    ).rejects.toThrow(/문서 삭제 실패/);
  });
});

describe("인증 계정 삭제", () => {
  it("자기 uid 로 Identity Toolkit 을 호출한다", async () => {
    const f = vi.fn().mockResolvedValue(ok({}));
    await deleteAuthUser(PROJECT, UID, TOK, f);
    expect(f.mock.calls[0][0]).toContain(`/projects/${PROJECT}/accounts:delete`);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ localId: UID });
  });

  it("실패는 throw — 계정이 남았는데 성공이라 답하면 사용자는 지워진 줄 안다", async () => {
    await expect(
      deleteAuthUser(PROJECT, UID, TOK, vi.fn().mockResolvedValue(fail(500))),
    ).rejects.toThrow(/인증 계정 삭제 실패/);
  });
});
