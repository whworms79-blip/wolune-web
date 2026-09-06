// 사이트 절대 URL 단일 소스 — 메타데이터/OG/canonical 이 여기서만 도메인을 얻는다.
//
// 운영 기본값은 실제로 살아 있는 주소여야 한다. 예전 기본값이 `wolune.app`(사지 않은
// 도메인)이라 배포된 OG 메타가 열리지 않는 주소를 가리켰다 — 카톡 미리보기가 통째로
// 죽는다. 앱(app/lib/data/site.dart)도 같은 주소를 쓴다. 둘을 같이 바꿀 것.
//
// 2026-09-06 커스텀 도메인 wolune.com 연결. Netlify 환경변수 NEXT_PUBLIC_SITE_URL 이
// 실제 값이고, 아래 상수는 env 가 없을 때의 안전한 기본값이다(둘 다 같은 주소로 유지할 것).
// ⚠ wolune.netlify.app 도 계속 살아 있다 — 이미 퍼진 공유 링크가 깨지지 않게 두는 것이다.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://wolune.com"
    : "http://localhost:3000");
