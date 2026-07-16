// 카카오 로그인 → Firebase 커스텀 토큰 발급 (의존성 0 — Node 내장 crypto + fetch만 사용).
//
// 왜 firebase-admin을 안 쓰나: admin의 의존성(jwks-rsa → jose)이 ESM-only 라서
//   Netlify(esbuild/CJS) 번들에서 "require() of ES Module" 로 죽는다. external 처리도 실패.
//   커스텀 토큰은 결국 서비스계정 키로 서명한 JWT이고, ID 토큰 검증도 내장 crypto로 되므로 직접 구현한다.
//
// 왜 커스텀 토큰인가: Firebase Auth는 카카오를 기본 지원하지 않고,
//   OIDC 공급자는 유료(Identity Platform)라 무료 범위에서 쓰려면 이 방식뿐이다.
//
// ★ 보안: 클라이언트가 보낸 uid를 그대로 믿으면 남의 계정을 탈취할 수 있다.
//   반드시 현재 세션의 Firebase ID 토큰을 검증해 uid를 얻는다.

import { X509Certificate, createSign, createVerify } from "node:crypto";

const sa = () => JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const b64u = (b) => Buffer.from(b).toString("base64url");
const b64uJson = (o) => b64u(JSON.stringify(o));
const decodeSeg = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

// 서비스계정 개인키로 RS256 JWT 서명
function signJwt(payload) {
  const data = `${b64uJson({ alg: "RS256", typ: "JWT" })}.${b64uJson(payload)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  return `${data}.${b64u(signer.sign(sa().private_key))}`;
}

// ── Firebase ID 토큰 검증 (Google 공개 인증서로 서명·클레임 확인) ──
let certCache = { at: 0, certs: null };
async function googleCerts() {
  const now = Date.now();
  if (certCache.certs && now - certCache.at < 3600_000) return certCache.certs;
  const r = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  const certs = await r.json();
  certCache = { at: now, certs };
  return certs;
}

async function verifyIdToken(idToken, projectId) {
  const [h, p, s] = String(idToken).split(".");
  if (!h || !p || !s) throw new Error("잘못된 ID 토큰 형식");
  const header = decodeSeg(h);
  const payload = decodeSeg(p);
  if (header.alg !== "RS256") throw new Error("서명 알고리즘 불일치");

  const pem = (await googleCerts())[header.kid];
  if (!pem) throw new Error("서명 키를 찾을 수 없음");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${h}.${p}`);
  if (!verifier.verify(new X509Certificate(pem).publicKey, Buffer.from(s, "base64url"))) {
    throw new Error("서명 검증 실패");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("aud 불일치");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("iss 불일치");
  if (!payload.sub) throw new Error("sub 없음");
  if (payload.exp <= now) throw new Error("만료된 토큰");
  return payload; // sub = uid
}

// ── 서비스계정 OAuth 액세스 토큰(Firestore REST 호출용) ──
async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: sa().client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const t = await r.json();
  if (!t.access_token) throw new Error(`액세스 토큰 실패: ${JSON.stringify(t)}`);
  return t.access_token;
}

// ── Firestore REST: 카카오ID ↔ Firebase uid 매핑 (Admin 권한이라 보안규칙 우회) ──
const mapUrl = (projectId, kakaoId) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/kakaoUsers/${kakaoId}`;

async function getMapping(projectId, kakaoId, tok) {
  const r = await fetch(mapUrl(projectId, kakaoId), {
    headers: { authorization: `Bearer ${tok}` },
  });
  if (!r.ok) return null; // 404 = 첫 연결
  const d = await r.json();
  return d?.fields?.uid?.stringValue ?? null;
}

async function setMapping(projectId, kakaoId, uid, tok) {
  await fetch(mapUrl(projectId, kakaoId), {
    method: "PATCH",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({
      fields: {
        uid: { stringValue: uid },
        linkedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
}

// ── 커스텀 토큰(클라이언트가 signInWithCustomToken 으로 로그인) ──
function createCustomToken(uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  const email = sa().client_email;
  return signJwt({
    iss: email,
    sub: email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid,
    claims,
  });
}

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

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 지원합니다." }, 405);

  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return json({ error: "FIREBASE_SERVICE_ACCOUNT 미설정" }, 500);
    }
    const projectId = sa().project_id;
    const { idToken, accessToken: kakaoAccessToken, code, redirectUri } = await req.json();

    // ① 호출자 신원 검증 — 이 익명 계정의 주인이 맞는지
    if (!idToken) return json({ error: "idToken이 필요합니다." }, 400);
    const decoded = await verifyIdToken(idToken, projectId);
    const currentUid = decoded.sub;

    // ② 카카오 액세스 토큰 — 앱은 직접 전달, 웹은 인가코드를 교환
    let kakaoToken = kakaoAccessToken;
    if (!kakaoToken) {
      if (!code || !redirectUri) {
        return json({ error: "accessToken 또는 code가 필요합니다." }, 400);
      }
      const restKey = process.env.KAKAO_REST_API_KEY;
      if (!restKey) return json({ error: "KAKAO_REST_API_KEY 미설정" }, 500);
      const r = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: restKey,
          redirect_uri: redirectUri,
          code,
        }),
      });
      const tok = await r.json();
      if (!r.ok || !tok.access_token) {
        // 진단: 정확한 카카오 에러코드를 함수 로그에 남긴다(KOE006=리다이렉트 미등록,
        //   KOE320=코드/클라이언트 불일치 등). 카카오 에러 객체엔 비밀값이 없다.
        console.error("[kakao] token exchange failed", r.status, JSON.stringify(tok));
        return json({ error: "카카오 토큰 교환 실패", detail: tok }, 401);
      }
      kakaoToken = tok.access_token;
    }

    // ③ 카카오 사용자 조회(= 토큰 검증)
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { authorization: `Bearer ${kakaoToken}` },
    });
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      console.error("[kakao] user/me failed", meRes.status, JSON.stringify(me));
      return json({ error: "카카오 사용자 확인 실패", detail: me }, 401);
    }
    const kakaoId = String(me.id);
    const nickname =
      me?.kakao_account?.profile?.nickname ?? me?.properties?.nickname ?? null;

    // ④ 매핑: 있으면 그 계정으로 전환, 없으면 지금 익명 계정을 승격(사주·기록 보존)
    const tok = await accessToken();
    const mapped = await getMapping(projectId, kakaoId, tok);
    let uid = currentUid;
    let switched = false;
    if (mapped) {
      uid = mapped;
      switched = mapped !== currentUid;
    } else {
      await setMapping(projectId, kakaoId, currentUid, tok);
    }

    // ⑤ 커스텀 토큰 발급
    const customToken = createCustomToken(uid, { provider: "kakao", kakaoId });
    return json({ customToken, switched, nickname });
  } catch (e) {
    return json({ error: "서버 오류", detail: String(e?.message ?? e) }, 500);
  }
};
