// 계정 삭제 — Google Play 정책 요건(계정을 만드는 앱은 계정 삭제 경로를 반드시 제공).
//
// ★ 왜 서버가 전부 지우나 (클라이언트가 자기 데이터를 지울 권한은 있는데도):
//   클라이언트가 지우다 중간에 끊기고 인증 계정만 사라지면, 남은 Firestore 문서는
//   **아무도 지울 수 없다** — 보안 규칙이 `request.auth.uid == uid` 라서 그 uid 로
//   다시 로그인할 방법이 없기 때문이다. 영원한 고아 데이터가 된다.
//   그래서 순서를 서버가 쥔다: 데이터 → 매핑 → 인증 계정. 인증 계정은 **맨 마지막**에
//   지운다. 앞이 실패하면 계정이 남아 있으니 사용자가 다시 눌러 재시도할 수 있다.
//
// ★ 그리고 kakaoUsers 매핑은 클라이언트가 손댈 수 없다 — 보안 규칙에 아예 없어서(기본 거부)
//   서비스 계정만 지울 수 있다. 이걸 안 지우면 그 카카오 아이디로 다시 가입한 사람이
//   **삭제된 uid 를 가리키는 유령 매핑**에 붙어 빈 계정을 받는다.
//
// 보안: 클라이언트가 보낸 uid 는 절대 믿지 않는다. 현재 세션의 Firebase ID 토큰을 검증해
//   얻은 uid 만 지운다(kakao-auth 와 같은 원칙 — 남의 계정을 지울 수 있으면 안 된다).
import { sa, verifyIdToken, accessToken } from "./kakao-auth.mjs";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });

// Firestore REST 는 삭제 대상 문서를 **전체 경로**로 지목한다.
const docBase = (projectId) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

/** users/{uid}/moods 문서 이름을 전부 모은다(페이지네이션 포함). 내용은 안 받는다. */
export async function listMoodDocs(projectId, uid, tok, fetchImpl = fetch) {
  const names = [];
  let pageToken = "";
  // 안전장치 — 페이지 토큰이 어떤 이유로든 돌면 무한 루프가 된다. 무드는 하루 1건이라
  // 100페이지(=30,000건)면 현실적으로 남을 리 없다.
  for (let page = 0; page < 100; page++) {
    const url =
      `${docBase(projectId)}/users/${encodeURIComponent(uid)}/moods` +
      `?pageSize=300&mask.fieldPaths=__name__${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const r = await fetchImpl(url, { headers: { authorization: `Bearer ${tok}` } });
    if (r.status === 404) return names; // 하위 컬렉션이 아예 없음
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error("[delete] 무드 목록 실패", r.status, body.slice(0, 300));
      throw new Error(`무드 목록 실패(${r.status})`);
    }
    const d = await r.json();
    for (const doc of d.documents ?? []) names.push(doc.name);
    if (!d.nextPageToken) break;
    pageToken = encodeURIComponent(d.nextPageToken);
  }
  return names;
}

/** kakaoUsers 에서 이 uid 를 가리키는 매핑 문서 이름을 찾는다(보통 0~1건). */
export async function findKakaoMappings(projectId, uid, tok, fetchImpl = fetch) {
  const r = await fetchImpl(`${docBase(projectId)}:runQuery`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "kakaoUsers" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "uid" },
            op: "EQUAL",
            value: { stringValue: uid },
          },
        },
        limit: 20,
      },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error("[delete] 매핑 조회 실패", r.status, body.slice(0, 300));
    throw new Error(`매핑 조회 실패(${r.status})`);
  }
  const rows = await r.json();
  return (Array.isArray(rows) ? rows : []).map((x) => x.document?.name).filter(Boolean);
}

/** 문서들을 한 번에 지운다. Firestore 커밋 한도가 500 이라 나눠 보낸다. */
export async function deleteDocs(projectId, names, tok, fetchImpl = fetch) {
  for (let i = 0; i < names.length; i += 400) {
    const chunk = names.slice(i, i + 400);
    const r = await fetchImpl(`${docBase(projectId)}:commit`, {
      method: "POST",
      headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
      body: JSON.stringify({ writes: chunk.map((name) => ({ delete: name })) }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.error("[delete] 문서 삭제 실패", r.status, body.slice(0, 300));
      throw new Error(`문서 삭제 실패(${r.status})`);
    }
  }
}

/** Firebase Auth 계정 삭제. 서비스 계정 권한이라 '최근 로그인' 요구가 없다. */
export async function deleteAuthUser(projectId, uid, tok, fetchImpl = fetch) {
  const r = await fetchImpl(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
      body: JSON.stringify({ localId: uid }),
    },
  );
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error("[delete] 인증 계정 삭제 실패", r.status, body.slice(0, 300));
    throw new Error(`인증 계정 삭제 실패(${r.status})`);
  }
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 지원합니다." }, 405);

  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return json({ error: "FIREBASE_SERVICE_ACCOUNT 미설정" }, 500);
    }
    const projectId = sa().project_id;
    const { idToken } = await req.json();
    if (!idToken) return json({ error: "idToken이 필요합니다." }, 400);

    // ① 신원 검증 — 지울 수 있는 건 **자기 계정뿐**이다.
    const decoded = await verifyIdToken(idToken, projectId);
    const uid = decoded.sub;

    // Firestore(datastore) + 계정 삭제(identitytoolkit) 두 권한을 한 토큰에.
    const tok = await accessToken(
      "https://www.googleapis.com/auth/datastore " +
        "https://www.googleapis.com/auth/identitytoolkit",
    );

    // ② 무드 하위 컬렉션 → ③ 사용자 문서 순서로. (부모 문서를 먼저 지우면 하위 컬렉션이
    //    경로만 남아 계속 살아 있다 — Firestore 는 부모를 지워도 자식을 안 지운다.)
    const moods = await listMoodDocs(projectId, uid, tok);
    if (moods.length) await deleteDocs(projectId, moods, tok);
    await deleteDocs(projectId, [`${docBase(projectId)}/users/${uid}`], tok);

    // ④ 카카오 매핑 — 남기면 그 카카오 아이디의 다음 가입자가 유령 uid 에 붙는다.
    const mappings = await findKakaoMappings(projectId, uid, tok);
    if (mappings.length) await deleteDocs(projectId, mappings, tok);

    // ⑤ 인증 계정 — **맨 마지막.** 앞 단계가 실패했다면 계정이 남아 있어 재시도할 수 있다.
    await deleteAuthUser(projectId, uid, tok);

    console.log(`[delete] 완료 uid=${uid} moods=${moods.length} kakao=${mappings.length}`);
    return json({ deleted: true, moods: moods.length, kakaoMappings: mappings.length });
  } catch (e) {
    console.error("[delete] 실패", e);
    return json({ error: "계정 삭제에 실패했습니다.", detail: String(e?.message ?? e) }, 500);
  }
};
